"""The only code that talks to Gnani: every call is cached, counted, capped, retried and replayable."""

import hashlib
import io
import json
import os
import threading
import time
import uuid
import wave
from collections.abc import Callable
from pathlib import Path
from typing import Any

import diskcache
import httpx
from dotenv import load_dotenv
from tenacity import (
    Retrying,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

BASE_URL = "https://api.vachana.ai"
STT_MODEL = "prisma-v3.0"
TTS_MODEL = "timbre-v3.0"
DEFAULT_AUDIO_CONFIG: dict[str, Any] = {
    "sample_rate": 16000,
    "encoding": "linear_pcm",
    "num_channels": 1,
    "sample_width": 2,
    "container": "wav",
}


class ReplayMiss(RuntimeError):
    """Replay mode and the answer is not in the cache, so no live call is made."""


class CapExceeded(RuntimeError):
    """The live-call cap is reached (or not set), so no live call is made."""


class _Retryable(Exception):
    """HTTP 429 or 5xx, or a connection error: worth another try."""


def _digest(*parts: bytes | str) -> str:
    h = hashlib.sha256()
    for p in parts:
        h.update(p if isinstance(p, bytes) else p.encode())
        h.update(b"\0")
    return h.hexdigest()


def _wav_seconds(audio: bytes) -> float | None:
    """Duration for the ledger; None if the bytes are not a WAV file."""
    try:
        with wave.open(io.BytesIO(audio)) as w:
            # Gnani's streamed WAV header can claim a huge frame count, so trust the byte length.
            real = (len(audio) - 44) // (w.getsampwidth() * w.getnchannels())
            return float(min(w.getnframes(), real) / w.getframerate())
    except (wave.Error, EOFError):
        return None


def _stt_fields(resp: httpx.Response) -> dict[str, Any]:
    """Ledger fields that only the STT response knows."""
    body = resp.json()
    return {
        "detected_language_code": body.get("detected_language_code"),
        "processing_time": body.get("processing_time"),
        "end_to_end_latency": body.get("end_to_end_latency"),
        "truncated": body.get("truncated", False),
    }


class Gnani:
    """Cached, capped, replayable client for Prisma (STT) and Timbre (TTS)."""

    def __init__(
        self,
        cache_dir: str | Path,
        ledger_path: str | Path,
        *,
        replay: bool = False,
        max_calls: int | None = None,
        api_key: str | None = None,
        transport: httpx.BaseTransport | None = None,
        sleep: Callable[[float], None] = time.sleep,
    ) -> None:
        self.cache = diskcache.Cache(str(cache_dir))
        self.ledger = Path(ledger_path)
        self.ledger.parent.mkdir(parents=True, exist_ok=True)
        self.replay = replay
        self.max_calls = max_calls
        self._api_key = api_key
        self._http = httpx.Client(base_url=BASE_URL, transport=transport, timeout=60)
        self._sleep = sleep
        self._lock = (
            threading.Lock()
        )  # the account allows one active request at a time (STT and TTS)
        self._used = self._calls_in_ledger()

    def _calls_in_ledger(self) -> int:
        """Live HTTP attempts already spent, so the cap holds across runs."""
        if not self.ledger.exists():
            return 0
        rows = (json.loads(x) for x in self.ledger.read_text("utf-8").splitlines() if x)
        return sum(r.get("attempts", 0) for r in rows if not r["cache_hit"])

    def _key(self) -> str:
        load_dotenv()
        key = self._api_key or os.getenv("GNANI_API_KEY", "")
        if not key:
            raise RuntimeError("GNANI_API_KEY is not set (put it in .env)")
        return key

    def _log(self, row: dict[str, Any]) -> None:
        row["timestamp"] = time.strftime("%Y-%m-%dT%H:%M:%S%z")
        with self.ledger.open("a", encoding="utf-8") as f:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")

    def _post(
        self,
        path: str,
        row: dict[str, Any],
        extra: Callable[[httpx.Response], dict[str, Any]] | None = None,
        **kwargs: Any,
    ) -> httpx.Response:
        """One live POST: cap check, retry on 429/5xx, and always one ledger row."""
        attempts = 0
        last: httpx.Response | None = None
        request_id = uuid.uuid4().hex
        t0 = time.perf_counter()

        def once() -> httpx.Response:
            nonlocal attempts, last
            # A null cap means no live calls: safer than unlimited spending.
            if self.max_calls is None or self._used >= self.max_calls:
                raise CapExceeded(
                    f"live-call cap reached (used {self._used}, cap {self.max_calls})"
                )
            self._used += 1
            attempts += 1
            headers = {"X-API-Key-ID": self._key(), "X-API-Request-ID": request_id}
            try:
                last = self._http.post(path, headers=headers, **kwargs)
            except httpx.TransportError as exc:
                raise _Retryable(type(exc).__name__) from exc
            if last.status_code == 429 or last.status_code >= 500:
                raise _Retryable(str(last.status_code))
            return last

        retrying = Retrying(
            retry=retry_if_exception_type(_Retryable),
            stop=stop_after_attempt(3),  # Gnani docs: three attempts, 0.5 s, 1 s, 2 s
            wait=wait_exponential(multiplier=0.5, max=2),
            sleep=self._sleep,
            retry_error_callback=lambda _state: last,
        )
        resp: httpx.Response | None = None
        try:
            with self._lock:
                resp = retrying(once)
            if resp is None:
                raise RuntimeError("Gnani unreachable after 3 attempts")
            return resp
        finally:
            fields = extra(resp) if extra and resp is not None and resp.status_code == 200 else {}
            self._log(
                {
                    **row,
                    **fields,
                    "cache_hit": False,
                    "attempts": attempts,
                    "status": resp.status_code if resp is not None else "error",
                    "request_id": request_id,
                    "latency_s": round(time.perf_counter() - t0, 3),
                }
            )

    def stt(
        self,
        audio: bytes,
        lang_codes: list[str],
        format: str = "transcribe",
        keyterms: list[str] | None = None,
        topic: str | None = None,
        previous_text: str | None = None,
    ) -> dict[str, Any]:
        """Transcribe WAV bytes with Prisma; explicit model and format, cached by all inputs."""
        form: dict[str, str] = {
            "language_code": lang_codes[0],
            "model": STT_MODEL,
            "format": format,
        }
        if len(lang_codes) > 1:
            form["multi_lang_codes"] = ",".join(lang_codes)
        if keyterms:
            form["keyterms"] = json.dumps(keyterms, ensure_ascii=False)
        if topic:
            form["topic"] = topic
        if previous_text:
            form["previous_text"] = previous_text
        key = "stt:" + _digest(audio, json.dumps(form, sort_keys=True, ensure_ascii=False))
        row: dict[str, Any] = {
            "kind": "stt",
            "model": STT_MODEL,
            "language": lang_codes[0],
            "audio_seconds": _wav_seconds(audio),
            "characters": None,
            "processing_time": None,
        }
        if key in self.cache:
            result: dict[str, Any] = self.cache[key]
            self._log(
                {
                    **row,
                    "cache_hit": True,
                    "attempts": 0,
                    "status": 200,
                    "request_id": None,
                    "processing_time": None,
                    "latency_s": 0.0,
                    "detected_language_code": result.get("detected_language_code"),
                }
            )
            return result
        if self.replay:
            raise ReplayMiss(f"replay mode: stt miss for {lang_codes} ({len(audio)} bytes)")
        resp = self._post(
            "/stt/v3", row, _stt_fields, data=form, files={"audio_file": ("audio.wav", audio)}
        )
        resp.raise_for_status()
        result = resp.json()
        self.cache[key] = result
        return result

    def tts(
        self,
        text: str,
        language: str,
        voice: str,
        speed: float = 1.0,
        audio_config: dict[str, Any] | None = None,
    ) -> bytes:
        """Synthesize speech with Timbre (one request at a time); returns audio bytes."""
        cfg = audio_config or DEFAULT_AUDIO_CONFIG
        body = {
            "text": text,
            "model": TTS_MODEL,
            "voice": voice,
            "language": language,
            "speed": speed,
            "audio_config": cfg,
        }
        key = "tts:" + _digest(json.dumps(body, sort_keys=True, ensure_ascii=False))
        row: dict[str, Any] = {
            "kind": "tts",
            "model": TTS_MODEL,
            "language": language,
            "audio_seconds": None,
            "characters": len(text),
            "detected_language_code": None,
            "processing_time": None,
        }
        if key in self.cache:
            audio: bytes = self.cache[key]
            self._log(
                {
                    **row,
                    "cache_hit": True,
                    "attempts": 0,
                    "status": 200,
                    "request_id": None,
                    "latency_s": 0.0,
                }
            )
            return audio
        if self.replay:
            raise ReplayMiss(f"replay mode: tts miss for {language}/{voice} ({len(text)} chars)")
        resp = self._post("/api/v1/tts/inference", row, json=body)
        resp.raise_for_status()
        self.cache[key] = resp.content
        return resp.content
