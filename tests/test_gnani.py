"""Gnani client tests with a fake transport: no network, no credits."""

import json
from pathlib import Path

import httpx
import pytest

from tinytalk.gnani import CapExceeded, Gnani, ReplayMiss

WAV = b"RIFF....not-a-real-wav"


def make(tmp_path: Path, handler, **kw) -> Gnani:  # type: ignore[no-untyped-def]
    return Gnani(
        tmp_path / "cache",
        tmp_path / "ledger.jsonl",
        api_key="test-key",
        transport=httpx.MockTransport(handler),
        sleep=lambda _s: None,
        **kw,
    )


def rows(tmp_path: Path) -> list[dict]:  # type: ignore[type-arg]
    return [json.loads(x) for x in (tmp_path / "ledger.jsonl").read_text("utf-8").splitlines()]


def ok_stt(request: httpx.Request) -> httpx.Response:
    return httpx.Response(200, json={"transcript": "x", "detected_language_code": "hi-IN"})


def test_cache_hit_costs_zero(tmp_path: Path) -> None:
    calls: list[int] = []

    def handler(r: httpx.Request) -> httpx.Response:
        calls.append(1)
        return ok_stt(r)

    g = make(tmp_path, handler, max_calls=10)
    g.stt(WAV, ["hi-IN"])
    g.stt(WAV, ["hi-IN"])
    assert len(calls) == 1
    r = rows(tmp_path)
    assert [x["cache_hit"] for x in r] == [False, True]
    assert r[0]["detected_language_code"] == "hi-IN"
    assert g._used == 1


def test_cap_stops_run_and_null_cap_blocks_live(tmp_path: Path) -> None:
    g = make(tmp_path, ok_stt, max_calls=1)
    g.stt(WAV, ["hi-IN"])
    with pytest.raises(CapExceeded):
        g.stt(WAV + b"2", ["hi-IN"])
    with pytest.raises(CapExceeded):
        make(tmp_path / "other", ok_stt).stt(WAV, ["hi-IN"])


def test_cap_holds_across_runs(tmp_path: Path) -> None:
    make(tmp_path, ok_stt, max_calls=1).stt(WAV, ["hi-IN"])
    with pytest.raises(CapExceeded):
        make(tmp_path, ok_stt, max_calls=1).stt(WAV + b"2", ["hi-IN"])


def test_retry_on_429_then_success(tmp_path: Path) -> None:
    seen = iter([429, 503, 200])

    def handler(r: httpx.Request) -> httpx.Response:
        code = next(seen)
        return httpx.Response(code, content=b"audio-bytes") if code == 200 else httpx.Response(code)

    g = make(tmp_path, handler, max_calls=10)
    assert g.tts("hello", "en-IN", "Vasudha") == b"audio-bytes"
    assert rows(tmp_path)[0]["attempts"] == 3


def test_replay_miss_never_calls_api(tmp_path: Path) -> None:
    def handler(r: httpx.Request) -> httpx.Response:
        raise AssertionError("live call in replay mode")

    with pytest.raises(ReplayMiss):
        make(tmp_path, handler, replay=True, max_calls=10).tts("hi", "en-IN", "Vasudha")


def test_request_sends_model_format_and_key(tmp_path: Path) -> None:
    sent: list[httpx.Request] = []

    def handler(r: httpx.Request) -> httpx.Response:
        sent.append(r)
        return ok_stt(r)

    make(tmp_path, handler, max_calls=10).stt(WAV, ["ml-IN"], keyterms=["Kochi"])
    body = sent[0].content
    assert b'name="model"' in body and b"prisma-v3.0" in body
    assert b'name="format"' in body and b"transcribe" in body
    assert sent[0].headers["x-api-key-id"] == "test-key"
    assert "test-key" not in (tmp_path / "ledger.jsonl").read_text("utf-8")


def test_connection_error_is_retried_then_fails_cleanly(tmp_path: Path) -> None:
    def handler(r: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("down")

    g = make(tmp_path, handler, max_calls=10)
    with pytest.raises(RuntimeError, match="unreachable"):
        g.tts("hello", "en-IN", "Vasudha")
    row = rows(tmp_path)[0]
    assert (row["attempts"], row["status"]) == (3, "error")


def test_keyterms_field_name_matches_docs(tmp_path: Path) -> None:
    sent: list[httpx.Request] = []

    def handler(r: httpx.Request) -> httpx.Response:
        sent.append(r)
        return ok_stt(r)

    make(tmp_path, handler, max_calls=10).stt(WAV, ["ml-IN"], keyterms=["Kochi"])
    assert b'name="keyterms"' in sent[0].content
