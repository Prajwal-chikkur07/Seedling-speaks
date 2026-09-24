"""
audio_router.py — Audio processing endpoints.
POST /api/translate-audio      → Transcribe audio to English + native
POST /api/diarize-audio        → Speaker diarization
POST /api/clone-voice          → Clone a voice from audio sample (LMNT)
POST /api/diarize-and-clone    → Diarization + per-speaker LMNT voice clones
POST /api/synthesize-conversation → TTS per speaker segment
POST /api/text-to-speech       → Text-to-speech conversion
"""
import os
import asyncio
import logging
import base64
import uuid

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from starlette.background import BackgroundTask
import aiofiles

from services.audio_diarization import extract_speaker_audio_samples
from services.config import AUDIO_MIME_TYPES, MAX_UPLOAD_SIZE, TEMP_AUDIO_DIR, UPLOAD_CHUNK_SIZE
from services.diarization_service import diarize
from services import lmnt_service
from services.sarvam_client import translate_speech_to_text
from services.tts_service import (
    DEFAULT_SPEAKER,
    text_to_speech_gtts,
    text_to_speech_sarvam,
    get_gtts_language_code,
)

router = APIRouter(prefix="/api", tags=["audio"])
logger = logging.getLogger(__name__)

MAX_SYNTH_SEGMENTS = 100


class TTSRequest(BaseModel):
    text: str
    language: str = "en"
    use_sarvam: bool = False
    speaker: str = DEFAULT_SPEAKER


def _resolve_content_type(content_type: str, filename: str) -> str:
    """Map generic content types to specific audio MIME types based on extension."""
    if content_type != "application/octet-stream":
        return content_type
    ext = os.path.splitext(filename)[1].lower()
    return AUDIO_MIME_TYPES.get(ext, "audio/webm")


def _remove(path: str | None):
    if path and os.path.exists(path):
        os.remove(path)


async def _save_upload(file: UploadFile, prefix: str) -> tuple[str, int]:
    """Stream an upload into temp_audio, enforcing MAX_UPLOAD_SIZE. Returns (path, size)."""
    TEMP_AUDIO_DIR.mkdir(exist_ok=True)
    # Never build paths from the client filename: "../" in it would escape temp_audio.
    ext = os.path.splitext(file.filename or "")[1] or ".webm"
    path = str(TEMP_AUDIO_DIR / f"{prefix}{uuid.uuid4().hex[:8]}{ext}")
    size = 0
    try:
        async with aiofiles.open(path, "wb") as out:
            while chunk := await file.read(UPLOAD_CHUNK_SIZE):
                size += len(chunk)
                if size > MAX_UPLOAD_SIZE:
                    raise HTTPException(
                        status_code=413,
                        detail=f"File too large. Maximum size is {MAX_UPLOAD_SIZE // (1024 * 1024)}MB",
                    )
                await out.write(chunk)
    except BaseException:
        _remove(path)
        raise
    return path, size


