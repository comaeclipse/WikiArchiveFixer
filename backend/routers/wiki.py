import random

from fastapi import APIRouter, HTTPException, Query
import httpx

from backend.config import WIKI_API, HTTP_HEADERS, AT_DOMAINS

router = APIRouter()


@router.get("/wikitext")
async def get_wikitext(title: str = Query(...)):
    async with httpx.AsyncClient(headers=HTTP_HEADERS) as client:
        resp = await client.get(
            WIKI_API,
            params={"action": "parse", "page": title, "prop": "wikitext", "format": "json"},
            timeout=30.0,
        )
        resp.raise_for_status()
        data = resp.json()
        if "error" in data:
            return {"error": data["error"].get("info", "Unknown error")}
        return {"title": title, "wikitext": data["parse"]["wikitext"]["*"]}


@router.get("/search")
async def search_articles(q: str = Query(..., min_length=2)):
    async with httpx.AsyncClient(headers=HTTP_HEADERS) as client:
        resp = await client.get(
            WIKI_API,
            params={
                "action": "opensearch",
                "search": q,
                "limit": 8,
                "namespace": 0,
                "format": "json",
            },
            timeout=15.0,
        )
        resp.raise_for_status()
        data = resp.json()
        return {"results": data[1] if len(data) > 1 else []}


@router.get("/search-categories")
async def search_categories(q: str = Query(..., min_length=2)):
    clean = q.removeprefix("Category:")
    async with httpx.AsyncClient(headers=HTTP_HEADERS) as client:
        resp = await client.get(
            WIKI_API,
            params={
                "action": "opensearch",
                "search": f"Category:{clean}",
                "limit": 8,
                "namespace": 14,
                "format": "json",
            },
            timeout=15.0,
        )
        resp.raise_for_status()
        data = resp.json()
        return {"results": data[1] if len(data) > 1 else []}


@router.get("/category-members")
async def category_members(cat: str = Query(...), limit: int = Query(500, le=500)):
    prefix = cat if cat.startswith("Category:") else f"Category:{cat}"
    titles: list[str] = []
    cmcontinue = ""

    async with httpx.AsyncClient(headers=HTTP_HEADERS) as client:
        while len(titles) < limit:
            params = {
                "action": "query",
                "list": "categorymembers",
                "cmtitle": prefix,
                "cmlimit": 50,
                "cmtype": "page",
                "cmnamespace": 0,
                "format": "json",
            }
            if cmcontinue:
                params["cmcontinue"] = cmcontinue
            resp = await client.get(WIKI_API, params=params, timeout=15.0)
            resp.raise_for_status()
            data = resp.json()
            members = data.get("query", {}).get("categorymembers", [])
            titles.extend(m["title"] for m in members)
            cmcontinue = data.get("continue", {}).get("cmcontinue", "")
            if not cmcontinue:
                break

    return {"category": prefix, "titles": titles[:limit]}


@router.get("/lucky")
async def lucky_article():
    tlds = AT_DOMAINS.copy()
    random.shuffle(tlds)
    async with httpx.AsyncClient(headers=HTTP_HEADERS) as client:
        for tld in tlds:
            offset = random.randint(0, 500)
            resp = await client.get(
                WIKI_API,
                params={
                    "action": "query", "list": "search",
                    "srsearch": f'insource:"{tld}" -intitle:"{tld}"',
                    "srnamespace": "0", "srlimit": "10",
                    "sroffset": str(offset), "format": "json",
                },
                timeout=15.0,
            )
            results = resp.json().get("query", {}).get("search", [])
            if results:
                return {"title": random.choice(results)["title"]}
    raise HTTPException(status_code=404, detail="No results found")
