"""Core scan orchestration — async generator yielding SSE events."""
from __future__ import annotations

import asyncio
import re
from datetime import datetime, timezone
from typing import AsyncGenerator

import httpx

from backend.config import AT_DOMAINS, WIKI_API, SCAN_DELAY, HTTP_HEADERS, DEADCHECK_TIMEOUT
from backend.database import (
    upsert_article, set_article_status, insert_url,
    update_url, delete_urls_for_article, get_urls_for_article,
    insert_ref_url, update_ref_url, delete_ref_urls_for_article,
    get_ref_urls_for_article,
)
from backend.services.wayback_client import extract_original_url, check_wayback, extract_wayback_date
from backend.services.deadlink_checker import check_url_alive
from backend.sse import sse_event

# Build regex from AT_DOMAINS
_at_pattern = "|".join(d.replace(".", r"\.") for d in AT_DOMAINS)
AT_RE = re.compile(
    rf"https?://(?:{_at_pattern})/[^\s\]|{{}}<>\"]*",
    re.IGNORECASE,
)


# Ref-checking regexes
REF_RE = re.compile(r"<ref[^>]*>(.+?)</ref>", re.DOTALL | re.IGNORECASE)
URL_IN_REF_RE = re.compile(r"https?://[^\s\]|{}<>\"]+")
DEAD_LINK_RE = re.compile(r"\{\{\s*Dead\s+link", re.IGNORECASE)

_at_domain_set = {d.lower() for d in AT_DOMAINS}


def _extract_ref_urls(wikitext: str) -> list[dict]:
    """Extract URLs from <ref> tags, skipping archive.today domains and refs already tagged."""
    results = []
    seen = set()
    for m in REF_RE.finditer(wikitext):
        ref_content = m.group(1)
        # Skip refs that already have {{Dead link}}
        if DEAD_LINK_RE.search(ref_content):
            continue
        for url_m in URL_IN_REF_RE.finditer(ref_content):
            url = re.sub(r'[\]|}<>]+$', '', url_m.group(0))
            # Skip archive.today domains
            try:
                from urllib.parse import urlparse
                host = urlparse(url).hostname or ""
                if host.lower() in _at_domain_set:
                    continue
            except Exception:
                pass
            if url not in seen:
                seen.add(url)
                results.append({"url": url, "ref_context": ref_content[:500]})
    return results


async def check_ref_url(url: str, client: httpx.AsyncClient) -> dict:
    """Check a ref URL for dead links and redirects.
    Returns {"status": ..., "http_status": ..., "redirect_url": ...}
    """
    try:
        resp = await client.head(url, timeout=DEADCHECK_TIMEOUT, follow_redirects=False)
    except Exception:
        try:
            resp = await client.get(url, timeout=DEADCHECK_TIMEOUT, follow_redirects=False)
        except Exception:
            return {"status": "error", "http_status": None, "redirect_url": ""}

    code = resp.status_code
    if code in (301, 302, 303, 307, 308):
        redirect_url = str(resp.headers.get("location", ""))
        return {"status": "redirect", "http_status": code, "redirect_url": redirect_url}
    elif code >= 400:
        return {"status": "dead", "http_status": code, "redirect_url": ""}
    else:
        return {"status": "alive", "http_status": code, "redirect_url": ""}


async def _fetch_wikitext(title: str, client: httpx.AsyncClient) -> str:
    resp = await client.get(
        WIKI_API,
        params={
            "action": "parse",
            "page": title,
            "prop": "wikitext",
            "format": "json",
        },
        timeout=30.0,
    )
    resp.raise_for_status()
    data = resp.json()
    if "error" in data:
        raise ValueError(data["error"].get("info", "Unknown API error"))
    return data["parse"]["wikitext"]["*"]


