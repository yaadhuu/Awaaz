"""Tests for Stage E2 live API endpoints, call limits, fallback shapes, and privacy."""

import io
import wave
from pathlib import Path

import pytest
import respx
from fastapi.testclient import TestClient

from tinytalk.api import app
from tinytalk.gnani import BASE_URL
from tinytalk.limits import LimitTracker


def make_dummy_wav(duration_s: float = 1.0, sample_rate: int = 16000) -> bytes:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sample_rate)
        w.writeframes(b"\x00\x00" * int(sample_rate * duration_s))
    return buf.getvalue()


@pytest.fixture
def client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> TestClient:
    test_db = tmp_path / "test_limits.sqlite"
    monkeypatch.setenv("TINYTALK_CONFIG", "config.yaml")
    monkeypatch.setattr("tinytalk.api.limit_tracker", lambda: LimitTracker(test_db))
    return TestClient(app)


def test_live_status(client: TestClient) -> None:
    r = client.get("/api/live/status")
    assert r.status_code == 200
    data = r.json()
    assert "live" in data
    assert "daily_calls_remaining" in data
    assert "cap_calls" in data
    assert "warn_level" in data


def test_review_summary(client: TestClient) -> None:
    r = client.get("/api/review/summary")
    assert r.status_code == 200
    data = r.json()
    assert "total_calls" in data
    assert "by_kind" in data
    assert "by_route" in data
    assert "by_status" in data
    # Verify no sensitive keys/ips exposed
    assert "key" not in data
    assert "ip" not in data


def test_live_reply_levels(client: TestClient) -> None:
    # L3: queued
    r = client.post("/api/live/reply", json={"text": "Flood warning for Aluva", "state": "L3"})
    assert r.status_code == 200
    data = r.json()
    assert data["state"] == "L3"
    assert data["status"] == "queued"
    assert data["bytes"] == 0

    # L2: critical facts packet
    r = client.post("/api/live/reply", json={"text": "Flood warning for Aluva. 50 people.", "state": "L2"})
    assert r.status_code == 200
    data = r.json()
    assert data["state"] == "L2"
    assert data["delivery_mode"] == "facts_only"
    assert data["bytes"] > 0
    assert "payload" in data

    # L1: packed text
    r = client.post("/api/live/reply", json={"text": "Flood warning for Aluva", "state": "L1"})
    assert r.status_code == 200
    data = r.json()
    assert data["state"] == "L1"
    assert data["delivery_mode"] == "transcript"
    assert data["bytes"] > 0

    # L0 in replay mode falls back to saved sample
    r = client.post("/api/live/reply", json={"text": "Flood warning for Aluva", "state": "L0"})
    assert r.status_code == 200
    data = r.json()
    assert data["source"] == "saved"
    assert "captions" in data


def test_live_readback_replay(client: TestClient) -> None:
    facts = {
        "places": ["aluva"],
        "numbers": [{"value": 50, "unit": "people"}],
        "times": [{"hour": 6, "period": "pm"}],
    }
    r = client.post("/api/live/readback", json={"facts": facts})
    assert r.status_code == 200
    data = r.json()
    assert data["source"] == "saved"
    assert data["status"] == "Confirmed"
    assert data["match"] is True

    # Altered fact check
    altered = {
        "places": ["kochi"],
        "numbers": [{"value": 50, "unit": "people"}],
        "times": [{"hour": 6, "period": "pm"}],
    }
    r = client.post("/api/live/readback", json={"facts": facts, "altered_fact": altered})
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "Check"
    assert data["match"] is False
    assert len(data["mismatches"]) > 0


def test_live_report_l3_queued(client: TestClient) -> None:
    r = client.post("/api/live/report", data={"state": "L3"})
    assert r.status_code == 200
    data = r.json()
    assert data["state"] == "L3"
    assert data["status"] == "queued"
    assert data["gnani_calls"] == 0


def test_live_report_fallback_shape(client: TestClient) -> None:
    # Without LIVE=1, should return saved fallback with standard shape
    wav_bytes = make_dummy_wav(1.0)
    r = client.post(
        "/api/live/report",
        data={"state": "L0", "mode": "relay"},
        files={"audio_file": ("test.wav", wav_bytes, "audio/wav")},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["source"] == "saved"
    assert "transcript" in data
    assert "facts" in data
    assert "bytes" in data
    assert "packets" in data
    assert "gnani_calls" in data
    assert data["gnani_calls"] == 0


def test_live_report_on_device_mode(client: TestClient) -> None:
    r = client.post("/api/live/report", data={"state": "L1", "mode": "on_device"})
    assert r.status_code == 200
    data = r.json()
    assert data["mode"] == "ASSUMPTION, UNTESTED"


@respx.mock
def test_live_report_with_mocked_gnani(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("LIVE", "1")
    monkeypatch.setenv("GNANI_API_KEY", "test_key_xyz")
    respx.post(f"{BASE_URL}/stt/v3").respond(
        200,
        json={"success": True, "transcript": "Flood warning for Aluva. 50 people.", "model": "prisma-v3.0"},
    )

    wav_bytes = make_dummy_wav(1.0)
    r = client.post(
        "/api/live/report",
        data={"state": "L0", "mode": "relay", "language_hint": "en-IN"},
        files={"audio_file": ("test.wav", wav_bytes, "audio/wav")},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["source"] == "live"
    assert data["transcript"] == "Flood warning for Aluva. 50 people."
    assert "aluva" in data["facts"]["places"]
    assert data["gnani_calls"] == 1


def test_audio_limits_enforced(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("LIVE", "1")
    # File too large (> 5MB)
    huge = b"RIFF" + (b"\x00" * 5000005)
    r = client.post(
        "/api/live/report",
        data={"state": "L0"},
        files={"audio_file": ("test.wav", huge, "audio/wav")},
    )
    assert r.status_code == 413
