from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime


@dataclass
class Article:
    id: int = 0
    title: str = ""
    last_scanned: str = ""
    wikitext_hash: str = ""
    scan_status: str = "pending"  # pending | scanning | done | error


@dataclass
class Url:
    id: int = 0
    article_id: int = 0
    archive_url: str = ""
    original_url: str = ""
    wayback_url: str = ""
    wayback_date: str = ""
    http_status: int | None = None
    http_checked_at: str = ""
    status: str = "pending"  # pending | found | notfound | noextract | dead | alive


@dataclass
class RefUrl:
    id: int = 0
    article_id: int = 0
    url: str = ""
    ref_context: str = ""
    http_status: int | None = None
    http_checked_at: str = ""
    redirect_url: str = ""
    status: str = "pending"  # pending | alive | dead | redirect | error


@dataclass
class EditRecord:
    id: int = 0
    article_id: int = 0
    url_id: int = 0
    old_url: str = ""
    new_url: str = ""
    old_date: str = ""
    new_date: str = ""
    edit_summary: str = ""
    success: bool = False
    error_msg: str = ""
    created_at: str = ""


@dataclass
class RetryItem:
    id: int = 0
    url_id: int = 0
    retry_type: str = ""  # wayback | deadcheck | edit
    attempt_count: int = 0
    next_retry_at: str = ""
    last_error: str = ""
