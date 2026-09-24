"""
translation_router.py — Text translation & tone rewriting endpoints.
POST /api/translate-text       → Sarvam text translation (with cache)
POST /api/advanced-translate   → Gemini-powered contextual translation
POST /api/multi-translate      → Translate into multiple languages
POST /api/rewrite-tone         → Tone rewriting via Gemini
POST /api/vision-translate     → Image OCR + translation
POST /api/back-translate       → Back-translate quality check
"""
import asyncio
import logging
from typing import Optional

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel

from services.sarvam_client import translate_text
from services.gemini_client import (
    RetoneError,
    RetoneQuotaError,
    rewrite_text_tone,
    advanced_translate,
    back_translate_check,
    vision_translate_image,
)

router = APIRouter(prefix="/api", tags=["translation"])
logger = logging.getLogger(__name__)

ALLOWED_MIME = {"image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"}
MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10MB


class TranslationRequest(BaseModel):
    text: str
    source_language: str = "en-IN"
    target_language: str


class RewriteRequest(BaseModel):
    text: str
    tone: str
    user_override: Optional[str] = None
    custom_vocabulary: Optional[list] = None


class AdvancedTranslateRequest(BaseModel):
    text: str
    target_language: str
    glossary: dict | None = None


class MultiTranslateRequest(BaseModel):
    text: str
    languages: list  # list of lang codes


class BackTranslateRequest(BaseModel):
    text: str
    source_lang: str = "hi-IN"


@router.post("/translate-text")
def handle_text_translation(request: TranslationRequest):
    if not request.text or not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    if request.source_language == request.target_language:
        return {"translated_text": request.text}
    try:
        native_translation = translate_text(
            text=request.text,
            source_language=request.source_language,
            target_language=request.target_language,
        )
    except Exception as e:
        logger.error(f"translate-text error: {e}")
        raise HTTPException(status_code=502, detail="Translation service unavailable. Please try again.")
    return {"translated_text": native_translation}


@router.post("/advanced-translate")
def handle_advanced_translation(request: AdvancedTranslateRequest):
    """
    Advanced Gemini-powered translation with context analysis,
    jargon preservation, slang normalization, and confidence scoring.
    """
    if not request.text or not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    try:
        result = advanced_translate(
            text=request.text,
            target_language=request.target_language,
            glossary=request.glossary,
        )
        return result
    except Exception as e:
        logger.error(f"advanced-translate error: {e}")
        raise HTTPException(status_code=502, detail="Translation service unavailable. Please try again.")


@router.post("/multi-translate")
def handle_multi_translate(request: MultiTranslateRequest):
    """Translates text into multiple languages simultaneously (max 5)."""
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    if not request.languages:
        raise HTTPException(status_code=400, detail="At least one language required")
    results = {}
    for lang in request.languages[:5]:
        try:
            results[lang] = translate_text(
                request.text, source_language="en-IN", target_language=lang
            )
        except Exception as e:
            logger.error(f"multi-translate error for {lang}: {e}")
            results[lang] = "[Error: translation failed]"
    return {"translations": results}


@router.post("/rewrite-tone")
def handle_tone_rewrite(request: RewriteRequest):
    """Rewrites English text with Google Gemini based on the selected tone."""
    try:
        rewritten_text = rewrite_text_tone(
            text=request.text,
            tone_option=request.tone,
            user_override=request.user_override,
            custom_vocabulary=request.custom_vocabulary,
        )
        return {"rewritten_text": rewritten_text}
    except RetoneQuotaError as e:
        raise HTTPException(
            status_code=429,
            detail=f"{e.provider} retone is temporarily unavailable because the model quota or rate limit was reached. Please try again shortly.",
        )
    except RetoneError as e:
        logger.error(f"rewrite-tone error: {e}")
        raise HTTPException(status_code=503, detail="Retone service is temporarily unavailable. Please try again.")


@router.post("/vision-translate")
async def handle_vision_translate(
    file: UploadFile = File(...),
    target_language: str = Form("hi-IN"),
):
    """
    Accepts an image (PNG/JPG/WEBP), detects all text regions using Gemini Vision,
    translates each region to target_language, and returns bounding box + translated text.
    """
    content_type = file.content_type or "image/jpeg"
    if content_type not in ALLOWED_MIME:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported image type: {content_type}. Use PNG, JPG, or WEBP.",
        )

    # Read at most one byte past the limit so an oversized upload is never held in memory.
    image_bytes = await file.read(MAX_IMAGE_SIZE + 1)
    if len(image_bytes) > MAX_IMAGE_SIZE:
        raise HTTPException(status_code=413, detail="Image too large. Maximum 10MB.")

    logger.info(
        f"Vision translate: {file.filename}, {len(image_bytes)} bytes → {target_language}"
    )

    try:
        regions = await asyncio.to_thread(
            vision_translate_image, image_bytes, content_type, target_language
        )
        return {"regions": regions, "count": len(regions)}
    except Exception as e:
        logger.error(f"Vision translate error: {e}")
        raise HTTPException(status_code=502, detail="Vision translation failed. Please try again.")


@router.post("/back-translate")
def handle_back_translate(request: BackTranslateRequest):
    """Translates native text back to English and rates accuracy."""
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    try:
        return back_translate_check(request.text, request.source_lang)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
