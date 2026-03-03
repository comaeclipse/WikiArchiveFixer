"""Wikipedia editor using MediaWiki API directly (no pywikibot needed)."""
from __future__ import annotations

import re

import httpx

from backend.config import WIKI_API, HTTP_HEADERS

_MONTHS = ["January", "February", "March", "April", "May", "June",
           "July", "August", "September", "October", "November", "December"]

# Persistent session — holds login cookies across requests
_session: httpx.AsyncClient | None = None
_username: str = ""


def _get_api_url() -> str:
    return WIKI_API


async def _get_session() -> httpx.AsyncClient:
    global _session
    if _session is None:
        _session = httpx.AsyncClient(headers=HTTP_HEADERS, timeout=30.0)
    return _session


async def is_logged_in() -> dict:
    """Check current login state via API."""
    global _username
    try:
        client = await _get_session()
        resp = await client.get(_get_api_url(), params={
            "action": "query", "meta": "userinfo", "format": "json",
        })
        data = resp.json()
        name = data.get("query", {}).get("userinfo", {}).get("name", "")
        uid = data.get("query", {}).get("userinfo", {}).get("id", 0)
        # id=0 means anonymous
        if uid and uid > 0:
            _username = name
            return {"logged_in": True, "username": name}
        return {"logged_in": False, "username": ""}
    except Exception as e:
        return {"logged_in": False, "username": "", "error": str(e)}


async def login(username: str, password: str) -> dict:
    """Login with BotPasswords via action=login API.
    username should be in format 'User@BotName'.
    """
    global _session, _username
    # Reset session to get fresh cookies
    if _session is not None:
        await _session.aclose()
    _session = httpx.AsyncClient(headers=HTTP_HEADERS, timeout=30.0)
    client = _session

    try:
        # Step 1: Get a login token
        resp = await client.get(_get_api_url(), params={
            "action": "query", "meta": "tokens", "type": "login", "format": "json",
        })
        data = resp.json()
        login_token = data["query"]["tokens"]["logintoken"]

        # Step 2: action=login (used by BotPasswords)
        resp = await client.post(_get_api_url(), data={
            "action": "login",
            "lgname": username,
            "lgpassword": password,
            "lgtoken": login_token,
            "format": "json",
        })
        data = resp.json()
        result = data.get("login", {})
        status = result.get("result", "")

        if status == "Success":
            _username = result.get("lgusername", username)
            return {"success": True, "username": _username}
        else:
            return {"success": False, "error": result.get("reason", f"Login failed: {status}")}
    except Exception as e:
        return {"success": False, "error": str(e)}


async def _get_csrf_token() -> str:
    """Get a CSRF (edit) token."""
    client = await _get_session()
    resp = await client.get(_get_api_url(), params={
        "action": "query", "meta": "tokens", "format": "json",
    })
    data = resp.json()
    return data["query"]["tokens"]["csrftoken"]


async def _get_wikitext(title: str) -> str:
    """Fetch current wikitext for a page."""
    client = await _get_session()
    resp = await client.get(_get_api_url(), params={
        "action": "parse", "page": title, "prop": "wikitext", "format": "json",
    })
    data = resp.json()
    if "error" in data:
        raise ValueError(data["error"].get("info", "Unknown API error"))
    return data["parse"]["wikitext"]["*"]


async def preview_edit(title: str, replacements: list[dict]) -> dict:
    """Generate preview diff without saving.
    replacements: [{"old_url": "...", "new_url": "...", "new_date": "..."}]
    """
    try:
        old_text = await _get_wikitext(title)

        new_text = _apply_replacements(old_text, replacements)

        changes = sum(1 for r in replacements if r["old_url"] in old_text)
        return {
            "old_wikitext": old_text,
            "new_wikitext": new_text,
            "changes": changes,
            "title": title,
        }
    except Exception as e:
        return {"error": str(e)}


async def submit_edit(title: str, replacements: list[dict], summary: str) -> dict:
    """Submit edit via MediaWiki API."""
    try:
        old_text = await _get_wikitext(title)

        new_text = _apply_replacements(old_text, replacements)

        if new_text == old_text:
            return {"success": False, "error": "No changes to make"}

        token = await _get_csrf_token()
        client = await _get_session()
        resp = await client.post(_get_api_url(), data={
            "action": "edit",
            "title": title,
            "text": new_text,
            "summary": summary,
            "format": "json",
            "token": token,
            "bot": "false",
        })
        data = resp.json()

        if "edit" in data and data["edit"].get("result") == "Success":
            return {"success": True, "title": title}
        elif "error" in data:
            return {"success": False, "error": data["error"].get("info", str(data["error"]))}
        else:
            return {"success": False, "error": f"Unexpected response: {data}"}
    except Exception as e:
        return {"success": False, "error": str(e)}


def _current_month_year() -> str:
    """Return current month and year like 'February 2026'."""
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    return f"{_MONTHS[now.month - 1]} {now.year}"


def _apply_dead_link_tags(wikitext: str, dead_ref_urls: list[dict]) -> str:
    """Insert {{Dead link|date=Month Year}} before </ref> for each dead URL."""
    date_str = _current_month_year()
    for ref_url in dead_ref_urls:
        url = re.escape(ref_url["url"])
        # Find <ref> tags containing this URL that don't already have {{Dead link}}
        def _tag_ref(m):
            ref_content = m.group(0)
            if re.search(r'\{\{\s*Dead\s+link', ref_content, re.IGNORECASE):
                return ref_content
            # Insert {{Dead link}} before </ref>
            tag = "{{Dead link|date=" + date_str + "}}"
            return ref_content.replace(
                '</ref>',
                tag + '</ref>',
                1,
            )
        # Match <ref> tags containing this URL
        pattern = re.compile(
            rf'<ref[^>]*>[^<]*?{url}.*?</ref>',
            re.DOTALL | re.IGNORECASE,
        )
        wikitext = pattern.sub(_tag_ref, wikitext)
    return wikitext