async def scan_article(title: str, client: httpx.AsyncClient, check_refs: bool = False) -> AsyncGenerator[str, None]:
    """Scan a single article. Yields SSE event strings."""
    yield sse_event("progress", {"title": title, "phase": "fetching"})

    try:
        wikitext = await _fetch_wikitext(title, client)
    except Exception as e:
        yield sse_event("article_error", {"title": title, "error": str(e)})
        return

    article, changed = await upsert_article(title, wikitext)

    # If wikitext hasn't changed, return cached results from DB
    if not changed:
        cached_urls = await get_urls_for_article(article.id)
        if cached_urls:
            links = [{
                "id": u["id"],
                "archiveUrl": u["archive_url"],
                "originalUrl": u["original_url"],
                "waybackUrl": u["wayback_url"],
                "waybackDate": u["wayback_date"],
                "status": u["status"],
                "httpStatus": u["http_status"],
            } for u in cached_urls]

            yield sse_event("article_found", {
                "articleId": article.id,
                "title": title,
                "linkCount": len(links),
                "links": links,
                "cached": True,
            })

            # Emit link updates so frontend shows final state immediately
            for link in links:
                yield sse_event("link_update", {
                    "articleId": article.id,
                    "urlId": link["id"],
                    "status": link["status"],
                    "waybackUrl": link["waybackUrl"],
                    "waybackDate": link["waybackDate"],
                })

            # Emit cached ref_urls if check_refs enabled
            if check_refs:
                cached_refs = await get_ref_urls_for_article(article.id)
                if cached_refs:
                    ref_links = [{
                        "id": r["id"],
                        "url": r["url"],
                        "refContext": r["ref_context"],
                        "status": r["status"],
                        "httpStatus": r["http_status"],
                        "redirectUrl": r["redirect_url"],
                    } for r in cached_refs]
                    yield sse_event("ref_found", {
                        "articleId": article.id,
                        "title": title,
                        "refLinks": ref_links,
                        "cached": True,
                    })
                    for rl in ref_links:
                        yield sse_event("ref_update", {
                            "articleId": article.id,
                            "refUrlId": rl["id"],
                            "status": rl["status"],
                            "httpStatus": rl["httpStatus"],
                            "redirectUrl": rl["redirectUrl"],
                        })

            await set_article_status(article.id, "done")
            yield sse_event("article_done", {
                "articleId": article.id,
                "title": title,
                "linkCount": len(links),
                "withAlts": sum(1 for l in links if l["status"] == "found"),
                "cached": True,
            })
            return

    await delete_urls_for_article(article.id)

    # Find archive.today links
    raw_matches = AT_RE.findall(wikitext)
    # Clean trailing punctuation and deduplicate
    seen = set()
    matches = []
    for url in raw_matches:
        url = re.sub(r'[\]|}<>]+$', '', url)
        if url not in seen:
            seen.add(url)
            matches.append(url)

    links = []
    for archive_url in matches:
        original = extract_original_url(archive_url) or ""
        url_row = await insert_url(article.id, archive_url, original)
        links.append({
            "id": url_row.id,
            "archiveUrl": archive_url,
            "originalUrl": original,
            "waybackUrl": "",
            "waybackDate": "",
            "status": "pending",
            "httpStatus": None,
        })

    yield sse_event("article_found", {
        "articleId": article.id,
        "title": title,
        "linkCount": len(links),
        "links": links,
    })

    # Check Wayback for each link
    for i, link in enumerate(links):
        if not link["originalUrl"]:
            link["status"] = "noextract"
            await update_url(link["id"], status="noextract")
            yield sse_event("link_update", {
                "articleId": article.id,
                "urlId": link["id"],
                "status": "noextract",
            })
            continue

        yield sse_event("progress", {
            "title": title,
            "phase": "wayback",
            "linkIndex": i,
            "linkTotal": len(links),
        })

        wb_url = await check_wayback(link["originalUrl"], client)
        if wb_url:
            wb_date = extract_wayback_date(wb_url)
            link["waybackUrl"] = wb_url
            link["waybackDate"] = wb_date
            link["status"] = "found"
            await update_url(link["id"], wayback_url=wb_url, wayback_date=wb_date, status="found")
        else:
            link["status"] = "notfound"
            await update_url(link["id"], status="notfound")

        yield sse_event("link_update", {
            "articleId": article.id,
            "urlId": link["id"],
            "status": link["status"],
            "waybackUrl": link.get("waybackUrl", ""),
            "waybackDate": link.get("waybackDate", ""),
        })

        await asyncio.sleep(SCAN_DELAY)

    # Dead-link check on the *original* URLs (not the archive.today URLs,
    # which always 429 automated clients due to JS challenges).
    # Only check links that have an extracted original URL.
    checkable = [(i, l) for i, l in enumerate(links) if l["originalUrl"]]
    if checkable:
        yield sse_event("progress", {"title": title, "phase": "deadcheck"})
        now = datetime.now(timezone.utc).isoformat()
        for ci, (i, link) in enumerate(checkable):
            yield sse_event("progress", {
                "title": title,
                "phase": "deadcheck",
                "linkIndex": ci,
                "linkTotal": len(checkable),
            })
            http_status, alive = await check_url_alive(link["originalUrl"], client)
            link["httpStatus"] = http_status
            db_status = link["status"]
            # Only override to dead/alive if the link didn't already get a wayback result
            if db_status in ("pending", "noextract", "notfound"):
                if alive:
                    db_status = "alive"
                elif http_status is not None:
                    db_status = "dead"
                link["status"] = db_status
            await update_url(link["id"], http_status=http_status, http_checked_at=now, status=db_status)
            yield sse_event("link_update", {
                "articleId": article.id,
                "urlId": link["id"],
                "status": db_status,
                "httpStatus": http_status,
                "waybackUrl": link.get("waybackUrl", ""),
                "waybackDate": link.get("waybackDate", ""),
            })
            await asyncio.sleep(0.3)

    # ── Ref-check phase (opt-in) ──
    if check_refs:
        await delete_ref_urls_for_article(article.id)
        ref_url_list = _extract_ref_urls(wikitext)
        ref_links = []
        for ru in ref_url_list:
            ref_row = await insert_ref_url(article.id, ru["url"], ru["ref_context"])
            ref_links.append({
                "id": ref_row.id,
                "url": ru["url"],
                "refContext": ru["ref_context"],
                "status": "pending",
                "httpStatus": None,
                "redirectUrl": "",
            })

        yield sse_event("ref_found", {
            "articleId": article.id,
            "title": title,
            "refLinks": ref_links,
        })

        now_ref = datetime.now(timezone.utc).isoformat()
        for ri, rl in enumerate(ref_links):
            yield sse_event("progress", {
                "title": title,
                "phase": "refcheck",
                "linkIndex": ri,
                "linkTotal": len(ref_links),
            })
            result = await check_ref_url(rl["url"], client)
            rl["status"] = result["status"]
            rl["httpStatus"] = result["http_status"]
            rl["redirectUrl"] = result["redirect_url"]
            await update_ref_url(rl["id"],
                                 http_status=result["http_status"],
                                 http_checked_at=now_ref,
                                 redirect_url=result["redirect_url"],
                                 status=result["status"])
            yield sse_event("ref_update", {
                "articleId": article.id,
                "refUrlId": rl["id"],
                "status": result["status"],
                "httpStatus": result["http_status"],
                "redirectUrl": result["redirect_url"],
            })
            await asyncio.sleep(0.3)

    await set_article_status(article.id, "done")
    yield sse_event("article_done", {
        "articleId": article.id,
        "title": title,
        "linkCount": len(links),
        "withAlts": sum(1 for l in links if l["status"] == "found"),
    })


async def scan_titles(titles: list[str], check_refs: bool = False) -> AsyncGenerator[str, None]:
    """Scan multiple articles, yielding SSE events for each."""
    yield sse_event("scan_start", {"totalArticles": len(titles)})

    async with httpx.AsyncClient(headers=HTTP_HEADERS) as client:
        for idx, title in enumerate(titles):
            yield sse_event("progress", {
                "title": title,
                "articleIndex": idx,
                "articleTotal": len(titles),
                "phase": "starting",
            })
            async for event in scan_article(title, client, check_refs=check_refs):
                yield event

    yield sse_event("scan_complete", {"totalArticles": len(titles)})
