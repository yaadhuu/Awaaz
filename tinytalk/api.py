"""Thin FastAPI layer over the library. Replay by default; LIVE=1 allows real Gnani calls."""

import base64
import json
import os
import shutil
import subprocess
import tempfile
import threading
import time
from collections import Counter, defaultdict, deque
from functools import lru_cache
from pathlib import Path
from typing import Any, Literal

import yaml
from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, Query, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from tinytalk import codec, corpus, credits, pipeline
from tinytalk.facts import Facts, extract
from tinytalk.gnani import Gnani, ReplayMiss
from tinytalk.linksim import Link
from tinytalk.textpack import make_dict, pack_transcript
from tinytalk.tiers import link_seed, pick_tier, send_audio, send_facts, send_transcript

Lang = Literal["ml", "hi", "en"]
CHARS_PER_SECOND = 12  # rough speech rate used only to estimate Tier A size when no audio exists
app = FastAPI(title="TinyTalk")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173"], allow_methods=["*"])


@lru_cache
def cfg() -> dict[str, Any]:
    cfg_: dict[str, Any] = yaml.safe_load(
        Path(os.environ.get("TINYTALK_CONFIG", "config.yaml")).read_text("utf-8")
    )
    return cfg_


@lru_cache
def zdict(lang: str) -> Any:
    return make_dict([r["text"] for r in corpus.load(cfg()["paths"]["corpus"], lang, "dev")])


def live() -> bool:
    return os.environ.get("LIVE") == "1"


@lru_cache
def gnani() -> Gnani:
    """One shared client per process, so the request lock and the call cap cover every request."""
    c = cfg()
    return Gnani(c["paths"]["cache"], c["paths"]["ledger"], replay=not live(), max_calls=0)


VOICES = [
    "Shivani", "Lakshmi", "Kalpana", "Chetana", "Vasudha", "Riyaa", "Tarika",
    "Avinash", "Shubham", "Prakash", "Devansh", "Yashraj", "Harshad",
]  # fmt: skip
_hits: dict[str, deque[float]] = defaultdict(deque)
_hits_lock = threading.Lock()
_queue = {"waiting": 0}


def ledger_rows() -> list[dict[str, Any]]:
    return credits.load_ledger(cfg()["paths"]["ledger"])


def calibration() -> dict[str, Any] | None:
    return credits.load_calibration(cfg()["credits"]["calibration_file"])


def usage_now() -> dict[str, Any]:
    return credits.summary(cfg()["credits"], ledger_rows(), calibration())


def check_access(code: str | None) -> None:
    """LIVE=1 and the ACCESS_CODE secret are both needed before anything can spend credits."""
    if not live():
        raise HTTPException(403, "Replay mode: live Gnani calls are switched off on this server.")
    expected = os.environ.get("ACCESS_CODE")
    if not expected or code != expected:
        raise HTTPException(401, "Live calls need the access code (X-Access-Code header).")


def live_guard(request: Request, x_access_code: str | None = Header(default=None)) -> None:
    """Access code, per-IP rate limit, daily cap and the credit cap, checked before a live call."""
    check_access(x_access_code)
    lc = cfg()["live"]
    ip = request.client.host if request.client else "?"
    now = time.monotonic()
    with _hits_lock:
        q = _hits[ip]
        while q and now - q[0] > 60:
            q.popleft()
        if len(q) >= lc["per_ip_per_minute"]:
            raise HTTPException(429, "Too many live requests from this address; wait a minute.")
        q.append(now)
    rows = ledger_rows()
    if credits.today_calls(rows) >= lc["daily_call_cap"]:
        raise HTTPException(429, "Today's live-call limit for this server is used up.")
    left = credits.calls_left(cfg()["credits"], rows, calibration())
    if left <= 0:
        raise HTTPException(402, "The credit cap is reached; the server refuses live calls.")
    g = gnani()
    g.max_calls = g._used + left


def require_token(request: Request, x_access_code: str | None = Header(default=None)) -> None:
    """/api/send only spends credits in LIVE mode; then it needs the same guard as other live calls."""
    if live():
        live_guard(request, x_access_code)


def spend_since(before: int) -> dict[str, Any]:
    """What the calls made after ledger row `before` cost: live attempts and credits if known."""
    new = ledger_rows()[before:]
    c = cfg()["credits"]
    live_new = [r for r in new if not r.get("cache_hit")]
    return {
        "calls": sum(r.get("attempts", 1) for r in live_new),
        "cache_hits": sum(1 for r in new if r.get("cache_hit")),
        "credits": sum(credits.row_credits(c, r) or 0.0 for r in live_new)
        if credits.rates_configured(c)
        else None,
        "usage_headers": [r["usage_headers"] for r in new if r.get("usage_headers")],
    }