async def preview_dead_link_edit(title: str, dead_ref_urls: list[dict]) -> dict:
    """Generate preview diff for dead link tagging without saving."""
    try:
        old_text = await _get_wikitext(title)
        new_text = _apply_dead_link_tags(old_text, dead_ref_urls)
        changes = sum(1 for r in dead_ref_urls
                      if re.search(re.escape(r["url"]), old_text))
        return {
            "old_wikitext": old_text,
            "new_wikitext": new_text,
            "changes": changes,
            "title": title,
        }
    except Exception as e:
        return {"error": str(e)}


async def submit_dead_link_edit(title: str, dead_ref_urls: list[dict], summary: str) -> dict:
    """Submit dead link tagging edit via MediaWiki API."""
    try:
        old_text = await _get_wikitext(title)
        new_text = _apply_dead_link_tags(old_text, dead_ref_urls)

        if new_text == old_text:
            return {"success": False, "error": "No changes to make"}

        token = await _get_csrf_token()
        client = await _get_session()
        resp = await client.post(_get_api_url(), data={
            "action": "edit",
            "title": title,
            "text": new_text,
            "summary": summary,
            "format": "json",
            "token": token,
            "bot": "false",
        })
        data = resp.json()

        if "edit" in data and data["edit"].get("result") == "Success":
            return {"success": True, "title": title}
        elif "error" in data:
            return {"success": False, "error": data["error"].get("info", str(data["error"]))}
        else:
            return {"success": False, "error": f"Unexpected response: {data}"}
    except Exception as e:
        return {"success": False, "error": str(e)}


def _format_date(iso_date: str) -> str:
    """Convert YYYY-MM-DD to 'Month D, YYYY' format for Wikipedia."""
    try:
        parts = iso_date.split("-")
        y, m, d = int(parts[0]), int(parts[1]), int(parts[2])
        return f"{_MONTHS[m - 1]} {d}, {y}"
    except (IndexError, ValueError):
        return iso_date


def _find_template_bounds(wikitext: str, pos: int) -> tuple[int, int] | None:
    """Find the {{ ... }} template boundaries surrounding position `pos`.
    Handles nested templates by counting brace depth."""
    # Search backwards for the opening {{
    depth = 0
    start = pos
    while start > 0:
        start -= 1
        if wikitext[start:start+2] == '}}':
            depth += 1
        elif wikitext[start:start+2] == '{{':
            if depth == 0:
                break
            depth -= 1

    if wikitext[start:start+2] != '{{':
        return None

    # Search forwards for the closing }}
    depth = 0
    end = start
    while end < len(wikitext) - 1:
        if wikitext[end:end+2] == '{{':
            depth += 1
            end += 2
        elif wikitext[end:end+2] == '}}':
            depth -= 1
            if depth == 0:
                return (start, end + 2)
            end += 2
        else:
            end += 1

    return None


def _apply_replacements(wikitext: str, replacements: list[dict]) -> str:
    """Apply all URL replacements and fix archive-date + website params
    within the same template."""
    from backend.config import AT_DOMAINS

    for rep in replacements:
        old_url = rep["old_url"]
        new_url = rep["new_url"]
        new_date = rep.get("new_date", "")

        # Replace the URL
        wikitext = wikitext.replace(old_url, new_url)

        if not new_date:
            continue

        formatted_date = _format_date(new_date)

        # Find each occurrence of the new URL and fix params in its template
        for m in re.finditer(re.escape(new_url), wikitext):
            bounds = _find_template_bounds(wikitext, m.start())
            if not bounds:
                continue

            tmpl_start, tmpl_end = bounds
            template = wikitext[tmpl_start:tmpl_end]

            new_template = template

            # Determine if the URL is in |archive-url= or |url= position
            # by checking what parameter name precedes it
            url_pos_in_tmpl = m.start() - tmpl_start
            before_url = template[:url_pos_in_tmpl]
            is_archive_url = bool(re.search(r'\|\s*archive-?url\s*=\s*$', before_url))

            if is_archive_url:
                # URL is in |archive-url= — update |archive-date=
                new_template = re.sub(
                    r'(\|\s*archive-?date\s*=\s*)([^|}\n]*)',
                    rf'\g<1>{formatted_date}',
                    new_template,
                )
            else:
                # URL is in |url= — this is a {{Webarchive}} or the primary URL
                # Update |date= (but NOT |access-date= or |archive-date=)
                new_template = re.sub(
                    r'(\|\s*date\s*=\s*)([^|}\n]*)',
                    rf'\g<1>{formatted_date}',
                    new_template,
                )

            # Clean up |website=archive.* → use original site's domain
            at_domains_pattern = "|".join(re.escape(d) for d in AT_DOMAINS)
            original_url = rep.get("original_url", "")
            # Extract domain from the original URL for the website param
            original_domain = ""
            if original_url:
                m_domain = re.match(r'https?://(?:www\.)?([^/]+)', original_url)
                if m_domain:
                    original_domain = m_domain.group(1)
            website_replacement = original_domain or "web.archive.org"
            new_template = re.sub(
                rf'(\|\s*website\s*=\s*)(?:{at_domains_pattern})(\s*[|}}])',
                rf'\g<1>{website_replacement}\2',
                new_template,
                flags=re.IGNORECASE,
            )

            if new_template != template:
                wikitext = wikitext[:tmpl_start] + new_template + wikitext[tmpl_end:]

    return wikitext
