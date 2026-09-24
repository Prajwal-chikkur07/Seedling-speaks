"""Tests for audio/diarization/TTS endpoints and translation failure paths. External APIs are mocked."""
import os
import time
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from main import app
from routers import audio_router, video_router
from services import diarization_service, sarvam_client
from services.tts_service import FEMALE_VOICES, MALE_VOICES, VALID_SPEAKERS

client = TestClient(app)


def test_diarization_voices_are_valid_sarvam_speakers():
    assert set(MALE_VOICES + FEMALE_VOICES) <= VALID_SPEAKERS
    assert audio_router.TTSRequest(text="x").speaker in VALID_SPEAKERS


def test_diarize_audio_runs_audio_diarization_while_file_exists():
    seen = {}

    def fake_diarize_audio_file(path, transcript):
        seen["existed"] = os.path.exists(path)
        seen["path"] = path
        return [{"speaker": "Person 1", "text": transcript, "emotion": "neutral", "start": 0, "end": 1}]

    with patch.object(diarization_service, "diarize_audio_file", side_effect=fake_diarize_audio_file):
        resp = client.post(
            "/api/diarize-audio",
            files={"file": ("a.webm", b"fake-audio", "audio/webm")},
            data={"transcript": "Hello there."},
        )

    assert resp.status_code == 200
    body = resp.json()
    assert body["method"] == "audio"
    assert seen["existed"] is True
    assert not os.path.exists(seen["path"])
    assert body["segments"][0]["voice"]["sarvam"] in VALID_SPEAKERS


def test_diarize_audio_falls_back_to_sentence_split_without_gemini():
    with patch.object(diarization_service, "GEMINI_API_KEY", None):
        resp = client.post("/api/diarize-audio", data={"transcript": "Hi. Hello. How are you?", "speaker_count": "2"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["method"] == "fallback"
    assert [s["speaker"] for s in body["segments"]] == ["Person 1", "Person 2", "Person 1"]
    # Alternating speakers get different genders, so different voices.
    assert body["segments"][0]["voice"]["sarvam"] != body["segments"][1]["voice"]["sarvam"]


def test_diarize_audio_uses_gemini_split():
    parsed = [
        {"speaker": "Person 1", "text": "Hi", "emotion": "happy"},
        {"speaker": "Person 9", "text": "Hello", "emotion": "neutral"},
        {"speaker": "Person 2", "text": "", "emotion": "neutral"},
    ]
    with patch.object(diarization_service, "GEMINI_API_KEY", "k"), \
         patch.object(diarization_service, "generate_json", return_value=parsed):
        resp = client.post("/api/diarize-audio", data={"transcript": "Hi Hello"})
    body = resp.json()
    assert body["method"] == "gemini"
    assert [s["speaker"] for s in body["segments"]] == ["Person 1", "Person 5"]


def test_upload_over_limit_returns_413_and_cleans_up():
    before = set(os.listdir(audio_router.TEMP_AUDIO_DIR)) if audio_router.TEMP_AUDIO_DIR.exists() else set()
    with patch.object(audio_router, "MAX_UPLOAD_SIZE", 4):
        resp = client.post("/api/diarize-audio", files={"file": ("a.webm", b"0123456789", "audio/webm")})
    assert resp.status_code == 413
    assert set(os.listdir(audio_router.TEMP_AUDIO_DIR)) == before


def test_synthesize_conversation_caps_segments():
    segments = [{"text": "x"}] * (audio_router.MAX_SYNTH_SEGMENTS + 1)
    resp = client.post("/api/synthesize-conversation", json={"segments": segments})
    assert resp.status_code == 400


def test_text_to_speech_deletes_temp_file_after_response(tmp_path):
    audio = tmp_path / "speech.mp3"
    audio.write_bytes(b"ID3fake")
    with patch.object(audio_router, "text_to_speech_gtts", return_value=str(audio)):
        resp = client.post("/api/text-to-speech", json={"text": "hello"})
    assert resp.status_code == 200
    assert resp.content == b"ID3fake"
    assert not audio.exists()


def test_translate_single_raises_when_all_providers_fail():
    with patch.object(sarvam_client, "get_cached", return_value=None), \
         patch.object(sarvam_client, "SARVAM_API_KEY", None), \
         patch.object(sarvam_client, "gemini_translate_text", side_effect=Exception("down")):
        with pytest.raises(sarvam_client.TranslationError):
            sarvam_client._translate_single("Hello", "en-IN", "hi-IN")


def test_prune_jobs_drops_old_finished_jobs_and_files(tmp_path):
    video = tmp_path / "v.mp4"
    srt = tmp_path / "v.srt"
    video.write_bytes(b"v")
    srt.write_text("1")
    old = time.time() - video_router.JOB_TTL_SECONDS - 1
    video_router._jobs.update({
        "old": {"status": "done", "path": str(video), "result": {"srt_path": str(srt)}, "updated_at": old},
        "running": {"status": "processing", "path": "", "result": None, "updated_at": old},
    })
    try:
        video_router._prune_jobs()
        assert "old" not in video_router._jobs
        assert "running" in video_router._jobs
        assert not video.exists() and not srt.exists()
    finally:
        video_router._jobs.pop("old", None)
        video_router._jobs.pop("running", None)
