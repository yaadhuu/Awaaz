"""Real audio experiments. Visitor audio/transcripts stay in bounded, expiring memory.

Processing never spends model credits. Prisma sees the decoded received waveform, not
the original upload. No saved transcript is substituted for a failed model request.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import secrets
import shutil
import subprocess
import threading
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Literal

import httpx
import numpy as np
from dotenv import load_dotenv
from fastapi import APIRouter, File, Form, HTTPException, Request, Response, UploadFile
from pydantic import BaseModel, Field, ValidationError
from starlette.concurrency import run_in_threadpool

from tinytalk import cloud_limits, codec
from tinytalk.languages import LANG_CODES
from tinytalk.linksim import Link

router = APIRouter(prefix="/api/audio", tags=["Awaaz voice workspace"])
_secret = os.environ.get("AWAAZ_SESSION_SECRET", secrets.token_hex(32)).encode()
_lock = threading.RLock()
_processing_slots = threading.BoundedSemaphore(2)
_clips: dict[str, Clip] = {}
TTL = 20 * 60
MAX_MEMORY = 40 * 1024 * 1024


class AudioSettings(BaseModel):
    codec: Literal["pcm", "codec2", "opus"] = "pcm"
    sample_rate: Literal[8000, 16000, 24000, 48000] = 16000
    bit_depth: Literal[8, 16] = 16
    bitrate_kbps: Literal[6, 12, 24, 48] = 12
    loss_percent: int = Field(default=0, ge=0, le=60)
    seed: int = Field(default=2026, ge=0, le=2147483647)


@dataclass
class Clip:
    owner: str
    wav: bytes
    meta: dict[str, Any]
    created: float = field(default_factory=time.monotonic)
    transcripts: dict[str, dict[str, Any]] = field(default_factory=dict)
    speech: dict[str, dict[str, Any]] = field(default_factory=dict)
    lock: Any = field(default_factory=threading.Lock)


def visitor(request: Request, response: Response) -> str:
    token = request.cookies.get("awaaz_visitor", "")
    parts = token.split(".")
    valid = (
        len(parts) == 2
        and len(parts[0]) == 32
        and hmac.compare_digest(
            parts[1], hmac.new(_secret, parts[0].encode(), hashlib.sha256).hexdigest()
        )
    )
    if not valid:
        ident = secrets.token_hex(16)
        signature = hmac.new(_secret, ident.encode(), hashlib.sha256).hexdigest()
        token = f"{ident}.{signature}"
        response.set_cookie(
            "awaaz_visitor",
            token,
            max_age=86400,
            httponly=True,
            secure=request.url.scheme == "https",
            samesite="lax",
        )
    return hashlib.sha256(token.encode()).hexdigest()[:32]


def _prune() -> None:
    now = time.monotonic()
    for key in list(_clips):
        if now - _clips[key].created > TTL:
            del _clips[key]
    while (
        _clips
        and sum(len(c.wav) + sum(len(str(v)) for v in c.speech.values()) for c in _clips.values())
        > MAX_MEMORY
    ):
        del _clips[next(iter(_clips))]


def _clip(clip_id: str, owner: str) -> Clip:
    with _lock:
        _prune()
        found = _clips.get(clip_id)
        if not found or found.owner != owner:
            raise HTTPException(404, "This audio preview expired. Process the audio again.")
        return found


def _receipt(clip_id: str, clip: Clip) -> str:
    payload = base64.urlsafe_b64encode(json.dumps({
        "id": clip_id, "owner": clip.owner, "meta": clip.meta,
        "sha": hashlib.sha256(clip.wav).hexdigest(), "expires": int(time.time()) + TTL,
    }, separators=(",", ":")).encode()).decode()
    return payload + "." + hmac.new(_secret, payload.encode(), hashlib.sha256).hexdigest()


def _restore(clip_id: str, owner: str, receipt: str, audio_b64: str) -> Clip:
    try:
        return _clip(clip_id, owner)
    except HTTPException:
        pass
    try:
        payload, signature = receipt.split(".")
        if not hmac.compare_digest(signature, hmac.new(_secret, payload.encode(), hashlib.sha256).hexdigest()):
            raise ValueError("signature")
        data = json.loads(base64.urlsafe_b64decode(payload))
        wav = base64.b64decode(audio_b64, validate=True)
        if (data["id"] != clip_id or data["owner"] != owner or data["expires"] < time.time()
                or hashlib.sha256(wav).hexdigest() != data["sha"]):
            raise ValueError("expired or mismatched preview")
        clip = Clip(owner=owner, wav=wav, meta=data["meta"])
        with _lock:
            _prune()
            _clips[clip_id] = clip
        return clip
    except (ValueError, KeyError, TypeError) as exc:
        raise HTTPException(404, "This preview expired. Process the audio again.") from exc


def _used(owner: str) -> int:
    from tinytalk import api
    return cloud_limits.used(owner) if os.getenv("VERCEL") else api.limit_tracker().visitor_calls_today(owner)


def _model(request: Request, owner: str, kind: str, call: Any) -> tuple[Any, int]:
    from tinytalk import api
    with cloud_limits.model_lock():
        remaining = _reserve(request, owner, kind)
        return api.spend(None, call), remaining


def decode_upload(data: bytes, mime: str, limit: float = 30) -> tuple[codec.Pcm, int]:
    """Decode only pipes, returning raw PCM so WAV streaming headers cannot lie about length."""
    from tinytalk import api

    if mime not in api.FORMATS:
        raise HTTPException(415, "Use WAV, MP3, OGG, WebM, FLAC or M4A audio.")
    if not shutil.which("ffmpeg"):
        raise HTTPException(503, "Audio processing is unavailable: ffmpeg is missing.")
    cmd = [
        "ffmpeg",
        "-v",
        "error",
        "-nostdin",
        "-protocol_whitelist",
        "pipe",
        "-f",
        api.FORMATS[mime],
        "-i",
        "pipe:0",
        "-t",
        str(limit + 0.5),
        "-ac",
        "1",
        "-ar",
        "16000",
        "-f",
        "s16le",
        "pipe:1",
    ]
    try:
        result = subprocess.run(cmd, input=data, capture_output=True, timeout=25, check=False)
    except subprocess.TimeoutExpired as exc:
        raise HTTPException(400, "This audio took too long to decode. Try a shorter clip.") from exc
    if result.returncode or not result.stdout:
        raise HTTPException(
            400, "This file is not readable audio. Try WAV, MP3 or a new recording."
        )
    pcm = np.frombuffer(result.stdout[: len(result.stdout) // 2 * 2], dtype="<i2").copy()
    if len(pcm) / 16000 > limit + 0.35:
        raise HTTPException(
            413, f"Use a clip of {limit:g} seconds or less. No model call was made."
        )
    if len(pcm) < 1600:
        raise HTTPException(400, "Record at least a tenth of a second of speech.")
    return pcm[: int(limit * 16000)], 16000


def process_audio(
    pcm: codec.Pcm, rate: int, settings: AudioSettings
) -> tuple[bytes, dict[str, Any]]:
    """Actually resample, encode/decode and erase chunks. No transcript manipulation."""
    target_rate = 8000 if settings.codec == "codec2" else settings.sample_rate
    signal = codec.resample(pcm, rate, target_rate)
    loss = settings.loss_percent
    bitrate = target_rate * settings.bit_depth
    model_note = "48-byte payload packets; lost packets become silence."
    if settings.codec == "codec2":
        payload = codec.c2_encode(signal)
        link = Link(10, loss, settings.seed)
        transfer = link.send_stream(payload)
        received = codec.c2_decode_with_loss(transfer.received, 8)[: len(signal)]
        bitrate = 2400
        effective_bits: int | None = None
    elif settings.codec == "pcm":
        if settings.bit_depth == 8:
            payload = ((signal.astype(np.int32) + 32768) >> 8).astype(np.uint8).tobytes()
            silence = b"\x80"
        else:
            payload, silence = signal.astype("<i2").tobytes(), b"\x00"
        link = Link(10, loss, settings.seed)
        transfer = link.send_stream(payload)
        parts = [
            part if part is not None else silence * min(48, len(payload) - i * 48)
            for i, part in enumerate(transfer.received)
        ]
        heard = b"".join(parts)
        received = (
            ((np.frombuffer(heard, dtype=np.uint8).astype(np.int32) - 128) << 8).astype(np.int16)
            if settings.bit_depth == 8
            else np.frombuffer(heard[: len(heard) // 2 * 2], dtype="<i2")
        )
        effective_bits = settings.bit_depth
    else:
        try:
            payload = codec.opus_encode(signal, target_rate, settings.bitrate_kbps)
            decoded = codec.opus_decode(payload, target_rate)[: len(signal)]
        except (subprocess.CalledProcessError, FileNotFoundError) as exc:
            raise HTTPException(503, "This server cannot encode Opus. Try PCM or Codec2.") from exc
        # Erase decoded 20 ms frames, never corrupt an Ogg container and call it Opus PLC.
        frame_bytes = target_rate // 50 * 2
        link = Link(10, loss, settings.seed, payload_bytes=frame_bytes)
        transfer = link.send_stream(decoded.astype("<i2").tobytes())
        heard = b"".join(
            part
            if part is not None
            else b"\0" * min(frame_bytes, len(decoded) * 2 - i * frame_bytes)
            for i, part in enumerate(transfer.received)
        )
        received = np.frombuffer(heard[: len(heard) // 2 * 2], dtype="<i2")
        bitrate = settings.bitrate_kbps * 1000
        effective_bits = None
        model_note = "Opus encoded/decoded first; simulated 20 ms erasures applied after decoding. Not native Opus packet-loss concealment."
    wav = codec.pcm_to_wav(received, target_rate)
    return wav, {
        "codec": settings.codec,
        "sample_rate": target_rate,
        "bit_depth": effective_bits,
        "bitrate_bps": bitrate,
        "duration_seconds": round(len(received) / target_rate, 3),
        "encoded_bytes": len(payload),
        "preview_wav_bytes": len(wav),
        "loss_percent": loss,
        "chunks": transfer.packets,
        "lost_chunks": transfer.states.count("lost"),
        "loss_model": model_note,
        "seed": settings.seed,
        "audio_sha256": hashlib.sha256(wav).hexdigest(),
        "source": "processed_audio",
        "model_calls": 0,
    }


@router.get("/status")
def status(request: Request, response: Response) -> dict[str, Any]:
    from tinytalk import api

    load_dotenv()
    owner = visitor(request, response)
    limit = api.cfg()["live"].get("per_visitor_daily", 4)
    used = _used(owner) if not os.getenv("VERCEL") or cloud_limits.configured() else 0
    return {
        "available": True,
        "processing_available": bool(shutil.which("ffmpeg")),
        "live": api.live()
        and os.getenv("AWAAZ_PUBLIC_LIVE") == "1"
        and bool(os.getenv("GNANI_API_KEY"))
        and (not os.getenv("VERCEL") or (cloud_limits.configured() and bool(os.getenv("AWAAZ_SESSION_SECRET")))),
        "remaining": max(0, limit - used),
        "limit": limit,
        "max_seconds": min(30, api.cfg()["live"].get("workspace_audio_seconds", 30)),
        "languages": LANG_CODES,
        "model": "prisma-v3.0",
        "privacy": "Visitor audio and transcripts are held in expiring server memory; not written to the research cache.",
    }


@router.post("/process")
async def process(
    request: Request,
    response: Response,
    audio_file: UploadFile | None = File(None),
    sample_id: str = Form(""),
    codec_name: Literal["pcm", "codec2", "opus"] = Form("pcm"),
    sample_rate: int = Form(16000),
    bit_depth: int = Form(16),
    bitrate_kbps: int = Form(12),
    loss_percent: int = Form(0, ge=0, le=60),
    seed: int = Form(2026, ge=0, le=2147483647),
) -> dict[str, Any]:
    from tinytalk import api

    owner = visitor(request, response)
    if not _processing_slots.acquire(blocking=False):
        raise HTTPException(429, "The audio processor is busy. Try again in a few seconds.")
    try:
        if audio_file is not None:
            data = await audio_file.read(min(4000000, api.cfg()["live"]["max_upload_bytes"]) + 1)
            mime = (audio_file.content_type or "").split(";")[0]
        elif sample_id:
            # Only an allowlisted local asset can be opened; never fetch arbitrary URLs.
            manifest = json_samples()
            sample = next((s for s in manifest if s["id"] == sample_id), None)
            if sample is None:
                raise HTTPException(404, "Unknown sample.")
            path = Path("web/public") / sample["audio"]
            data, mime = path.read_bytes(), "audio/mpeg"
        else:
            raise HTTPException(422, "Record, upload or choose an audio sample first.")
        if len(data) > min(4000000, api.cfg()["live"]["max_upload_bytes"]):
            raise HTTPException(413, "Audio exceeds the 4 MB upload limit.")
        limit = min(30, api.cfg()["live"].get("workspace_audio_seconds", 30))
        pcm, rate = await run_in_threadpool(decode_upload, data, mime, limit)
        try:
            options = AudioSettings.model_validate(
                {
                    "codec": codec_name,
                    "sample_rate": sample_rate,
                    "bit_depth": bit_depth,
                    "bitrate_kbps": bitrate_kbps,
                    "loss_percent": loss_percent,
                    "seed": seed,
                }
            )
        except ValidationError as exc:
            raise HTTPException(
                422, "Choose a supported sample rate, bit depth and bitrate."
            ) from exc
        fingerprint = hashlib.sha256(
            owner.encode() + data + options.model_dump_json().encode()
        ).hexdigest()
        with _lock:
            _prune()
            existing = _clips.get(fingerprint)
        if existing:
            clip = existing
        else:
            wav, meta = await run_in_threadpool(process_audio, pcm, rate, options)
            clip = Clip(owner=owner, wav=wav, meta=meta)
            with _lock:
                _clips[fingerprint] = clip
                _prune()
        return {
            "clip_id": fingerprint,
            "receipt": _receipt(fingerprint, clip),
            "audio_b64": base64.b64encode(clip.wav).decode(),
            "content_type": "audio/wav",
            "meta": clip.meta,
        }
    finally:
        _processing_slots.release()


def json_samples() -> list[dict[str, Any]]:
    import json

    return list(json.loads(Path("web/public/data/voice-samples.json").read_text("utf-8")))


def _reserve(request: Request, owner: str, kind: str) -> int:
    from tinytalk import api

    load_dotenv()
    if not api.live() or os.getenv("AWAAZ_PUBLIC_LIVE") != "1":
        raise HTTPException(
            503,
            "Live speech is disabled on this server. Audio processing still works; no saved transcript was substituted.",
        )
    if not os.getenv("GNANI_API_KEY"):
        raise HTTPException(503, "The server's Gnani key is not configured.")
    api._cap_check(None, set_budget=False)
    if os.getenv("VERCEL"):
        ip = request.headers.get("x-vercel-forwarded-for", request.client.host if request.client else "unknown").split(",")[0].strip()
        # Reserve the worst-case three API attempts against the committed budget baseline.
        from tinytalk import credits
        baseline = credits.summary(api.cfg()["credits"], credits.load_ledger("results/ledger.jsonl"), None)["calls"]
        return cloud_limits.reserve(owner, hashlib.sha256(ip.encode()).hexdigest(), api.cfg(),
                                    max(0, int(api.cfg()["credits"]["cap_calls"] - baseline)))
    allowed, reason = api.limit_tracker().check_and_record(
        request.client.host if request.client else "unknown",
        owner,
        False,
        f"/api/audio/{kind}",
        kind,
        api.cfg(),
    )
    if not allowed:
        raise HTTPException(429, reason)
    return int(
        max(
            0,
            api.cfg()["live"].get("per_visitor_daily", 4)
            - _used(owner),
        )
    )


class TranscribeRequest(BaseModel):
    clip_id: str = Field(min_length=64, max_length=64)
    receipt: str = Field("", max_length=8192)
    audio_b64: str = Field("", max_length=4100000)
    language: str = "indic-auto"
    format: Literal["transcribe", "verbatim", "codemix", "transliterate"] = "transcribe"
    keyterms: str = Field("", max_length=500)


@router.post("/transcribe")
def transcribe(body: TranscribeRequest, request: Request, response: Response) -> dict[str, Any]:
    from tinytalk import api

    if body.language not in ["indic-auto", *LANG_CODES]:
        raise HTTPException(
            422, "Select automatic detection or one of Prisma's ten supported languages."
        )
    owner = visitor(request, response)
    clip = _restore(body.clip_id, owner, body.receipt, body.audio_b64)
    cache_key = f"{body.language}|{body.format}|{body.keyterms}"
    with clip.lock:
        if cache_key in clip.transcripts:
            result = dict(clip.transcripts[cache_key])
            result["reused"] = True
            result["remaining"] = max(
                0,
                api.cfg()["live"].get("per_visitor_daily", 4)
                - _used(owner),
            )
            return result
        # Prisma receives the decoded preview, upsampled to its 16 kHz input format.
        pcm, rate = codec.wav_to_pcm(clip.wav)
        wav = codec.pcm_to_wav(codec.resample(pcm, rate, 16000), 16000)
        started = time.perf_counter()
        try:
            result, remaining = _model(
                request, owner, "stt",
                lambda: api.gnani().stt(
                    wav,
                    [body.language],
                    body.format,
                    keyterms=[s.strip() for s in body.keyterms.split(",") if s.strip()] or None,
                    use_cache=False,
                ),
            )
        except (httpx.HTTPError, RuntimeError) as exc:
            code = exc.response.status_code if isinstance(exc, httpx.HTTPStatusError) else None
            raise HTTPException(
                502,
                f"Gnani could not transcribe this audio{f' (HTTP {code})' if code else ''}. No transcript was invented. Try another setting or recording.",
            ) from exc
        if result.get("success") is False:
            raise HTTPException(
                502, "Prisma did not return a successful transcription. Try clearer audio."
            )
        output = {
            "transcript": result.get("transcript", ""),
            "source": "gnani_live",
            "detected_language": result.get("detected_language_code") or body.language,
            "format": body.format,
            "model": result.get("model", "prisma-v3.0"),
            "elapsed_seconds": round(time.perf_counter() - started, 2),
            "clip_id": body.clip_id,
            "audio_sha256": clip.meta["audio_sha256"],
            "model_input_sha256": hashlib.sha256(wav).hexdigest(),
            "remaining": remaining,
            "reused": False,
            "note": "Identical transcripts can be correct: resampling or compression does not necessarily change recognised words.",
        }
        clip.transcripts[cache_key] = output
        return output


class SpeakRequest(BaseModel):
    clip_id: str = Field(min_length=64, max_length=64)
    receipt: str = Field("", max_length=8192)
    audio_b64: str = Field("", max_length=4100000)
    text: str = Field(min_length=1, max_length=1000)
    language: str = "en-IN"


@router.post("/speak")
def speak(body: SpeakRequest, request: Request, response: Response) -> dict[str, Any]:
    from tinytalk import api

    if body.language not in LANG_CODES:
        raise HTTPException(422, "Choose a supported read-aloud language.")
    owner = visitor(request, response)
    clip = _restore(body.clip_id, owner, body.receipt, body.audio_b64)
    key = hashlib.sha256(f"{body.language}|{body.text}".encode()).hexdigest()
    with clip.lock:
        if key in clip.speech:
            return {
                **clip.speech[key],
                "reused": True,
                "remaining": max(
                    0,
                    int(api.cfg()["live"].get("per_visitor_daily", 4))
                    - _used(owner),
                ),
            }
        try:
            audio, remaining = _model(
                request, owner, "tts",
                lambda: api.gnani().tts(
                    body.text,
                    body.language,
                    "Vasudha",
                    use_cache=False,
                ),
            )
        except (httpx.HTTPError, RuntimeError) as exc:
            raise HTTPException(
                502, "Timbre could not read this text. No fallback speech was substituted."
            ) from exc
        output = {
            "audio_b64": base64.b64encode(audio).decode(),
            "content_type": "audio/wav",
            "remaining": remaining,
            "source": "gnani_live",
            "reused": False,
        }
        clip.speech[key] = output
        return output
