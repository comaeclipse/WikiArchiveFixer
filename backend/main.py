from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.config import DATA_DIR
from backend.database import init_db
from backend.routers import wiki, scan, wayback, deadcheck, edit, history

app = FastAPI(title="FixArchive")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(wiki.router, prefix="/api/wiki", tags=["wiki"])
app.include_router(scan.router, prefix="/api/scan", tags=["scan"])
app.include_router(wayback.router, prefix="/api/wayback", tags=["wayback"])
app.include_router(deadcheck.router, prefix="/api/deadcheck", tags=["deadcheck"])
app.include_router(edit.router, prefix="/api/edit", tags=["edit"])
app.include_router(history.router, prefix="/api/history", tags=["history"])

FRONTEND_DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"


@app.on_event("startup")
async def startup():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    await init_db()


@app.get("/api/health")
async def health():
    return {"status": "ok"}


# Serve built frontend (production mode)
if FRONTEND_DIST.is_dir():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIST), html=True), name="frontend")
