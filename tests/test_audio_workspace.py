"""Exercise actual codecs and API ownership/caps, while replacing only the paid model call."""

import base64
import copy
import hashlib
import io
import wave
from pathlib import Path
from typing import Any

import numpy as np
import pytest
import respx
from fastapi.testclient import TestClient

from tinytalk import api, codec
from tinytalk.audio_workspace import AudioSettings, _clips, process_audio
from tinytalk.gnani import BASE_URL, Gnani
from tinytalk.limits import LimitTracker


def speech_like_wav(seconds: float = 1.5) -> bytes:
    t = np.arange(int(16000 * seconds)) / 16000
    signal = ((np.sin(2 * np.pi * 430 * t) + 0.4 * np.sin(2 * np.pi * 2300 * t)) * 12000).astype(
        np.int16
    )
    return codec.pcm_to_wav(signal, 16000)


@pytest.fixture
def client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> TestClient:
    settings = copy.deepcopy(api.cfg())
    settings["live"].update(per_visitor_daily=4, per_ip_per_minute=99)
    monkeypatch.setattr(api, "cfg", lambda: settings)
    tracker = LimitTracker(tmp_path / "limits.sqlite")
    monkeypatch.setattr(api, "limit_tracker", lambda: tracker)
    monkeypatch.setattr(api, "_cap_check", lambda *a, **k: None)
    monkeypatch.setenv("LIVE", "1")
    monkeypatch.setenv("AWAAZ_PUBLIC_LIVE", "1")
    monkeypatch.setenv("GNANI_API_KEY", "test-key-never-transmitted")
    _clips.clear()
    return TestClient(api.app)


def upload(client: TestClient, **options: Any) -> dict[str, Any]:
    response = client.post(
        "/api/audio/process",
        data=options,
        files={"audio_file": ("voice.wav", speech_like_wav(), "audio/wav")},
    )
    assert response.status_code == 200, response.text
    return dict(response.json())


def test_pcm_settings_and_loss_change_real_waveform_and_size() -> None:
    pcm, rate = codec.wav_to_pcm(speech_like_wav())
    clear, meta = process_audio(pcm, rate, AudioSettings())
    low, low_meta = process_audio(pcm, rate, AudioSettings(sample_rate=8000, bit_depth=8))
    broken, broken_meta = process_audio(pcm, rate, AudioSettings(loss_percent=60))
    assert low_meta["encoded_bytes"] == meta["encoded_bytes"] // 4
    assert len({hashlib.sha256(x).hexdigest() for x in (clear, low, broken)}) == 3
    assert broken_meta["lost_chunks"] > 0
    assert meta["lost_chunks"] == 0
    with wave.open(io.BytesIO(low)) as w:
        assert w.getframerate() == 8000
    assert abs(low_meta["duration_seconds"] - meta["duration_seconds"]) < 0.01


@pytest.mark.parametrize("mode", ["codec2", "opus"])
def test_compressed_audio_really_encodes_and_decodes(mode: str) -> None:
    pcm, rate = codec.wav_to_pcm(speech_like_wav())
    wav, meta = process_audio(pcm, rate, AudioSettings(codec=mode, loss_percent=30))  # type: ignore[arg-type]
    decoded, decoded_rate = codec.wav_to_pcm(wav)
    assert len(decoded) > 0
    assert meta["encoded_bytes"] < len(pcm) * 2
    assert meta["lost_chunks"] > 0
    assert decoded_rate == (8000 if mode == "codec2" else 16000)
    if mode == "opus":
        assert "after decoding" in meta["loss_model"]


def test_processing_is_free_cached_and_private_to_cookie(client: TestClient) -> None:
    before = client.get("/api/audio/status").json()["remaining"]
    first = upload(client, sample_rate="16000", bit_depth="16", bitrate_kbps="12", codec_name="pcm")
    again = upload(client)
    assert first["clip_id"] == again["clip_id"]
    assert first["audio_b64"] == again["audio_b64"]
    assert client.get("/api/audio/status").json()["remaining"] == before
    assert client.cookies.get("awaaz_visitor")
    other = TestClient(api.app)
    result = other.post("/api/audio/transcribe", json={"clip_id": first["clip_id"]})
    assert result.status_code == 404


def test_prisma_receives_processed_audio_all_languages_and_four_try_cap(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    sent_audio = []

    class Model:
        def stt(self, wav: bytes, langs: list[str], fmt: str, **kwargs: Any) -> dict[str, Any]:
            assert kwargs["use_cache"] is False
            sent_audio.append(wav)
            return {
                "transcript": "ಕನ್ನಡದಲ್ಲಿ ಸಹಾಯ ಬೇಕು",
                "model": "prisma-v3.0",
                "detected_language_code": langs[0],
            }

    monkeypatch.setattr(api, "gnani", lambda: Model())
    monkeypatch.setattr(api, "spend", lambda _estimate, call: call())
    first = upload(client, loss_percent=30)
    for i, language in enumerate(["kn-IN", "bn-IN", "ta-IN", "te-IN"]):
        response = client.post(
            "/api/audio/transcribe", json={"clip_id": first["clip_id"], "language": language}
        )
        assert response.status_code == 200, response.text
        assert response.json()["remaining"] == 3 - i
        assert response.json()["source"] == "gnani_live"
        assert sent_audio[-1] == base64.b64decode(first["audio_b64"])
    reused = client.post(
        "/api/audio/transcribe", json={"clip_id": first["clip_id"], "language": "kn-IN"}
    )
    assert reused.json()["reused"] and len(sent_audio) == 4
    refused = client.post(
        "/api/audio/transcribe", json={"clip_id": first["clip_id"], "language": "gu-IN"}
    )
    assert refused.status_code == 429 and len(sent_audio) == 4


def test_disabled_service_never_substitutes_saved_flood(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    first = upload(client)
    monkeypatch.setenv("LIVE", "0")
    result = client.post("/api/audio/transcribe", json={"clip_id": first["clip_id"]})
    assert result.status_code == 503
    assert "transcript" not in result.json()


def test_bad_audio_language_and_duration_rejected_before_model(client: TestClient) -> None:
    bad = client.post(
        "/api/audio/process", files={"audio_file": ("bad.wav", b"not audio", "audio/wav")}
    )
    assert bad.status_code == 400
    too_long = client.post(
        "/api/audio/process", files={"audio_file": ("long.wav", speech_like_wav(31), "audio/wav")}
    )
    assert too_long.status_code == 413
    first = upload(client)
    wrong = client.post(
        "/api/audio/transcribe", json={"clip_id": first["clip_id"], "language": "made-up"}
    )
    assert wrong.status_code == 422
    assert client.get("/api/audio/status").json()["remaining"] == 4


@respx.mock
def test_private_transcript_not_persisted_to_gnani_cache(tmp_path: Path) -> None:
    g = Gnani(tmp_path / "cache", tmp_path / "ledger.jsonl", api_key="fake", max_calls=1)
    respx.post(f"{BASE_URL}/stt/v3").respond(200, json={"transcript": "private visitor sentence"})
    result = g.stt(speech_like_wav(), ["mr-IN"], use_cache=False)
    assert result["transcript"] == "private visitor sentence"
    assert len(g.cache) == 0
    assert "private visitor sentence" not in (tmp_path / "ledger.jsonl").read_text()
