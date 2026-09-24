"""
session_router.py — Native-to-English session CRUD endpoints.
POST /api/native-to-english/session              → Create session
POST /api/native-to-english/transcription         → Add transcription to session
GET  /api/native-to-english/sessions/{user_id}    → Get all sessions for user

All endpoints require a Clerk token; the owner is always the token's user.
"""
import logging
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session, selectinload

from database import get_session
from models import NativeToEnglishSession, NativeToEnglishTranscription
from services.clerk_auth import get_current_user_id

router = APIRouter(prefix="/api/native-to-english", tags=["sessions"])
logger = logging.getLogger(__name__)


class CreateSessionRequest(BaseModel):
    user_id: Optional[str] = None  # accepted for older clients; ignored
    original_language: str = "hi-IN"
    original_text: Optional[str] = None
    translated_text: Optional[str] = None


class AddTranscriptionRequest(BaseModel):
    session_id: str
    original_transcript: str = ""
    tone_applied: Optional[str] = None
    rewritten_text: Optional[str] = None
    custom_tone_desc: Optional[str] = None
    confidence_score: Optional[float] = None


@router.post("/session")
def create_n2e_session(
    request: CreateSessionRequest,
    db: Session = Depends(get_session),
    user_id: str = Depends(get_current_user_id),
):
    """Create a new Native to English session owned by the caller."""
    try:
        session = NativeToEnglishSession(
            id=str(uuid4()),
            user_id=user_id,
            original_language=request.original_language,
            target_language="en-IN",
            original_text=request.original_text,
            translated_text=request.translated_text,
        )
        db.add(session)
        db.commit()
        return {"status": "success", "session_id": session.id}
    except Exception as e:
        db.rollback()
        logger.error(f"Error saving N2E session: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Database save failed")


@router.post("/transcription")
def add_n2e_transcription(
    request: AddTranscriptionRequest,
    db: Session = Depends(get_session),
    user_id: str = Depends(get_current_user_id),
):
    """Add a transcription to one of the caller's sessions."""
    owned = (
        db.query(NativeToEnglishSession.id)
        .filter(NativeToEnglishSession.id == request.session_id, NativeToEnglishSession.user_id == user_id)
        .first()
    )
    if not owned:
        raise HTTPException(status_code=404, detail="Session not found")

    try:
        transcription = NativeToEnglishTranscription(
            id=str(uuid4()),
            session_id=request.session_id,
            original_transcript=request.original_transcript,
            tone_applied=request.tone_applied,
            rewritten_text=request.rewritten_text,
            custom_tone_desc=request.custom_tone_desc,
            was_toned=bool(request.tone_applied),
            confidence_score=request.confidence_score,
        )
        db.add(transcription)
        db.commit()
        return {"status": "success", "transcription_id": transcription.id}
    except Exception as e:
        db.rollback()
        logger.error(f"Error saving N2E transcription: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Database save failed")


@router.get("/sessions/{user_id}")
def get_n2e_sessions(
    user_id: str,
    db: Session = Depends(get_session),
    current_user_id: str = Depends(get_current_user_id),
):
    """Get all Native to English sessions for the caller."""
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    sessions = (
        db.query(NativeToEnglishSession)
        .options(selectinload(NativeToEnglishSession.transcriptions))
        .filter(NativeToEnglishSession.user_id == user_id)
        .order_by(NativeToEnglishSession.created_at.desc())
        .all()
    )

    result = [
        {
            "id": session.id,
            "original_language": session.original_language,
            "target_language": session.target_language,
            "original_text": session.original_text,
            "translated_text": session.translated_text,
            "created_at": session.created_at.isoformat(),
            "transcriptions_count": len(session.transcriptions),
            "transcriptions": [
                {
                    "id": t.id,
                    "original_transcript": t.original_transcript,
                    "tone_applied": t.tone_applied,
                    "rewritten_text": t.rewritten_text,
                    "was_toned": t.was_toned,
                    "confidence_score": t.confidence_score,
                }
                for t in session.transcriptions
            ],
        }
        for session in sessions
    ]

    return {"status": "success", "sessions": result}
