"""Tests for /api/auth endpoints."""
from fastapi.testclient import TestClient

import database
from main import app
from models import User
from tests.conftest import TEST_USER_ID

client = TestClient(app)


def _add_user(user_id, email):
    db = database.SessionLocal()
    db.add(User(id=user_id, email=email))
    db.commit()
    db.close()


def test_sync_user_rejects_invalid_email():
    resp = client.post("/api/auth/sync-user", json={"id": TEST_USER_ID, "email": "not-an-email"})
    assert resp.status_code == 422


def test_sync_user_uses_token_sub():
    resp = client.post("/api/auth/sync-user", json={"email": "a@example.com", "first_name": "A"})
    assert resp.status_code == 200
    assert resp.json()["id"] == TEST_USER_ID

    db = database.SessionLocal()
    assert db.query(User).filter(User.id == TEST_USER_ID).one().email == "a@example.com"
    db.close()


def test_sync_user_rejects_mismatched_body_id():
    resp = client.post("/api/auth/sync-user", json={"id": "someone_else", "email": "a@example.com"})
    assert resp.status_code == 403
    db = database.SessionLocal()
    assert db.query(User).count() == 0
    db.close()


def test_me_returns_token_user():
    _add_user(TEST_USER_ID, "me@example.com")
    _add_user("other", "other@example.com")
    resp = client.get("/api/auth/me")
    assert resp.status_code == 200
    assert resp.json()["email"] == "me@example.com"


def test_check_user_exists_not_found():
    resp = client.get("/api/auth/check-user?email=new@example.com")
    assert resp.status_code == 200
    assert resp.json()["exists"] is False


def test_check_user_exists_found():
    _add_user("u2", "existing@example.com")
    resp = client.get("/api/auth/check-user?email=Existing@example.com")
    assert resp.status_code == 200
    assert resp.json()["exists"] is True
