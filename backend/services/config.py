"""
config.py — External model names, API URLs, timeouts and shared limits.
Each value can be overridden via an environment variable of the same name.
"""
import os
from pathlib import Path

BACKEND_DIR = Path(__file__).parent.parent
TEMP_AUDIO_DIR = BACKEND_DIR / "temp_audio"
TEMP_VIDEO_DIR = BACKEND_DIR / "temp_video"

GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
GEMINI_LITE_MODEL = os.getenv("GEMINI_LITE_MODEL", "gemini-2.5-flash-lite")
GEMINI_TIMEOUT = int(os.getenv("GEMINI_TIMEOUT", "60"))  # seconds

SARVAM_BASE_URL = os.getenv("SARVAM_BASE_URL", "https://api.sarvam.ai")
SARVAM_STT_TRANSLATE_MODEL = os.getenv("SARVAM_STT_TRANSLATE_MODEL", "saaras:v2.5")
SARVAM_STT_MODEL = os.getenv("SARVAM_STT_MODEL", "saaras:v3")
SARVAM_TRANSLATE_MODEL = os.getenv("SARVAM_TRANSLATE_MODEL", "mayura:v1")
SARVAM_TTS_MODEL = os.getenv("SARVAM_TTS_MODEL", "bulbul:v2")
SARVAM_TTS_FALLBACK_MODEL = os.getenv("SARVAM_TTS_FALLBACK_MODEL", "bulbul:v3")

LMNT_BASE_URL = os.getenv("LMNT_BASE_URL", "https://api.lmnt.com/v1")

FFMPEG_TIMEOUT = int(os.getenv("FFMPEG_TIMEOUT", "180"))  # seconds

MAX_UPLOAD_SIZE = 100 * 1024 * 1024  # 100MB
UPLOAD_CHUNK_SIZE = 1024 * 1024  # 1MB

AUDIO_MIME_TYPES = {
    ".webm": "audio/webm",
    ".wav": "audio/wav",
    ".mp3": "audio/mpeg",
    ".m4a": "audio/mp4",
    ".ogg": "audio/ogg",
    ".flac": "audio/flac",
}
