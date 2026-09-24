"""
e2n_router.py — English-to-Native session & translation endpoints.
POST /api/english-to-native/session                → Create E2N session
POST /api/english-to-native/translation            → Save a translation within a session
GET  /api/english-to-native/sessions/{user_id}     → Get all E2N sessions for a user

All endpoints require a Clerk token; the owner is always the token's user.
"""
import logging
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session, selectinload

from database import get_session
from models import EnglishToNativeSession, EnglishToNativeTranslation
from services.clerk_auth import get_current_user_id

router = APIRouter(prefix="/api/english-to-native", tags=["english-to-native"])
logger = logging.getLogger(__name__)


class CreateE2NSessionRequest(BaseModel):
    user_id: Optional[str] = None  # accepted for older clients; ignored
    target_language: str
    original_language: str = "en-IN"


class AddE2NTranslationRequest(BaseModel):
    session_id: str
    input_text: str = ""
    translated_text: str = ""


@router.post("/session")
def create_e2n_session(
    request: CreateE2NSessionRequest,
    db: Session = Depends(get_session),
    user_id: str = Depends(get_current_user_id),
):
    """Create a new English-to-Native session owned by the caller."""
    if not request.target_language:
        raise HTTPException(status_code=400, detail="target_language is required")

    try:
        session = EnglishToNativeSession(
            id=str(uuid4()),
            user_id=user_id,
            original_language=request.original_language,
            target_language=request.target_language,
        )
        db.add(session)
        db.commit()
        return {"status": "success", "session_id": session.id}
    except Exception as e:
        db.rollback()
        logger.error(f"Error saving E2N session: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Database save failed")


@router.post("/translation")
def add_e2n_translation(
    request: AddE2NTranslationRequest,
    db: Session = Depends(get_session),
    user_id: str = Depends(get_current_user_id),
):
    """Save a translation within one of the caller's E2N sessions."""
    owned = (
        db.query(EnglishToNativeSession.id)
        .filter(EnglishToNativeSession.id == request.session_id, EnglishToNativeSession.user_id == user_id)
        .first()
    )
    if not owned:
        raise HTTPException(status_code=404, detail="Session not found")

    try:
        translation = EnglishToNativeTranslation(
            id=str(uuid4()),
            session_id=request.session_id,
            input_text=request.input_text,
            translated_text=request.translated_text,
        )
        db.add(translation)
        db.commit()
        return {"status": "success", "translation_id": translation.id}
    except Exception as e:
        db.rollback()
        logger.error(f"Error saving E2N translation: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Database save failed")


@router.get("/sessions/{user_id}")
def get_e2n_sessions(
    user_id: str,
    db: Session = Depends(get_session),
    current_user_id: str = Depends(get_current_user_id),
):
    """Get all English-to-Native sessions for the caller."""
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    sessions = (
        db.query(EnglishToNativeSession)
        .options(selectinload(EnglishToNativeSession.translations))
        .filter(EnglishToNativeSession.user_id == user_id)
        .order_by(EnglishToNativeSession.created_at.desc())
        .all()
    )

    result = [
        {
            "id": session.id,
            "original_language": session.original_language,
            "target_language": session.target_language,
            "created_at": session.created_at.isoformat() if session.created_at else None,
            "translations_count": len(session.translations),
            "translations": [
                {
                    "id": t.id,
                    "input_text": t.input_text,
                    "translated_text": t.translated_text,
                    "created_at": t.created_at.isoformat() if t.created_at else None,
                }
                for t in session.translations
            ],
        }
        for session in sessions
    ]

    return {"status": "success", "sessions": result}
