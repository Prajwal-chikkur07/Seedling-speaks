"""Tests for /api/translate-text endpoint."""
from fastapi.testclient import TestClient
from unittest.mock import patch
import sys, os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from main import app

client = TestClient(app)

TRANSLATE_URL = "/api/translate-text"


def post(payload):
    return client.post(TRANSLATE_URL, json=payload)


def test_empty_text_returns_400():
    resp = post({"text": "", "source_language": "hi-IN", "target_language": "en-IN"})
    assert resp.status_code == 400
    assert "empty" in resp.json()["detail"].lower()


def test_whitespace_only_text_returns_400():
    resp = post({"text": "   ", "source_language": "hi-IN", "target_language": "en-IN"})
    assert resp.status_code == 400


def test_same_source_and_target_returns_original():
    resp = post({"text": "Hello", "source_language": "en-IN", "target_language": "en-IN"})
    assert resp.status_code == 200
    assert resp.json()["translated_text"] == "Hello"


def test_successful_translation():
    with patch(
        "routers.translation_router.translate_text",
        return_value="नमस्ते",
    ):
        resp = post({"text": "Hello", "source_language": "en-IN", "target_language": "hi-IN"})
    assert resp.status_code == 200
    assert resp.json()["translated_text"] == "नमस्ते"


def test_translation_service_error_returns_original_text():
    with patch(
        "routers.translation_router.translate_text",
        side_effect=Exception("Sarvam API unreachable"),
    ):
        resp = post({"text": "Hello", "source_language": "en-IN", "target_language": "hi-IN"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["translated_text"] == "Hello"
    assert "error" in data
