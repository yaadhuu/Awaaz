"""API in replay mode: no network and no credits."""

import pytest
from fastapi.testclient import TestClient

from tinytalk.api import app

client = TestClient(app)
TEXT = "Flood warning for Aluva. Water level will reach 5 metres by 6 pm."


def test_health_is_replay_by_default() -> None:
    assert client.get("/api/health").json()["live"] is False


def test_samples() -> None:
    rows = client.get("/api/samples", params={"lang": "ml"}).json()
    assert len(rows) == 40
    assert {"id", "text", "category", "split"} <= rows[0].keys()


def test_send_returns_three_tiers_and_facts() -> None:
    r = client.post(
        "/api/send", json={"text": TEXT, "lang": "en", "rate_kbps": 5, "loss_percent": 0}
    )
    assert r.status_code == 200
    body = r.json()
    assert [t["tier"] for t in body["tiers"]] == ["A", "B", "C"]
    assert body["facts_sent"]["numbers"] == [{"value": 5, "unit": "metres"}]
    by = {t["tier"]: t for t in body["tiers"]}
    assert by["A"]["estimated"] and not by["A"]["available"]  # no cached audio for typed text
    assert by["C"]["payload_bytes"] < by["B"]["payload_bytes"] < by["A"]["payload_bytes"]
    assert by["C"]["facts_received"] == body["facts_sent"]


def test_auto_tier_switches_with_the_link() -> None:
    def chosen(rate: float, loss: float) -> str:
        r = client.post(
            "/api/send", json={"text": TEXT, "lang": "en", "rate_kbps": rate, "loss_percent": loss}
        )
        return str(r.json()["chosen"])

    assert chosen(10, 0) == "A"
    assert chosen(10, 30) == "B"


def test_send_validates_input() -> None:
    bad = {"text": "", "lang": "en"}
    assert client.post("/api/send", json=bad).status_code == 422
    assert client.post("/api/send", json={"text": "x", "lang": "fr"}).status_code == 422


def test_teachback_catches_a_changed_number() -> None:
    ok = client.post("/api/teachback", json={"sent": TEXT, "readback": TEXT}).json()
    assert ok["match"]
    bad = client.post(
        "/api/teachback", json={"sent": TEXT, "readback": TEXT.replace("5 m", "6 m")}
    ).json()
    assert not bad["match"]
    assert bad["missing"] == [["numbers", [5, "metres"]]]
    assert bad["wrong"] == [["numbers", [6, "metres"]]]


def test_curve_404_until_built_and_picker_grid() -> None:
    assert client.get("/api/curve").status_code in (200, 404)
    grid = client.get("/api/picker", params={"lang": "en", "text": TEXT}).json()
    assert len(grid) == 12
    assert {g["tier"] for g in grid} <= {"A", "B", "C"}


def test_live_send_needs_the_access_code(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("LIVE", "1")
    monkeypatch.setenv("ACCESS_CODE", "secret")
    body = {"text": TEXT, "lang": "en"}
    assert client.post("/api/send", json=body).status_code == 401
    assert client.post("/api/send", json=body, headers={"X-Access-Code": "nope"}).status_code == 401
    monkeypatch.delenv("ACCESS_CODE")
    assert client.post("/api/send", json=body, headers={"X-Access-Code": "x"}).status_code == 401


def test_usage_and_estimate_without_rates() -> None:
    u = client.get("/api/usage").json()
    assert {"unit", "used", "cap", "level", "ledger", "by_day", "queue"} <= u.keys()
    assert u["rate_configured"] is False and u["unit"] == "calls"
    e = client.post("/api/estimate", json={"kind": "stt", "audio_seconds": 10}).json()
    assert e["credits"] is None and e["units"] == {"audio_seconds": 10}


def test_live_endpoints_refuse_in_replay_mode() -> None:
    tts = {"text": "hello", "language": "en-IN", "voice": "Vasudha"}
    assert client.post("/api/tts", json=tts).status_code == 403
    files = {"audio_file": ("a.wav", b"RIFF", "audio/wav")}
    assert client.post("/api/stt", files=files).status_code == 403


class FakeGnani:
    _used = 0
    max_calls = 0

    def tts(self, *a: object, **k: object) -> bytes:
        return b"RIFFfake"


def live_env(monkeypatch: pytest.MonkeyPatch, rows: list[dict]) -> None:  # type: ignore[type-arg]
    from tinytalk import api

    monkeypatch.setenv("LIVE", "1")
    monkeypatch.setenv("ACCESS_CODE", "secret")
    monkeypatch.setattr(api, "gnani", lambda: FakeGnani())
    monkeypatch.setattr(api, "ledger_rows", lambda: rows)
    monkeypatch.setattr(api, "calibration", lambda: None)
    api._hits.clear()


def test_live_tts_works_with_code_and_stops_at_the_cap(monkeypatch: pytest.MonkeyPatch) -> None:
    from tinytalk import api

    live_env(monkeypatch, [])
    body = {"text": "hello", "language": "en-IN", "voice": "Vasudha"}
    h = {"X-Access-Code": "secret"}
    r = client.post("/api/tts", json=body, headers=h)
    assert r.status_code == 200 and r.json()["content_type"] == "audio/wav"
    assert client.post("/api/tts", json={**body, "voice": "Nobody"}, headers=h).status_code == 422
    cap = api.cfg()["credits"]["cap_calls"]
    full = [{"kind": "stt", "cache_hit": False, "attempts": 1, "timestamp": "2020-01-01"}] * cap
    monkeypatch.setattr(api, "ledger_rows", lambda: full)
    assert client.post("/api/tts", json=body, headers=h).status_code == 402


def test_per_ip_rate_limit(monkeypatch: pytest.MonkeyPatch) -> None:
    from tinytalk import api

    live_env(monkeypatch, [])
    body = {"text": "hello", "language": "en-IN", "voice": "Vasudha"}
    h = {"X-Access-Code": "secret"}
    codes = [
        client.post("/api/tts", json=body, headers=h).status_code
        for _ in range(api.cfg()["live"]["per_ip_per_minute"] + 1)
    ]
    assert codes[-1] == 429 and codes[0] == 200


def test_stt_rejects_wrong_type(monkeypatch: pytest.MonkeyPatch) -> None:
    live_env(monkeypatch, [])
    files = {"audio_file": ("a.txt", b"hello", "text/plain")}
    assert (
        client.post("/api/stt", files=files, headers={"X-Access-Code": "secret"}).status_code == 415
    )
