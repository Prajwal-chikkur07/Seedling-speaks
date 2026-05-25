"""Tests for health check and cache management endpoints."""
from fastapi.testclient import TestClient
from unittest.mock import patch
import sys, os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from main import app

client = TestClient(app)


def test_health_check_returns_ok():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_cache_stats_returns_dict():
    with patch("main.get_stats", return_value={"total": 0, "hits": 0}):
        response = client.get("/api/cache/stats")
    assert response.status_code == 200
    data = response.json()
    assert "total" in data or isinstance(data, dict)


def test_cache_clear_all():
    with patch("main.clear_cache", return_value=5) as mock_clear:
        response = client.delete("/api/cache/clear")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "cleared"
    assert body["lang"] == "all"
    mock_clear.assert_called_once_with(None)


def test_cache_clear_single_language():
    with patch("main.clear_cache", return_value=2) as mock_clear:
        response = client.delete("/api/cache/clear?lang=hi-IN")
    assert response.status_code == 200
    body = response.json()
    assert body["lang"] == "hi-IN"
    mock_clear.assert_called_once_with("hi-IN")
