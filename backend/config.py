from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "fixarchive.db"
PYWIKIBOT_DIR = DATA_DIR / "pywikibot"

WIKI_LANG = "en"
WIKI_API = f"https://{WIKI_LANG}.wikipedia.org/w/api.php"
WAYBACK_API = "https://archive.org/wayback/available"

WAYBACK_RETRIES = 3
WAYBACK_BACKOFF_BASE = 1.0
DEADCHECK_TIMEOUT = 10.0
SCAN_DELAY = 0.3

HTTP_HEADERS = {
    "User-Agent": "FixArchive/1.0 (https://github.com/nethahussain/wikipedia-archive-today-detector; tool for replacing archive.today links)",
}

AT_DOMAINS = [
    "archive.today", "archive.ph", "archive.is",
    "archive.fo", "archive.li", "archive.vn", "archive.md",
]
