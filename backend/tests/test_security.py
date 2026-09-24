"""Protected routes reject requests without a valid Clerk token."""
import pytest
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)

PROTECTED = [
    ("get", "/api/auth/me", None),
    ("patch", "/api/auth/consent", {"consent_given": True}),
    ("post", "/api/auth/sync-user", {"email": "a@example.com"}),
    ("get", "/api/auth/check-user?email=a@example.com", None),
    ("post", "/api/native-to-english/session", {}),
    ("post", "/api/native-to-english/transcription", {"session_id": "s"}),
    ("get", "/api/native-to-english/sessions/u", None),
    ("post", "/api/english-to-native/session", {"target_language": "hi-IN"}),
    ("post", "/api/english-to-native/translation", {"session_id": "s"}),
    ("get", "/api/english-to-native/sessions/u", None),
    ("post", "/api/send/email", {"text": "hi", "to_email": "a@example.com"}),
    ("post", "/api/send/linkedin", {"text": "hi"}),
    ("post", "/api/share/create", {"text": "hi"}),
    ("delete", "/api/cache/clear", None),
]


@pytest.mark.parametrize("method,path,body", PROTECTED)
def test_protected_route_requires_token(unauthenticated, method, path, body):
    kwargs = {"json": body} if body is not None else {}
    resp = getattr(client, method)(path, **kwargs)
    assert resp.status_code == 401


def test_share_link_read_stays_public(unauthenticated):
    assert client.get("/api/share/doesnotexist").status_code == 404
