from fastapi import APIRouter, Query
from pydantic import BaseModel

from backend.services.pywikibot_editor import (
    is_logged_in, login, preview_edit, submit_edit,
    preview_dead_link_edit, submit_dead_link_edit,
)
from backend.database import (
    get_article, get_urls_for_article, get_ref_urls_for_article, insert_edit,
)

router = APIRouter()


@router.get("/auth-status")
async def auth_status():
    return await is_logged_in()


class LoginRequest(BaseModel):
    username: str
    password: str


@router.post("/login")
async def do_login(req: LoginRequest):
    return await login(req.username, req.password)


@router.get("/preview")
async def preview(article_id: int = Query(...)):
    article = await get_article(article_id)
    if not article:
        return {"error": "Article not found"}

    urls = await get_urls_for_article(article_id)
    replacements = []
    for u in urls:
        if u["wayback_url"]:
            replacements.append({
                "old_url": u["archive_url"],
                "new_url": u["wayback_url"],
                "new_date": u.get("wayback_date", ""),
                "original_url": u.get("original_url", ""),
            })

    if not replacements:
        return {"error": "No replacements available"}

    return await preview_edit(article.title, replacements)


class SubmitRequest(BaseModel):
    article_id: int
    summary: str = ""


@router.post("/submit")
async def do_submit(req: SubmitRequest):
    article = await get_article(req.article_id)
    if not article:
        return {"error": "Article not found"}

    urls = await get_urls_for_article(req.article_id)
    replacements = []
    url_map = {}
    for u in urls:
        if u["wayback_url"]:
            rep = {
                "old_url": u["archive_url"],
                "new_url": u["wayback_url"],
                "new_date": u.get("wayback_date", ""),
                "original_url": u.get("original_url", ""),
            }
            replacements.append(rep)
            url_map[u["archive_url"]] = u

    if not replacements:
        return {"error": "No replacements available"}

    n = len(replacements)
    summary = req.summary or (
        f"Replacing {n} archive.today link{'s' if n > 1 else ''} "
        f"with Wayback Machine alternative{'s' if n > 1 else ''} per [[WP:ATODAY]]"
    )

    result = await submit_edit(article.title, replacements, summary)

    # Record in edit history
    for rep in replacements:
        u = url_map.get(rep["old_url"], {})
        await insert_edit(
            article_id=req.article_id,
            url_id=u.get("id", 0),
            old_url=rep["old_url"],
            new_url=rep["new_url"],
            old_date="",
            new_date=rep.get("new_date", ""),
            edit_summary=summary,
            success=result.get("success", False),
            error_msg=result.get("error", ""),
        )

    return result


@router.get("/preview-deadlinks")
async def preview_deadlinks(article_id: int = Query(...)):
    article = await get_article(article_id)
    if not article:
        return {"error": "Article not found"}

    ref_urls = await get_ref_urls_for_article(article_id)
    dead_refs = [r for r in ref_urls if r["status"] == "dead"]
    if not dead_refs:
        return {"error": "No dead references to tag"}

    return await preview_dead_link_edit(article.title, dead_refs)


class SubmitDeadlinksRequest(BaseModel):
    article_id: int
    summary: str = ""


@router.post("/submit-deadlinks")
async def do_submit_deadlinks(req: SubmitDeadlinksRequest):
    article = await get_article(req.article_id)
    if not article:
        return {"error": "Article not found"}

    ref_urls = await get_ref_urls_for_article(req.article_id)
    dead_refs = [r for r in ref_urls if r["status"] == "dead"]
    if not dead_refs:
        return {"error": "No dead references to tag"}

    n = len(dead_refs)
    summary = req.summary or (
        f"Tagging {n} dead reference{'s' if n > 1 else ''} "
        f"with {{{{Dead link}}}} template"
    )

    result = await submit_dead_link_edit(article.title, dead_refs, summary)

    # Record in edit history
    for r in dead_refs:
        await insert_edit(
            article_id=req.article_id,
            url_id=r.get("id", 0),
            old_url=r["url"],
            new_url=r["url"],
            old_date="",
            new_date="",
            edit_summary=summary,
            success=result.get("success", False),
            error_msg=result.get("error", ""),
        )

    return result
