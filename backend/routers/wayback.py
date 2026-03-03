from fastapi import APIRouter, Query
import httpx

from backend.config import HTTP_HEADERS
from backend.services.wayback_client import check_wayback

router = APIRouter()


@router.get("/check")
async def wayback_check(url: str = Query(...)):
    async with httpx.AsyncClient(headers=HTTP_HEADERS) as client:
        wb_url = await check_wayback(url, client)
        return {"original_url": url, "wayback_url": wb_url, "found": wb_url is not None}