def need_confirm(estimate: float | None, confirm: bool) -> None:
    """Above the threshold, a live call needs an explicit confirm from the user."""
    limit = cfg()["credits"]["confirm_above"]
    amount = estimate if estimate is not None else 1  # without rates, one call = one unit
    if amount > limit and not confirm:
        raise HTTPException(
            409, f"This call is estimated at about {amount} credits; confirm to go ahead."
        )


class SendRequest(BaseModel):
    text: str = Field(min_length=1, max_length=600)
    lang: Lang
    rate_kbps: float = Field(5, ge=0.5, le=50)
    loss_percent: float = Field(0, ge=0, le=90)
    tier: Literal["auto", "A", "B", "C"] = "auto"


class TierReport(BaseModel):
    tier: str
    available: bool
    estimated: bool = False
    payload_bytes: int
    bytes_sent: int
    airtime_s: float
    delivered: bool | None
    resends: int
    facts_received: dict[str, Any] | None
    packet_states: list[str] = []
    note: str | None = None


class SendResponse(BaseModel):
    chosen: str
    facts_sent: dict[str, Any]
    tiers: list[TierReport]


class TeachbackRequest(BaseModel):
    sent: str = Field(min_length=1, max_length=600)
    readback: str = Field(max_length=600)


def make_link(req: SendRequest, tier: str) -> Link:
    lk = cfg()["link"]
    seed = link_seed(cfg()["seeds"]["link"], req.text, tier, req.loss_percent)
    return Link(
        req.rate_kbps,
        req.loss_percent,
        seed,
        lk["mean_burst_packets"],
        lk["payload_bytes"],
        lk["header_bytes"],
        lk["max_resends"],
    )


def tier_a(req: SendRequest, truth: Facts) -> tuple[TierReport, float]:
    """Tier A report and the audio length. Real if the audio is in the cache (or LIVE=1)."""
    voice = cfg()["voices"][0]
    try:
        wav = pipeline.synth(gnani(), cfg(), req.text, req.lang, voice, 1.0)
    except (ReplayMiss, RuntimeError) as exc:
        secs = len(req.text) / CHARS_PER_SECOND
        payload = int(secs * cfg()["codec"]["codec2_mode"] / 8)
        wire = payload + payload // cfg()["link"]["payload_bytes"] * cfg()["link"]["header_bytes"]
        return (
            TierReport(
                tier="A", available=False, estimated=True, payload_bytes=payload,
                bytes_sent=wire, airtime_s=wire * 8 / (req.rate_kbps * 1000), delivered=None,
                resends=0, facts_received=None,
                note=f"No audio for this text ({type(exc).__name__}); size is an estimate.",
            ),
            secs,
        )  # fmt: skip
    sent = send_audio(wav, make_link(req, "A"))
    facts: dict[str, Any] | None = None
    note: str | None = "Audio delivered; recognising it needs Prisma (LIVE=1)."
    if live():
        heard = pipeline.transcribe(gnani(), sent.audio_wav or b"", req.lang, "off")
        facts, note = extract(heard).to_dict(), None
    return (
        TierReport(
            tier="A", available=True, payload_bytes=sent.payload_bytes,
            bytes_sent=sent.link.bytes_sent, airtime_s=sent.link.airtime_s,
            delivered=sent.link.delivered, resends=0, facts_received=facts, note=note,
            packet_states=sent.link.states,
        ),
        pipeline.audio_seconds(wav),
    )  # fmt: skip


@app.get("/api/health")
def health() -> dict[str, Any]:
    return {"ok": True, "live": live(), "access_code_required": live()}


@app.get("/api/samples")
def samples(lang: Lang) -> list[dict[str, Any]]:
    return [
        {"id": r["id"], "text": r["text"], "category": r["category"], "split": r["split"]}
        for r in corpus.load(cfg()["paths"]["corpus"], lang)
    ]


