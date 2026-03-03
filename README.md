# WikiArchiveFixer

> **Work in progress.** This project is under active development and not yet feature-complete.

WikiArchiveFixer is a tool for detecting and replacing archive.today links in Wikipedia articles with [Wayback Machine](https://web.archive.org) alternatives. It scans articles for archive.today URLs (across all known domain variants), checks for Wayback Machine mirrors, validates reference links, and can submit edits directly to Wikipedia.

Based on the original [wikipedia-archive-today-detector](https://github.com/nethahussain/wikipedia-archive-today-detector) by Netha Hussain.

## Features

- **Real-time scanning** — streams scan progress via SSE as articles are analyzed
- **Archive.today detection** — finds links across all domain variants (archive.today, .ph, .is, .fo, .li, .vn, .md)
- **Wayback Machine lookup** — checks if alternative archives exist on archive.org
- **Reference validation** — checks URLs in article references for dead links and redirects
- **Wikipedia editing** — preview and submit edits directly via BotPasswords authentication
- **Edit history** — tracks all edits made through the tool

## Requirements

- Python 3.10+
- Node.js 18+

## Quick Start

```bash
./start.sh
```

This handles everything: creates a Python virtual environment, installs dependencies, builds the frontend, and starts the server at **http://localhost:8000**.

## Manual Setup

```bash
# Backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Frontend
cd frontend
npm install
npm run build
cd ..

# Run
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

## Wikipedia Authentication

FixArchive uses [BotPasswords](https://www.mediawiki.org/wiki/Manual:Bot_passwords) to authenticate with Wikipedia. To set up:

1. Go to [Special:BotPasswords](https://en.wikipedia.org/wiki/Special:BotPasswords) on Wikipedia
2. Create a new bot password with **Edit existing pages** permission
3. Log in through the FixArchive UI with `YourUsername@BotName` and the generated password

## Architecture

- **Backend** — FastAPI + aiosqlite (SQLite), serves the API and built frontend
- **Frontend** — React + Vite, built to `frontend/dist/` for production
- **Scanner** — async generator that streams SSE events as it processes articles
- **Editor** — direct MediaWiki API calls (not the pywikibot library, despite the filename)

## License

TBD
