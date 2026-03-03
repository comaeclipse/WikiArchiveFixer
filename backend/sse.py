"""SSE formatting helpers."""
from __future__ import annotations

import json


def sse_event(event: str, data: dict | list | str) -> str:
    payload = json.dumps(data) if not isinstance(data, str) else data
    return f"event: {event}\ndata: {payload}\n\n"
