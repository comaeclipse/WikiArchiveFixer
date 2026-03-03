from __future__ import annotations

import httpx

from backend.config import DEADCHECK_TIMEOUT


async def check_url_alive(url: str, client: httpx.AsyncClient) -> tuple[int | None, bool]:
    """HEAD-request a URL. Returns (status_code, is_alive).
    is_alive is True for 2xx/3xx, False otherwise. None status means connection error."""
    try:
        resp = await client.head(url, timeout=DEADCHECK_TIMEOUT, follow_redirects=True)
        return resp.status_code, resp.status_code < 400
    except Exception:
        try:
            resp = await client.get(url, timeout=DEADCHECK_TIMEOUT, follow_redirects=True)
            return resp.status_code, resp.status_code < 400
        except Exception:
            return None, False
