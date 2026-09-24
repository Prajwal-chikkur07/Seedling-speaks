"""
main.py — FastAPI application entry point.
All feature endpoints are organized into dedicated routers under /routers.
This file handles app setup, CORS, startup, health check, and cache management.
"""
import logging
import os
import warnings
from pathlib import Path
from typing import Optional

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load .env from the backend directory
load_dotenv(dotenv_path=Path(__file__).parent / ".env")

from database import init_db
from services.translation_cache import get_stats, clear_cache
from services.clerk_auth import get_current_user_id

# ── Routers ───────────────────────────────────────────────────────────────────
from routers.auth_router import router as auth_router
from routers.video_router import router as video_router
from routers.audio_router import router as audio_router
from routers.translation_router import router as translation_router
from routers.sharing_router import router as sharing_router
from routers.analysis_router import router as analysis_router
from routers.slack_router import router as slack_router
from routers.session_router import router as session_router
from routers.e2n_router import router as e2n_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-5s  %(name)s  %(message)s",
    datefmt="%H:%M:%S",
)

# Quiet noisy third-party loggers
for _name in (
    "httpx",
    "httpcore",
    "huggingface_hub",
    "huggingface_hub.utils._http",
    "sentence_transformers",
    "sentence_transformers.base.model",
    "sentence_transformers.SentenceTransformer",
    "transformers",
    "urllib3",
    "filelock",
):
    logging.getLogger(_name).setLevel(logging.WARNING)

# Silence Hugging Face's stderr "no HF_TOKEN" warning and the Gemini deprecation notice
warnings.filterwarnings("ignore", module="huggingface_hub")
warnings.filterwarnings("ignore", category=FutureWarning, module="google.generativeai")


# Drop access-log lines for stale clients hitting endpoints that don't exist
class _DropPaths(logging.Filter):
    SUPPRESSED = ("/api/notifications/stream",)

    def filter(self, record: logging.LogRecord) -> bool:
        msg = record.getMessage()
        return not any(p in msg for p in self.SUPPRESSED)


logging.getLogger("uvicorn.access").addFilter(_DropPaths())

app = FastAPI(title="Voice Translation Backend")

# ── CORS ──────────────────────────────────────────────────────────────────────
# Comma-separated list of browser origins, e.g. "https://app.example.com,http://localhost:5173".
# Clients authenticate with a Bearer header, not cookies, so credentials stay off.
_DEFAULT_ORIGINS = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"
ALLOWED_ORIGINS = [
    o.strip() for o in os.getenv("ALLOWED_ORIGINS", _DEFAULT_ORIGINS).split(",") if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Register routers ─────────────────────────────────────────────────────────
app.include_router(auth_router)         # /api/auth/*
app.include_router(video_router)        # /api/video/*
app.include_router(audio_router)        # /api/translate-audio, /api/diarize-audio, /api/synthesize-conversation, /api/text-to-speech
app.include_router(translation_router)  # /api/translate-text, /api/advanced-translate, /api/multi-translate, /api/rewrite-tone, /api/vision-translate, /api/back-translate
app.include_router(sharing_router)      # /api/send/*, /api/share/*, /api/export
app.include_router(analysis_router)     # /api/analyze-sentiment, /api/suggest-tone, /api/summarize, /api/meeting-notes, /api/qa, /api/readability, /api/tone-confidence
app.include_router(slack_router)        # /api/slack/n2e, /api/slack/n2e/voice
app.include_router(session_router)      # /api/native-to-english/*
app.include_router(e2n_router)          # /api/english-to-native/*

# ── Create PostgreSQL tables on startup ───────────────────────────────────────
@app.on_event("startup")
def on_startup():
    init_db()


# ── Health & Cache ────────────────────────────────────────────────────────────

@app.get("/api/health")
async def health_check():
    """Lightweight health check — always returns immediately."""
    return {"status": "ok"}


@app.get("/api/cache/stats")
async def handle_cache_stats():
    """Returns translation cache statistics — total entries, hits, breakdown by language."""
    return get_stats()


@app.delete("/api/cache/clear")
def handle_cache_clear(lang: Optional[str] = None, _user_id: str = Depends(get_current_user_id)):
    """
    Clears the translation cache.
    Pass ?lang=hi-IN to clear only one language, or no param to clear all.
    """
    deleted = clear_cache(lang)
    return {"status": "cleared", "deleted": deleted, "lang": lang or "all"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
