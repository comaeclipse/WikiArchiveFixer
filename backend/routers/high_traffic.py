import re

import httpx
from fastapi import APIRouter, HTTPException

from backend.config import WIKI_API, HTTP_HEADERS
from backend.database import get_high_traffic_cache, set_high_traffic_cache

router = APIRouter()

_PAGE = "Wikipedia:Archive.today_guidance/high_traffic_pages_report"


async def _fetch_and_cache() -> dict:
    try:
        async with httpx.AsyncClient(headers=HTTP_HEADERS) as client:
            resp = await client.get(
                WIKI_API,
                params={"action": "parse", "page": _PAGE, "prop": "wikitext", "format": "json"},
                timeout=30.0,
            )
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch report from Wikipedia: {e}")

    if "error" in data:
        raise HTTPException(status_code=502, detail=data["error"].get("info", "Wikipedia API error"))

    wikitext = data.get("parse", {}).get("wikitext", {}).get("*", "")
    titles = re.findall(r'\[\[([^|\]#]+?)(?:\|[^\]]*)?\]\]', wikitext)
    seen = set()
    pages = [t for t in titles if ':' not in t and not (t in seen or seen.add(t))]

    await set_high_traffic_cache(pages)
    cached = await get_high_traffic_cache()
    return cached


@router.get("")
async def get_high_traffic():
    cached = await get_high_traffic_cache()
    if cached:
        return cached
    return await _fetch_and_cache()


@router.post("/refresh")
async def refresh_high_traffic():
    return await _fetch_and_cache()
