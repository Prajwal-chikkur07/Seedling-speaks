"""Tests for /api/auth endpoints."""
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import sys, os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from main import app

client = TestClient(app)


def _mock_db_session():
    """Return a mock that satisfies the SQLAlchemy session interface."""
    session = MagicMock()
    session.query.return_value.filter.return_value.first.return_value = None
    return session


def test_sync_user_rejects_invalid_email():
    resp = client.post(
        "/api/auth/sync-user",
        json={"id": "u1", "email": "not-an-email"},
        headers={"Authorization": "Bearer fake-token"},
    )
    assert resp.status_code == 422


def test_check_user_exists_not_found():
    with patch("routers.auth_router.SessionLocal", return_value=_mock_db_session()):
        resp = client.get("/api/auth/check-user?email=new@example.com")
    assert resp.status_code == 200
    assert resp.json()["exists"] is False


def test_check_user_exists_found():
    mock_user = MagicMock()
    mock_user.email = "existing@example.com"
    session = MagicMock()
    session.__enter__ = MagicMock(return_value=session)
    session.__exit__ = MagicMock(return_value=False)
    session.query.return_value.filter.return_value.first.return_value = mock_user

    with patch("routers.auth_router.SessionLocal", return_value=session):
        resp = client.get("/api/auth/check-user?email=existing@example.com")
    assert resp.status_code == 200
    assert resp.json()["exists"] is True
