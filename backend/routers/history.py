from fastapi import APIRouter, Query

from backend.database import list_articles, list_edits, list_retries, get_stats

router = APIRouter()


@router.get("/stats")
async def history_stats():
    return await get_stats()


@router.get("/articles")
async def history_articles(limit: int = Query(50, le=200), offset: int = Query(0)):
    rows = await list_articles(limit=limit, offset=offset)
    return {"articles": rows}


@router.get("/edits")
async def history_edits(limit: int = Query(50, le=200), offset: int = Query(0)):
    rows = await list_edits(limit=limit, offset=offset)
    return {"edits": rows}


@router.get("/retry-queue")
async def history_retries(limit: int = Query(50, le=200), offset: int = Query(0)):
    rows = await list_retries(limit=limit, offset=offset)
    return {"retries": rows}
