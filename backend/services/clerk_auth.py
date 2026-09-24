"""
clerk_auth.py — Verifies Clerk session JWTs and exposes FastAPI auth dependencies.

Clients send `Authorization: Bearer <Clerk session token>`. The token's signature is
checked against Clerk's JWKS, so the `sub` claim (the Clerk user id) can be trusted.

Config (one of):
  CLERK_JWKS_URL          e.g. https://<your-app>.clerk.accounts.dev/.well-known/jwks.json
  CLERK_PUBLISHABLE_KEY   pk_test_/pk_live_ key; the JWKS URL is derived from it
Optional:
  CLERK_AUTHORIZED_PARTIES  comma-separated origins allowed in the `azp` claim
"""
import base64
import os
from functools import lru_cache
from typing import Optional

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

_bearer = HTTPBearer(auto_error=False)


def _jwks_url() -> str:
    url = os.getenv("CLERK_JWKS_URL", "").strip()
    if url:
        return url
    pk = os.getenv("CLERK_PUBLISHABLE_KEY", "").strip()
    if pk.startswith(("pk_test_", "pk_live_")):
        # Publishable key = prefix + base64("<frontend-api-host>$")
        encoded = pk.split("_", 2)[2]
        host = base64.b64decode(encoded + "=" * (-len(encoded) % 4)).decode().rstrip("$")
        return f"https://{host}/.well-known/jwks.json"
    raise RuntimeError("Set CLERK_JWKS_URL or CLERK_PUBLISHABLE_KEY to verify Clerk tokens")


@lru_cache(maxsize=1)
def _jwks_client() -> jwt.PyJWKClient:
    # PyJWKClient caches keys and refetches on unknown `kid` (key rotation).
    return jwt.PyJWKClient(_jwks_url(), cache_keys=True, timeout=10)


def verify_clerk_token(token: str) -> dict:
    """Return the verified claims, or raise HTTPException(401)."""
    try:
        key = _jwks_client().get_signing_key_from_jwt(token).key
        claims = jwt.decode(token, key, algorithms=["RS256"], leeway=10)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    parties = [p.strip() for p in os.getenv("CLERK_AUTHORIZED_PARTIES", "").split(",") if p.strip()]
    if parties and claims.get("azp") not in parties:
        raise HTTPException(status_code=401, detail="Token not issued for this app")
    if not claims.get("sub"):
        raise HTTPException(status_code=401, detail="Token has no subject")
    return claims


def get_current_user_id(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
) -> str:
    """FastAPI dependency: the verified Clerk user id. 401 if missing/invalid."""
    if credentials is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return verify_clerk_token(credentials.credentials)["sub"]


def get_current_claims(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
) -> dict:
    """FastAPI dependency: all verified claims (use when you need email etc.)."""
    if credentials is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return verify_clerk_token(credentials.credentials)
