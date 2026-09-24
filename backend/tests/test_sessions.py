"""Ownership checks for native-to-english and english-to-native session endpoints."""
from fastapi.testclient import TestClient

import database
from main import app
from models import EnglishToNativeSession, NativeToEnglishSession
from tests.conftest import TEST_USER_ID

client = TestClient(app)


def test_n2e_create_ignores_body_user_id():
    resp = client.post(
        "/api/native-to-english/session",
        json={"user_id": "attacker_target", "original_language": "hi-IN", "original_text": "x"},
    )
    assert resp.status_code == 200
    db = database.SessionLocal()
    session = db.get(NativeToEnglishSession, resp.json()["session_id"])
    assert session.user_id == TEST_USER_ID
    db.close()


def test_e2n_create_ignores_body_user_id():
    resp = client.post(
        "/api/english-to-native/session",
        json={"user_id": "attacker_target", "target_language": "hi-IN"},
    )
    assert resp.status_code == 200
    db = database.SessionLocal()
    assert db.get(EnglishToNativeSession, resp.json()["session_id"]).user_id == TEST_USER_ID
    db.close()


def test_get_sessions_for_other_user_forbidden():
    assert client.get("/api/native-to-english/sessions/other_user").status_code == 403
    assert client.get("/api/english-to-native/sessions/other_user").status_code == 403


def test_get_own_sessions_includes_children():
    sid = client.post("/api/native-to-english/session", json={"original_text": "a"}).json()["session_id"]
    client.post("/api/native-to-english/transcription", json={"session_id": sid, "original_transcript": "t1"})
    client.post("/api/native-to-english/transcription", json={"session_id": sid, "original_transcript": "t2"})

    resp = client.get(f"/api/native-to-english/sessions/{TEST_USER_ID}")
    assert resp.status_code == 200
    sessions = resp.json()["sessions"]
    assert len(sessions) == 1
    assert [t["original_transcript"] for t in sessions[0]["transcriptions"]] == ["t1", "t2"]


def test_add_child_to_someone_elses_session_is_404():
    db = database.SessionLocal()
    db.add(NativeToEnglishSession(id="n2e-other", user_id="other_user", original_language="hi-IN"))
    db.add(EnglishToNativeSession(id="e2n-other", user_id="other_user", target_language="hi-IN"))
    db.commit()
    db.close()

    resp = client.post(
        "/api/native-to-english/transcription",
        json={"session_id": "n2e-other", "original_transcript": "x"},
    )
    assert resp.status_code == 404
    resp = client.post(
        "/api/english-to-native/translation",
        json={"session_id": "e2n-other", "input_text": "x", "translated_text": "y"},
    )
    assert resp.status_code == 404
