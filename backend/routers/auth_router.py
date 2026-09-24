"""
Auth router — Clerk OAuth integration with /api/auth/sync-user endpoint
User data is synced to Neon PostgreSQL on Clerk signup completion.
"""
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, field_validator, field_serializer
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from database import get_session
from models import User
from services.clerk_auth import get_current_user_id

router = APIRouter(prefix="/api/auth", tags=["auth"])
logger = logging.getLogger(__name__)

# ── Request / Response models ─────────────────────────────────────────────────
class SyncUserRequest(BaseModel):
    """Request body when frontend syncs Clerk user to database after signup"""
    id: Optional[str] = None         # Clerk user ID; ignored except for a match check against the token
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    avatar_url: Optional[str] = None
    consent_given: bool = False      # GDPR consent

    @field_validator("email")
    @classmethod
    def email_valid(cls, v):
        if "@" not in v or "." not in v.split("@")[-1]:
            raise ValueError("Invalid email address")
        return v.lower().strip()

class UserResponse(BaseModel):
    id: str
    email: str
    first_name: Optional[str]
    last_name: Optional[str]
    avatar_url: Optional[str]
    created_at: Optional[datetime] = None
    consent_given: bool = False
    consent_timestamp: Optional[datetime] = None

    class Config:
        from_attributes = True

    @field_serializer('created_at', 'consent_timestamp')
    def serialize_dt(self, value, _info):
        return value.isoformat() if value else None

class ConsentUpdateRequest(BaseModel):
    consent_given: bool

# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/sync-user", response_model=UserResponse)
def sync_user(
    req: SyncUserRequest,
    db: Session = Depends(get_session),
    user_id: str = Depends(get_current_user_id),
):
    """
    Sync Clerk user data to Neon database.
    Called from frontend after Clerk signup completes.
    Creates user if doesn't exist; updates if already exists.
    The user id always comes from the verified token; a body id is only checked for consistency.
    """
    if req.id and req.id != user_id:
        raise HTTPException(status_code=403, detail="User id does not match token")

    try:
        logger.info("Syncing user %s", user_id)

        # Check if user exists
        existing_user = db.query(User).filter(User.id == user_id).first()

        if existing_user:
            # Update existing user
            existing_user.email = req.email
            existing_user.first_name = req.first_name
            existing_user.last_name = req.last_name
            existing_user.avatar_url = req.avatar_url
            # Only update consent if explicitly provided as True (don't overwrite existing consent)
            if req.consent_given and not existing_user.consent_given:
                existing_user.consent_given = True
                existing_user.consent_timestamp = datetime.now(timezone.utc)
            db.commit()
            db.refresh(existing_user)
            return existing_user
        else:
            # Create new user
            logger.info("Creating new user %s", user_id)
            new_user = User(
                id=user_id,
                email=req.email,
                first_name=req.first_name,
                last_name=req.last_name,
                avatar_url=req.avatar_url,
                consent_given=req.consent_given,
                consent_timestamp=datetime.now(timezone.utc) if req.consent_given else None,
            )
            db.add(new_user)
            db.commit()
            db.refresh(new_user)
            return new_user
    except Exception:
        db.rollback()
        logger.exception("Failed to sync user %s", user_id)
        raise HTTPException(status_code=500, detail="Failed to sync user")


@router.get("/me", response_model=UserResponse)
def get_me(db: Session = Depends(get_session), user_id: str = Depends(get_current_user_id)):
    """Get the current authenticated user."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found in database")
    return user


@router.patch("/consent", response_model=UserResponse)
def update_consent(
    req: ConsentUpdateRequest,
    db: Session = Depends(get_session),
    user_id: str = Depends(get_current_user_id),
):
    """Update GDPR consent for the authenticated user."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    try:
        user.consent_given = req.consent_given
        user.consent_timestamp = datetime.now(timezone.utc)
        db.commit()
        db.refresh(user)
        return user
    except Exception:
        db.rollback()
        logger.exception("Failed to update consent for %s", user_id)
        raise HTTPException(status_code=500, detail="Failed to update consent")


@router.get("/check-user")
def check_user_exists(
    email: str,
    db: Session = Depends(get_session),
    _user_id: str = Depends(get_current_user_id),
):
    """
    Check if a user with the given email already exists.
    Used during signup (after Clerk sign-in) to prevent duplicate accounts.
    Requires auth so it can't be used anonymously to enumerate emails.
    Returns {"exists": true/false}
    """
    try:
        user = db.query(User).filter(User.email == email.lower().strip()).first()
    except Exception:
        logger.exception("check-user lookup failed")
        raise HTTPException(status_code=500, detail="Database error")
    if user:
        return {"exists": True, "message": "User already exists"}
    return {"exists": False, "message": "User not found"}