@app.post("/api/send", dependencies=[Depends(require_token)])
def send(req: SendRequest) -> SendResponse:
    truth = extract(req.text)
    c = send_facts(truth, make_link(req, "C"))
    b = send_transcript(req.text, req.lang, zdict(req.lang), make_link(req, "B"))
    a, secs = tier_a(req, truth)
    reports = [a] + [
        TierReport(
            tier=s.tier, available=True, payload_bytes=s.payload_bytes,
            bytes_sent=s.link.bytes_sent, airtime_s=s.link.airtime_s,
            delivered=s.link.delivered, resends=s.link.resends,
            facts_received=s.facts.to_dict() if s.facts else None,
            packet_states=s.link.states,
        )
        for s in (b, c)
    ]  # fmt: skip
    chosen: str = req.tier
    if chosen == "auto":
        chosen = pick_tier(req.rate_kbps, req.loss_percent, secs, b.payload_bytes, cfg())
    return SendResponse(chosen=chosen, facts_sent=truth.to_dict(), tiers=reports)


@app.get("/api/picker")
def picker(lang: Lang, text: str = Query(max_length=600)) -> list[dict[str, Any]]:
    """Which tier the link meter picks for this message at each link rate and loss level."""
    secs = len(text) / CHARS_PER_SECOND
    nbytes = len(pack_transcript(text, zdict(lang)))
    lk = cfg()["link"]
    return [
        {"rate_kbps": r, "loss_percent": p, "tier": pick_tier(r, p, secs, nbytes, cfg())}
        for r in lk["rates_kbps"]
        for p in lk["loss_percent"]
    ]


@app.get("/api/curve")
def get_curve() -> list[dict[str, Any]]:
    path = Path("results/curve.json")
    if not path.exists():
        raise HTTPException(404, "The curve has not been built yet (run scripts.run_stage tiers).")
    data: list[dict[str, Any]] = json.loads(path.read_text("utf-8"))
    return data


@app.post("/api/teachback")
def teachback(req: TeachbackRequest) -> dict[str, Any]:
    """Compare the facts a receiver read back with the facts that were sent."""
    truth, said = extract(req.sent), extract(req.readback)
    missing: list[Any] = []
    wrong: list[Any] = []
    for kind in ("places", "numbers", "times"):
        t, h = Counter(getattr(truth, kind)), Counter(getattr(said, kind))
        missing += [[kind, k] for k in (t - h).elements()]
        wrong += [[kind, k] for k in (h - t).elements()]
    return {
        "match": not missing and not wrong,
        "missing": missing,
        "wrong": wrong,
        "sent": truth.to_dict(),
        "readback": said.to_dict(),
    }


# ---- credits and live Gnani endpoints -------------------------------------------------------


class EstimateRequest(BaseModel):
    kind: Literal["stt", "tts"]
    audio_seconds: float = Field(0, ge=0, le=30)
    characters: int = Field(0, ge=0, le=5000)


class CalibrateRequest(BaseModel):
    remaining: float = Field(ge=0)


class TtsRequest(BaseModel):
    text: str = Field(min_length=1, max_length=1000)
    language: Literal[
        "ml-IN", "hi-IN", "en-IN", "bn-IN", "gu-IN", "kn-IN", "mr-IN", "pa-IN", "ta-IN", "te-IN"
    ]
    voice: str
    speed: float = Field(1.0, ge=0.85, le=1.15)
    sample_rate: Literal[8000, 16000, 22050, 24000, 44100, 48000] = 16000
    container: Literal["wav", "mp3", "ogg"] = "wav"
    confirm: bool = False


@app.get("/api/voices")
def voices() -> list[str]:
    return VOICES


@app.get("/api/usage")
def usage() -> dict[str, Any]:
    """Spend summary, meter state and the full ledger table (no secrets are stored in it)."""
    c = cfg()["credits"]
    rows = ledger_rows()
    table = [
        {
            "time": r.get("timestamp"),
            "kind": r["kind"],
            "language": r.get("language"),
            "size": r.get("audio_seconds") if r["kind"] == "stt" else r.get("characters"),
            "size_unit": "s" if r["kind"] == "stt" else "chars",
            "attempts": r.get("attempts", 0),
            "credits": credits.row_credits(c, r) if credits.rates_configured(c) else None,
            "cache_hit": bool(r.get("cache_hit")),
            "status": r.get("status"),
        }
        for r in rows
    ]
    return {**usage_now(), "live": live(), "queue": _queue["waiting"], "ledger": table}


@app.post("/api/usage/calibrate")
def calibrate(
    req: CalibrateRequest, x_access_code: str | None = Header(default=None)
) -> dict[str, Any]:
    """Set the remaining balance read from the Gnani dashboard; spend after it counts down from it."""
    check_access(x_access_code)
    credits.save_calibration(
        cfg()["credits"]["calibration_file"], req.remaining, len(ledger_rows())
    )
    return usage_now()


