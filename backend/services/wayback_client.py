from __future__ import annotations

import asyncio
import re

import httpx

from backend.config import WAYBACK_API, WAYBACK_RETRIES, WAYBACK_BACKOFF_BASE


def extract_original_url(archive_url: str) -> str | None:
    """Extract original URL from an archive.today URL path."""
    try:
        from urllib.parse import urlparse
        parsed = urlparse(archive_url)
        path = parsed.path + ("?" + parsed.query if parsed.query else "")
        m = re.match(r"/(?:\d{8,14}/)?(.+)", path)
        if not m:
            return None
        candidate = m.group(1)
        if candidate.startswith("http://") or candidate.startswith("https://"):
            return candidate
        # Try newest/ prefix pattern
        m2 = re.match(r"/?newest/(.+)", path)
        if m2:
            return m2.group(1)
        return None
    except Exception:
        return None


def extract_wayback_date(wayback_url: str) -> str:
    """Extract YYYY-MM-DD from a Wayback Machine URL."""
    if not wayback_url:
        return ""
    m = re.search(r"/web/(\d{4})(\d{2})(\d{2})\d*", wayback_url)
    if not m:
        return ""
    return f"{m.group(1)}-{m.group(2)}-{m.group(3)}"


async def check_wayback(original_url: str, client: httpx.AsyncClient) -> str | None:
    """Query Wayback Machine availability API. Returns wayback URL or None."""
    for attempt in range(WAYBACK_RETRIES + 1):
        try:
            resp = await client.get(
                WAYBACK_API,
                params={"url": original_url},
                timeout=15.0,
            )
            if resp.status_code == 503 and attempt < WAYBACK_RETRIES:
                await asyncio.sleep(WAYBACK_BACKOFF_BASE * (attempt + 1))
                continue
            if not resp.is_success:
                return None
            data = resp.json()
            snap = data.get("archived_snapshots", {}).get("closest", {})
            if snap.get("available"):
                return snap["url"]
            return None
        except Exception:
            if attempt < WAYBACK_RETRIES:
                await asyncio.sleep(WAYBACK_BACKOFF_BASE * (attempt + 1))
                continue
            return None
    return None
