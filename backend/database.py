from __future__ import annotations

import hashlib
from datetime import datetime, timezone

import aiosqlite

from backend.config import DB_PATH
from backend.models import Article, Url, RefUrl, EditRecord, RetryItem

_SCHEMA = """
CREATE TABLE IF NOT EXISTS articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT UNIQUE NOT NULL,
    last_scanned TEXT NOT NULL DEFAULT '',
    wikitext_hash TEXT NOT NULL DEFAULT '',
    scan_status TEXT NOT NULL DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS urls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id INTEGER NOT NULL REFERENCES articles(id),
    archive_url TEXT NOT NULL,
    original_url TEXT NOT NULL DEFAULT '',
    wayback_url TEXT NOT NULL DEFAULT '',
    wayback_date TEXT NOT NULL DEFAULT '',
    http_status INTEGER,
    http_checked_at TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS edit_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id INTEGER NOT NULL REFERENCES articles(id),
    url_id INTEGER NOT NULL REFERENCES urls(id),
    old_url TEXT NOT NULL,
    new_url TEXT NOT NULL,
    old_date TEXT NOT NULL DEFAULT '',
    new_date TEXT NOT NULL DEFAULT '',
    edit_summary TEXT NOT NULL DEFAULT '',
    success INTEGER NOT NULL DEFAULT 0,
    error_msg TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS retry_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url_id INTEGER NOT NULL REFERENCES urls(id),
    retry_type TEXT NOT NULL,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    next_retry_at TEXT NOT NULL DEFAULT '',
    last_error TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS ref_urls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id INTEGER NOT NULL REFERENCES articles(id),
    url TEXT NOT NULL,
    ref_context TEXT NOT NULL DEFAULT '',
    http_status INTEGER,
    http_checked_at TEXT NOT NULL DEFAULT '',
    redirect_url TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending'
);

CREATE INDEX IF NOT EXISTS idx_urls_article ON urls(article_id);
CREATE INDEX IF NOT EXISTS idx_edit_history_article ON edit_history(article_id);
CREATE INDEX IF NOT EXISTS idx_retry_queue_next ON retry_queue(next_retry_at);
CREATE INDEX IF NOT EXISTS idx_ref_urls_article ON ref_urls(article_id);
"""


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _hash_wikitext(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()[:16]


from contextlib import asynccontextmanager as _acm


@_acm
async def _db():
    conn = await aiosqlite.connect(str(DB_PATH))
    conn.row_factory = aiosqlite.Row
    await conn.execute("PRAGMA journal_mode=WAL")
    await conn.execute("PRAGMA foreign_keys=ON")
    try:
        yield conn
    finally:
        await conn.close()


async def init_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    async with _db() as conn:
        await conn.executescript(_SCHEMA)
        await conn.commit()


# ── Articles ──


async def upsert_article(title: str, wikitext: str) -> tuple[Article, bool]:
    """Insert or update article. Returns (article, changed) where changed means wikitext differs."""
    h = _hash_wikitext(wikitext)
    now = _now()
    async with _db() as conn:
        row = await conn.execute_fetchall(
            "SELECT * FROM articles WHERE title = ?", (title,)
        )
        if row:
            old = dict(row[0])
            changed = old["wikitext_hash"] != h
            await conn.execute(
                "UPDATE articles SET last_scanned=?, wikitext_hash=?, scan_status='scanning' WHERE id=?",
                (now, h, old["id"]),
            )
            await conn.commit()
            art = Article(id=old["id"], title=title, last_scanned=now, wikitext_hash=h, scan_status="scanning")
            return art, changed
        else:
            cursor = await conn.execute(
                "INSERT INTO articles (title, last_scanned, wikitext_hash, scan_status) VALUES (?,?,?,?)",
                (title, now, h, "scanning"),
            )
            await conn.commit()
            art = Article(id=cursor.lastrowid, title=title, last_scanned=now, wikitext_hash=h, scan_status="scanning")
            return art, True


async def set_article_status(article_id: int, status: str):
    async with _db() as conn:
        await conn.execute("UPDATE articles SET scan_status=? WHERE id=?", (status, article_id))
        await conn.commit()


async def get_article(article_id: int) -> Article | None:
    async with _db() as conn:
        rows = await conn.execute_fetchall("SELECT * FROM articles WHERE id=?", (article_id,))
        if not rows:
            return None
        r = dict(rows[0])
        return Article(**{k: r[k] for k in Article.__dataclass_fields__})


async def get_article_by_title(title: str) -> Article | None:
    async with _db() as conn:
        rows = await conn.execute_fetchall("SELECT * FROM articles WHERE title=?", (title,))
        if not rows:
            return None
        r = dict(rows[0])
        return Article(**{k: r[k] for k in Article.__dataclass_fields__})


async def list_articles(limit: int = 50, offset: int = 0) -> list[dict]:
    async with _db() as conn:
        rows = await conn.execute_fetchall(
            "SELECT a.*, COUNT(u.id) as url_count FROM articles a "
            "LEFT JOIN urls u ON u.article_id = a.id "
            "GROUP BY a.id ORDER BY a.last_scanned DESC LIMIT ? OFFSET ?",
            (limit, offset),
        )
        return [dict(r) for r in rows]


# ── URLs ──


async def insert_url(article_id: int, archive_url: str, original_url: str) -> Url:
    async with _db() as conn:
        cursor = await conn.execute(
            "INSERT INTO urls (article_id, archive_url, original_url) VALUES (?,?,?)",
            (article_id, archive_url, original_url),
        )
        await conn.commit()
        return Url(id=cursor.lastrowid, article_id=article_id, archive_url=archive_url, original_url=original_url)


async def update_url(url_id: int, **kwargs):
    if not kwargs:
        return
    sets = ", ".join(f"{k}=?" for k in kwargs)
    vals = list(kwargs.values()) + [url_id]
    async with _db() as conn:
        await conn.execute(f"UPDATE urls SET {sets} WHERE id=?", vals)
        await conn.commit()


async def get_urls_for_article(article_id: int) -> list[dict]:
    async with _db() as conn:
        rows = await conn.execute_fetchall(
            "SELECT * FROM urls WHERE article_id=? ORDER BY id", (article_id,)
        )
        return [dict(r) for r in rows]


async def delete_urls_for_article(article_id: int):
    async with _db() as conn:
        # Delete child records that reference these URLs first
        await conn.execute(
            "DELETE FROM retry_queue WHERE url_id IN (SELECT id FROM urls WHERE article_id=?)",
            (article_id,),
        )
        await conn.execute(
            "DELETE FROM edit_history WHERE url_id IN (SELECT id FROM urls WHERE article_id=?)",
            (article_id,),
        )
        await conn.execute("DELETE FROM urls WHERE article_id=?", (article_id,))
        await conn.commit()


async def get_url(url_id: int) -> dict | None:
    async with _db() as conn:
        rows = await conn.execute_fetchall("SELECT * FROM urls WHERE id=?", (url_id,))
        return dict(rows[0]) if rows else None


# ── Ref URLs ──


async def insert_ref_url(article_id: int, url: str, ref_context: str) -> RefUrl:
    async with _db() as conn:
        cursor = await conn.execute(
            "INSERT INTO ref_urls (article_id, url, ref_context) VALUES (?,?,?)",
            (article_id, url, ref_context),
        )
        await conn.commit()
        return RefUrl(id=cursor.lastrowid, article_id=article_id, url=url, ref_context=ref_context)


async def update_ref_url(ref_url_id: int, **kwargs):
    if not kwargs:
        return
    sets = ", ".join(f"{k}=?" for k in kwargs)
    vals = list(kwargs.values()) + [ref_url_id]
    async with _db() as conn:
        await conn.execute(f"UPDATE ref_urls SET {sets} WHERE id=?", vals)
        await conn.commit()


async def get_ref_urls_for_article(article_id: int) -> list[dict]:
    async with _db() as conn:
        rows = await conn.execute_fetchall(
            "SELECT * FROM ref_urls WHERE article_id=? ORDER BY id", (article_id,)
        )
        return [dict(r) for r in rows]


async def delete_ref_urls_for_article(article_id: int):
    async with _db() as conn:
        await conn.execute("DELETE FROM ref_urls WHERE article_id=?", (article_id,))
        await conn.commit()


# ── Edit History ──


async def insert_edit(article_id: int, url_id: int, old_url: str, new_url: str,
                      old_date: str, new_date: str, edit_summary: str,
                      success: bool, error_msg: str = "") -> int:
    async with _db() as conn:
        cursor = await conn.execute(
            "INSERT INTO edit_history (article_id, url_id, old_url, new_url, old_date, new_date, "
            "edit_summary, success, error_msg, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
            (article_id, url_id, old_url, new_url, old_date, new_date,
             edit_summary, int(success), error_msg, _now()),
        )
        await conn.commit()
        return cursor.lastrowid


async def list_edits(limit: int = 50, offset: int = 0) -> list[dict]:
    async with _db() as conn:
        rows = await conn.execute_fetchall(
            "SELECT e.*, a.title as article_title FROM edit_history e "
            "JOIN articles a ON a.id = e.article_id "
            "ORDER BY e.created_at DESC LIMIT ? OFFSET ?",
            (limit, offset),
        )
        return [dict(r) for r in rows]


# ── Retry Queue ──


async def insert_retry(url_id: int, retry_type: str, last_error: str = "",
                       next_retry_at: str = "") -> int:
    if not next_retry_at:
        next_retry_at = _now()
    async with _db() as conn:
        cursor = await conn.execute(
            "INSERT INTO retry_queue (url_id, retry_type, attempt_count, next_retry_at, last_error) "
            "VALUES (?,?,1,?,?)",
            (url_id, retry_type, next_retry_at, last_error),
        )
        await conn.commit()
        return cursor.lastrowid


async def list_retries(limit: int = 50, offset: int = 0) -> list[dict]:
    async with _db() as conn:
        rows = await conn.execute_fetchall(
            "SELECT r.*, u.archive_url, u.original_url, a.title as article_title "
            "FROM retry_queue r "
            "JOIN urls u ON u.id = r.url_id "
            "JOIN articles a ON a.id = u.article_id "
            "ORDER BY r.next_retry_at ASC LIMIT ? OFFSET ?",
            (limit, offset),
        )
        return [dict(r) for r in rows]


async def delete_retry(retry_id: int):
    async with _db() as conn:
        await conn.execute("DELETE FROM retry_queue WHERE id=?", (retry_id,))
        await conn.commit()


# ── Stats ──


async def get_stats() -> dict:
    async with _db() as conn:
        articles_scanned = (await conn.execute_fetchall(
            "SELECT COUNT(*) as c FROM articles"))[0]["c"]
        articles_with_links = (await conn.execute_fetchall(
            "SELECT COUNT(DISTINCT article_id) as c FROM urls"))[0]["c"]
        total_at_links = (await conn.execute_fetchall(
            "SELECT COUNT(*) as c FROM urls"))[0]["c"]
        with_wayback = (await conn.execute_fetchall(
            "SELECT COUNT(*) as c FROM urls WHERE status='found'"))[0]["c"]
        no_wayback = (await conn.execute_fetchall(
            "SELECT COUNT(*) as c FROM urls WHERE status='notfound'"))[0]["c"]
        edits_submitted = (await conn.execute_fetchall(
            "SELECT COUNT(*) as c FROM edit_history WHERE success=1"))[0]["c"]
        edits_failed = (await conn.execute_fetchall(
            "SELECT COUNT(*) as c FROM edit_history WHERE success=0"))[0]["c"]
        links_fixed = (await conn.execute_fetchall(
            "SELECT COUNT(DISTINCT url_id) as c FROM edit_history WHERE success=1"))[0]["c"]
        articles_edited = (await conn.execute_fetchall(
            "SELECT COUNT(DISTINCT article_id) as c FROM edit_history WHERE success=1"))[0]["c"]

        # URL status breakdown
        status_rows = await conn.execute_fetchall(
            "SELECT status, COUNT(*) as c FROM urls GROUP BY status")
        url_statuses = {r["status"]: r["c"] for r in status_rows}

        # Ref URL stats
        dead_refs = (await conn.execute_fetchall(
            "SELECT COUNT(*) as c FROM ref_urls WHERE status='dead'"))[0]["c"]
        total_refs_checked = (await conn.execute_fetchall(
            "SELECT COUNT(*) as c FROM ref_urls WHERE status != 'pending'"))[0]["c"]

        return {
            "articles_scanned": articles_scanned,
            "articles_with_links": articles_with_links,
            "total_at_links": total_at_links,
            "with_wayback": with_wayback,
            "no_wayback": no_wayback,
            "edits_submitted": edits_submitted,
            "edits_failed": edits_failed,
            "links_fixed": links_fixed,
            "articles_edited": articles_edited,
            "url_statuses": url_statuses,
            "dead_refs": dead_refs,
            "total_refs_checked": total_refs_checked,
        }