@router.post("/translate-audio")
async def handle_audio_translation(file: UploadFile = File(...)):
    """
    Receives audio in local language, translates to English using Sarvam.
    Also returns native_transcript and confidence score.
    """
    original_filename = file.filename or "recording.webm"
    content_type = _resolve_content_type(
        file.content_type or "audio/webm", original_filename
    )

    logger.info(
        f"Received audio: filename={original_filename}, content_type={content_type}"
    )

    temp_path, file_size = await _save_upload(file, "")
    try:
        logger.info(f"File saved: {temp_path}, size: {file_size / 1024:.2f}KB")

        result = await asyncio.to_thread(translate_speech_to_text, temp_path, content_type)
        english_transcript = result.get("transcript", "")
        native_transcript = result.get("native_transcript", "")
        confidence = result.get("confidence", None)

        if not english_transcript or not english_transcript.strip():
            raise HTTPException(
                status_code=422,
                detail="Could not transcribe audio. Please speak clearly and try again.",
            )

        return {
            "transcript": english_transcript,
            "native_transcript": native_transcript,
            "confidence": confidence,
            "file_size": file_size,
            "filename": original_filename,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"translate-audio error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        _remove(temp_path)


def _diarize_audio(temp_path: str | None, content_type: str, transcript: str, speaker_count: int) -> dict:
    if not transcript and temp_path:
        stt = translate_speech_to_text(temp_path, content_type=content_type)
        transcript = stt.get("transcript", "").strip()
    if not transcript:
        raise HTTPException(
            status_code=422,
            detail="Could not transcribe audio — speak clearly and try again",
        )

    segments, method = diarize(transcript, temp_path, speaker_count)

    speaker_counts = {}
    for s in segments:
        speaker_counts[s["speaker"]] = speaker_counts.get(s["speaker"], 0) + 1
    for s in segments:
        s["confidence"] = round(min(0.95, 0.6 + (speaker_counts[s["speaker"]] / len(segments)) * 0.35), 2)

    return {
        "transcript": transcript,
        "segments": segments,
        "speaker_count": len(speaker_counts),
        "method": method,
    }


@router.post("/diarize-audio")
async def handle_diarize_audio(
    file: UploadFile = File(None),
    speaker_count: int = Form(0),
    transcript: str = Form(""),
):
    """
    Diarize audio into speaker segments.
    - If 'transcript' form field is provided, skip STT and use it directly.
    - If 'file' is provided, it is used for STT (when no transcript) and audio-based diarization.
    """
    temp_path = None
    content_type = ""
    try:
        if file is not None:
            content_type = _resolve_content_type(file.content_type or "audio/webm", file.filename or "")
            temp_path, _ = await _save_upload(file, "diarize_")
        return await asyncio.to_thread(_diarize_audio, temp_path, content_type, transcript.strip(), speaker_count)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"diarize-audio error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        _remove(temp_path)


@router.post("/clone-voice")
async def handle_clone_voice(file: UploadFile = File(...)):
    """
    Accept an audio sample and create an LMNT voice clone.
    Returns { voice_id, name } on success.
    """
    if not lmnt_service.is_available():
        raise HTTPException(status_code=503, detail="Voice cloning is not configured (LMNT_API_KEY missing)")

    temp_path, _ = await _save_upload(file, "clone_")
    try:
        voice_id = await asyncio.to_thread(
            lmnt_service.clone_voice, temp_path, f"user_clone_{uuid.uuid4().hex[:6]}"
        )
        return {"voice_id": voice_id}
    except Exception as e:
        logger.error(f"clone-voice error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        _remove(temp_path)


def _clone_speaker_voices(audio_path: str, segments: list[dict]) -> dict:
    speaker_voices = {}
    for spk, sample_path in extract_speaker_audio_samples(audio_path, segments).items():
        try:
            speaker_voices[spk] = lmnt_service.clone_voice(
                sample_path,
                voice_name=f"spk_{spk.replace(' ', '_').lower()}_{uuid.uuid4().hex[:4]}",
            )
            logger.info(f"[dac] Cloned voice for {spk}: {speaker_voices[spk]}")
        except Exception as e:
            logger.warning(f"[dac] Clone failed for {spk}: {e}")
        finally:
            _remove(sample_path)
    return speaker_voices


def _diarize_and_clone(temp_path: str | None, transcript: str) -> dict:
    segments, method = diarize(transcript, temp_path)
    speaker_voices = {}
    if temp_path and lmnt_service.is_available():
        speaker_voices = _clone_speaker_voices(temp_path, segments)
    return {
        "segments": segments,
        "speaker_voices": speaker_voices,
        "speaker_count": len(set(s["speaker"] for s in segments)),
        "method": method,
    }


@router.post("/diarize-and-clone")
async def handle_diarize_and_clone(
    file: UploadFile = File(None),
    transcript: str = Form(""),
):
    """
    Diarize transcript into per-speaker segments, then clone each speaker's
    voice from the audio via LMNT. Returns segments + speaker_voices map.
    Falls back to Sarvam voices if LMNT is not configured or cloning fails.
    """
    full_transcript = transcript.strip()
    if not full_transcript:
        raise HTTPException(status_code=422, detail="Transcript is required")

    temp_path = None
    try:
        if file is not None:
            temp_path, _ = await _save_upload(file, "dac_")
        return await asyncio.to_thread(_diarize_and_clone, temp_path, full_transcript)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"diarize-and-clone error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        _remove(temp_path)


@router.post("/synthesize-conversation")
def handle_synthesize_conversation(request: dict):
    """
    Generate TTS audio for each speaker segment in the target language.
    Returns base64 audio per segment.
    """
    segments = request.get("segments", [])
    if len(segments) > MAX_SYNTH_SEGMENTS:
        raise HTTPException(status_code=400, detail=f"Too many segments. Maximum is {MAX_SYNTH_SEGMENTS}.")
    target_language = request.get("target_language", "hi-IN")
    cloned_voice_id = request.get("cloned_voice_id")
    speaker_voices  = request.get("speaker_voices", {})   # { "Person 1": "lmnt_id" }
    results = []

    for seg in segments:
        translated_text = seg.get("translated_text") or seg.get("text", "")
        emotion = seg.get("emotion", "neutral")
        voice_info = seg.get("voice", {})
        speaker = voice_info.get("sarvam", DEFAULT_SPEAKER)
        gender = voice_info.get("gtts_gender", "female")
        spk_label = seg.get("speaker", "Person 1")

        # Resolve LMNT voice: per-speaker clone > single global clone > Sarvam
        lmnt_id = speaker_voices.get(spk_label) or cloned_voice_id

        audio_path = None
        try:
            if lmnt_id:
                audio_path = lmnt_service.synthesize(translated_text, lmnt_id, target_language)
            else:
                audio_path = text_to_speech_sarvam(translated_text, target_language, speaker)
        except Exception:
            try:
                gtts_lang = get_gtts_language_code(target_language)
                audio_path = text_to_speech_gtts(
                    translated_text, gtts_lang, emotion=emotion, gender=gender
                )
            except Exception as e:
                results.append({"speaker": seg.get("speaker"), "error": str(e)})
                continue

        if audio_path and os.path.exists(audio_path):
            with open(audio_path, "rb") as f:
                audio_b64 = base64.b64encode(f.read()).decode()
            os.remove(audio_path)
            results.append(
                {
                    "speaker": seg.get("speaker"),
                    "audio": audio_b64,
                    "emotion": emotion,
                }
            )

    return {"segments": results}


@router.post("/text-to-speech")
def handle_text_to_speech(request: TTSRequest):
    """
    Converts text to speech and returns an audio file.
    Uses gTTS by default, set use_sarvam=true for Sarvam AI TTS.
    """
    if not request.text or len(request.text.strip()) == 0:
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    if len(request.text) > 5000:
        raise HTTPException(
            status_code=400, detail="Text too long. Maximum 5000 characters."
        )

    try:
        logger.info(
            f"TTS request: language={request.language}, use_sarvam={request.use_sarvam}, speaker={request.speaker}"
        )

        if request.use_sarvam:
            temp_audio_path = text_to_speech_sarvam(
                text=request.text,
                language=request.language,
                speaker_gender=request.speaker,
            )
            logger.info(f"Sarvam TTS succeeded with speaker={request.speaker}")
        else:
            gtts_lang = get_gtts_language_code(request.language)
            temp_audio_path = text_to_speech_gtts(request.text, gtts_lang)
    except Exception as e:
        logger.error(f"TTS error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    return FileResponse(
        path=temp_audio_path,
        media_type="audio/wav" if request.use_sarvam else "audio/mpeg",
        filename="speech.wav" if request.use_sarvam else "speech.mp3",
        background=BackgroundTask(_remove, temp_audio_path),
    )
