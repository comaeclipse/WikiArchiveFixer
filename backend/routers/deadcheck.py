from fastapi import APIRouter
from pydantic import BaseModel
import httpx

from backend.config import HTTP_HEADERS
from backend.database import update_url, get_url
from backend.services.deadlink_checker import check_url_alive

router = APIRouter()


class DeadcheckRequest(BaseModel):
    url_ids: list[int]


@router.post("/check")
async def batch_deadcheck(req: DeadcheckRequest):
    results = []
    async with httpx.AsyncClient(headers=HTTP_HEADERS) as client:
        for url_id in req.url_ids:
            url_row = await get_url(url_id)
            if not url_row:
                results.append({"url_id": url_id, "error": "not found"})
                continue
            target = url_row["original_url"] or url_row["archive_url"]
            status_code, alive = await check_url_alive(target, client)
            status = "alive" if alive else "dead"
            from backend.database import _now
            await update_url(url_id, http_status=status_code, http_checked_at=_now(), status=status)
            results.append({
                "url_id": url_id,
                "http_status": status_code,
                "alive": alive,
                "status": status,
            })
    return {"results": results}