@app.post("/api/estimate")
def estimate(req: EstimateRequest) -> dict[str, Any]:
    c = cfg()["credits"]
    est = credits.estimate(c, req.kind, req.audio_seconds, req.characters)
    amount = est if est is not None else 1
    return {
        "credits": est,
        "rate_configured": credits.rates_configured(c),
        "units": {"audio_seconds": req.audio_seconds}
        if req.kind == "stt"
        else {"characters": req.characters},
        "confirm_needed": amount > c["confirm_above"],
        "meter": usage_now(),
    }


def to_wav16k(upload: bytes, suffix: str) -> tuple[bytes, float]:
    """Any browser audio (webm, ogg, mp3, wav) to 16 kHz mono WAV with ffmpeg; temp files removed."""
    if not shutil.which("ffmpeg"):
        raise HTTPException(500, "ffmpeg is not installed on the server.")
    tmp = Path(tempfile.mkdtemp(prefix="tinytalk-"))
    try:
        src, dst = tmp / f"in{suffix}", tmp / "out.wav"
        src.write_bytes(upload)
        run = subprocess.run(
            ["ffmpeg", "-v", "error", "-y", "-i", str(src), "-ac", "1", "-ar", "16000", str(dst)],
            capture_output=True,
            check=False,
        )
        if run.returncode != 0 or not dst.exists():
            raise HTTPException(400, "The audio file could not be read.")
        wav = dst.read_bytes()
        pcm, rate = codec.wav_to_pcm(wav)
        return wav, len(pcm) / rate
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


@app.post("/api/stt", dependencies=[Depends(live_guard)])
async def stt(
    audio_file: UploadFile = File(...),
    language_code: str = Form("indic-auto"),
    format: Literal["verbatim", "transcribe", "codemix", "transliterate"] = Form("transcribe"),
    keyterms: str = Form(""),
    topic: str = Form(""),
    confirm: bool = Form(False),
) -> dict[str, Any]:
    """Prisma speech to text through the cached, capped client. Max 30 s and the configured size."""
    lc = cfg()["live"]
    if (audio_file.content_type or "").split(";")[0] not in lc["upload_types"]:
        raise HTTPException(415, f"Audio type {audio_file.content_type} is not accepted.")
    data = await audio_file.read(lc["max_upload_bytes"] + 1)
    if len(data) > lc["max_upload_bytes"]:
        raise HTTPException(413, "The audio file is too large.")
    wav, seconds = to_wav16k(data, Path(audio_file.filename or "a.webm").suffix or ".webm")
    if seconds > lc["max_audio_seconds"]:
        raise HTTPException(
            413, f"Audio is {seconds:.1f} s; the limit is {lc['max_audio_seconds']} s."
        )
    est = credits.estimate(cfg()["credits"], "stt", audio_seconds=seconds)
    need_confirm(est, confirm)
    langs = [x.strip() for x in language_code.split(",") if x.strip()] or ["indic-auto"]
    terms = [x.strip() for x in keyterms.split(",") if x.strip()][:200]
    before = len(ledger_rows())
    _queue["waiting"] += 1
    try:
        result = gnani().stt(wav, langs, format, terms or None, topic or None)
    finally:
        _queue["waiting"] -= 1
    return {
        "result": result,
        "audio_seconds": round(seconds, 2),
        "estimate": est,
        "actual": spend_since(before),
        "usage": usage_now(),
    }


@app.post("/api/tts", dependencies=[Depends(live_guard)])
def tts(req: TtsRequest) -> dict[str, Any]:
    """Timbre text to speech, one request at a time (the client holds one lock for all calls)."""
    if req.voice not in VOICES:
        raise HTTPException(422, "Unknown timbre-v3.0 voice.")
    est = credits.estimate(cfg()["credits"], "tts", characters=len(req.text))
    need_confirm(est, req.confirm)
    audio_config = {
        "sample_rate": req.sample_rate,
        "encoding": "linear_pcm",
        "num_channels": 1,
        "sample_width": 2,
        "container": req.container,
    }
    before = len(ledger_rows())
    _queue["waiting"] += 1
    try:
        audio = gnani().tts(req.text, req.language, req.voice, req.speed, audio_config)
    finally:
        _queue["waiting"] -= 1
    mime = {"wav": "audio/wav", "mp3": "audio/mpeg", "ogg": "audio/ogg"}[req.container]
    return {
        "audio_b64": base64.b64encode(audio).decode(),
        "content_type": mime,
        "estimate": est,
        "actual": spend_since(before),
        "usage": usage_now(),
    }
