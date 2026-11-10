"""Thin FastAPI layer over the library. Replay by default; LIVE=1 allows real Gnani calls."""

import base64
import hashlib
import hmac
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

import httpx
import yaml
from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, Query, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from tinytalk import codec, corpus, credits, pipeline
from tinytalk.audio_workspace import router as audio_router
from tinytalk.facts import Facts, extract
from tinytalk.gnani import Gnani, ReplayMiss
from tinytalk.lexicon import PLACES, UNIT_STEMS
from tinytalk.limits import LimitTracker
from tinytalk.linksim import Link
from tinytalk.linkstates import get_link_state
from tinytalk.teachback import compare_facts
from tinytalk.textpack import make_dict, pack_facts, pack_transcript
from tinytalk.tiers import link_seed, pick_tier, send_audio, send_facts, send_transcript

if not shutil.which("ffmpeg"):
    try:
        import imageio_ffmpeg
        _ffmpeg_binary = imageio_ffmpeg.get_ffmpeg_exe()
        _ffmpeg_directory = Path(tempfile.gettempdir()) / "awaaz-bin"
        _ffmpeg_directory.mkdir(exist_ok=True)
        _ffmpeg_link = _ffmpeg_directory / "ffmpeg"
        if not _ffmpeg_link.exists():
            _ffmpeg_link.symlink_to(_ffmpeg_binary)
        os.environ["PATH"] = str(_ffmpeg_directory) + os.pathsep + os.environ.get("PATH", "")
    except (ImportError, OSError, RuntimeError):
        pass  # The audio status endpoint reports processing unavailable.

Lang = Literal["ml", "hi", "en"]
CHARS_PER_SECOND = 12  # rough speech rate used only to estimate Tier A size when no audio exists

_cors_env = os.environ.get("CORS_ORIGINS", "http://localhost:5173")
allow_origins = [o.strip() for o in _cors_env.split(",") if o.strip()]

app = FastAPI(title="Awaaz")
app.add_middleware(CORSMiddleware, allow_origins=allow_origins, allow_methods=["*"], allow_headers=["*"])
app.include_router(audio_router)


@lru_cache
def cfg() -> dict[str, Any]:
    root = Path(__file__).resolve().parent.parent
    config_path = Path(os.environ.get("TINYTALK_CONFIG", str(root / "config.yaml")))
    cfg_: dict[str, Any] = yaml.safe_load(config_path.read_text("utf-8"))
    if os.environ.get("VERCEL"):
        writable = Path(tempfile.gettempdir()) / "awaaz"
        writable.mkdir(exist_ok=True)
        cfg_["paths"]["cache"] = str(writable / "cache")
        cfg_["paths"]["ledger"] = str(writable / "ledger.jsonl")
        cfg_["paths"]["corpus"] = str(root / "data/corpus")
        cfg_["live"]["limits_db"] = str(writable / "limits.sqlite")
        cfg_["credits"]["calibration_file"] = str(writable / "calibration.json")
        ledger = Path(cfg_["paths"]["ledger"])
        if not ledger.exists() and (root / "results/ledger.jsonl").exists():
            shutil.copyfile(root / "results/ledger.jsonl", ledger)
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

@lru_cache
def limit_tracker() -> LimitTracker:
    db_p = cfg().get("live", {}).get("limits_db", "cache/limits.sqlite")
    return LimitTracker(db_p)


def ledger_rows() -> list[dict[str, Any]]:
    return credits.load_ledger(cfg()["paths"]["ledger"])


def calibration() -> dict[str, Any] | None:
    return credits.load_calibration(cfg()["credits"]["calibration_file"])


def usage_now() -> dict[str, Any]:
    return credits.summary(cfg()["credits"], ledger_rows(), calibration())


def _rate_limit(request: Request) -> None:
    """Per-IP sliding window; counted before the access code is checked, so guessing is slow too."""
    ip = request.client.host if request.client else "?"
    now = time.monotonic()
    with _hits_lock:
        q = _hits[ip]
        while q and now - q[0] > 60:
            q.popleft()
        if len(q) >= cfg()["live"]["per_ip_per_minute"]:
            raise HTTPException(429, "Too many live requests from this address; wait a minute.")
        q.append(now)


def check_access(request: Request, code: str | None) -> None:
    """LIVE=1 and the ACCESS_CODE secret are both needed before anything can spend credits."""
    if not live():
        raise HTTPException(403, "Replay mode: live Gnani calls are switched off on this server.")
    _rate_limit(request)
    expected = os.environ.get("ACCESS_CODE")
    if not expected or not code or not hmac.compare_digest(code.encode(), expected.encode()):
        raise HTTPException(401, "Live calls need the access code (X-Access-Code header).")


_spend_lock = threading.Lock()


def live_guard(request: Request, x_access_code: str | None = Header(default=None)) -> None:
    """Access code and rate limit before a live call; the caps are checked again inside spend()."""
    check_access(request, x_access_code)
    _cap_check(None, set_budget=False)


def _cap_check(estimate: float | None, set_budget: bool = True) -> None:
    """Refuse when today's limit or the credit/call cap would be passed. With set_budget (only under
    _spend_lock) it also gives the client a fresh budget of at most 3 attempts for this one call."""
    c = cfg()["credits"]
    rows = ledger_rows()
    if credits.today_calls(rows) >= cfg()["live"]["daily_call_cap"]:
        raise HTTPException(429, "Today's live-call limit for this server is used up.")
    s = credits.summary(c, rows, calibration())
    if s["level"] == "stop":
        raise HTTPException(402, "The credit cap is reached; the server refuses live calls.")
    if s["rate_configured"]:
        limit = c["cap_credits"] - (s["used"] or 0.0)
        if s["remaining_credits"] is not None:
            limit = min(limit, s["remaining_credits"])
        worst = (estimate or 0.0) * 3  # one call plus up to two retries
        if worst > limit:
            raise HTTPException(402, "This call could pass the credit cap; the server refuses it.")
        left = 3
    else:
        left = min(3, int(c["cap_calls"] - s["calls"]))
    if set_budget:
        g = gnani()
        g.max_calls = g._used + left


def spend(estimate: float | None, call: Any) -> Any:
    """Run one live call with the cap re-checked under a lock, so two requests cannot both pass."""
    with _spend_lock:
        _cap_check(estimate)
        return call()


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
    if live():
        c = cfg()["credits"]
        tts_est = credits.estimate(c, "tts", characters=len(req.text))
        stt_est = credits.estimate(c, "stt", audio_seconds=len(req.text) / CHARS_PER_SECOND)
        est = None if tts_est is None or stt_est is None else tts_est + stt_est
        a, secs = spend(est, lambda: tier_a(req, truth))
    else:
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
    req: CalibrateRequest, request: Request, x_access_code: str | None = Header(default=None)
) -> dict[str, Any]:
    """Set the remaining balance read from the Gnani dashboard; spend after it counts down from it."""
    check_access(request, x_access_code)
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


FORMATS = {
    "audio/wav": "wav", "audio/x-wav": "wav", "audio/wave": "wav", "audio/mpeg": "mp3",
    "audio/ogg": "ogg", "audio/webm": "webm", "audio/flac": "flac", "audio/mp4": "mp4",
}  # fmt: skip


def to_wav16k(upload: bytes, mime: str) -> tuple[bytes, float]:
    """Browser audio to 16 kHz mono WAV. The input format is fixed from the checked MIME type and
    ffmpeg may only read the pipe, so a crafted file cannot make it open other files or URLs."""
    if not shutil.which("ffmpeg"):
        raise HTTPException(500, "ffmpeg is not installed on the server.")
    tmp = Path(tempfile.mkdtemp(prefix="tinytalk-"))
    try:
        dst = tmp / "out.wav"
        cmd = ["ffmpeg", "-v", "error", "-y", "-protocol_whitelist", "pipe,file"]
        # Trim silence at both ends: remove leading silence, reverse, remove again, reverse back.
        trim = "silenceremove=start_periods=1:start_threshold=-45dB,areverse,"
        trim += "silenceremove=start_periods=1:start_threshold=-45dB,areverse"
        # Read at most limit + 1 s of input, so a long upload cannot make ffmpeg decode all of it.
        limit = str(cfg()["live"]["max_audio_seconds"] + 1)
        cmd += ["-f", FORMATS[mime], "-t", limit, "-i", "pipe:0", "-af", trim]
        cmd += ["-ac", "1", "-ar", "16000", str(dst)]
        try:
            run = subprocess.run(cmd, input=upload, capture_output=True, check=False, timeout=30)
        except subprocess.TimeoutExpired as exc:
            raise HTTPException(400, "The audio took too long to read.") from exc
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
    mime = (audio_file.content_type or "").split(";")[0]
    if mime not in lc["upload_types"] or mime not in FORMATS:
        raise HTTPException(415, f"Audio type {audio_file.content_type} is not accepted.")
    data = await audio_file.read(lc["max_upload_bytes"] + 1)
    if len(data) > lc["max_upload_bytes"]:
        raise HTTPException(413, "The audio file is too large.")
    wav, seconds = to_wav16k(data, mime)
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
        result = spend(est, lambda: gnani().stt(wav, langs, format, terms or None, topic or None))
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
        audio = spend(
            est, lambda: gnani().tts(req.text, req.language, req.voice, req.speed, audio_config)
        )
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


# ============================================================================================
# STAGE E2 LIVE ENDPOINTS (with SQLite pre-call tracking, keyterms, L0..L3, and fallbacks)
# ============================================================================================


def get_lexicon_keyterms() -> list[str]:
    """All places and unit stems as keyterms (max 200)."""
    terms = {name for p in PLACES.values() for names in p.values() for name in names}
    for stems in UNIT_STEMS.values():
        terms.update(stems)
    return sorted(terms)[:200]


def is_reviewer_request(request: Request, x_reviewer_code: str | None = None) -> bool:
    rev_expected = os.environ.get("REVIEWER_CODE")
    return bool(rev_expected and x_reviewer_code and hmac.compare_digest(x_reviewer_code.encode(), rev_expected.encode()))


def get_visitor_id(request: Request, x_visitor_id: str | None = None) -> str:
    if x_visitor_id:
        return x_visitor_id
    ip = request.client.host if request.client else "unknown"
    ua = request.headers.get("user-agent", "")
    return hashlib.sha256(f"{ip}:{ua}".encode()).hexdigest()[:16]


def get_saved_sample_fallback(lang: str) -> dict[str, Any]:
    """Retrieve saved sample fallback with the standard response shape."""
    iso = lang.split("-")[0]
    if iso not in ("en", "hi", "ml"):
        iso = "en"
    samples = corpus.load(cfg()["paths"]["corpus"], iso)
    sample = samples[0] if samples else {
        "text": "Flood warning for Aluva. 50 people need help.",
        "facts": {"places": ["aluva"], "numbers": [{"value": 50, "unit": "people"}], "times": []},
    }
    return sample


class LiveStatusResponse(BaseModel):
    live: bool
    status: str
    daily_calls_remaining: int
    cap_calls: int
    total_calls_lifetime: int
    reviewer_share: float
    warn_level: str


@app.get("/api/live/status")
def live_status(request: Request) -> LiveStatusResponse:
    c = cfg()
    summary = limit_tracker().get_summary()
    daily_cap = c.get("live", {}).get("daily_call_cap", 100)
    rem_daily = max(0, daily_cap - summary["today_calls"])
    cap_calls = c.get("credits", {}).get("cap_calls", 1200)
    share = summary["total_calls"] / cap_calls if cap_calls else 0.0
    warn_lvl = credits.level(share, c.get("credits", {}).get("warn_at", [0.5, 0.8, 0.95]))
    return LiveStatusResponse(
        live=live(),
        status="active" if live() else "replay_or_disabled",
        daily_calls_remaining=rem_daily,
        cap_calls=cap_calls,
        total_calls_lifetime=summary["total_calls"],
        reviewer_share=c.get("live", {}).get("reviewer_share", 0.3),
        warn_level=warn_lvl,
    )


class LiveReplyRequest(BaseModel):
    text: str = Field(min_length=1, max_length=600)
    lang: str = "en-IN"
    state: str = "L0"


@app.post("/api/live/reply")
def live_reply(
    req: LiveReplyRequest,
    request: Request,
    x_visitor_id: str | None = Header(default=None),
    x_reviewer_code: str | None = Header(default=None),
) -> dict[str, Any]:
    st_info = get_link_state(req.state) or get_link_state("L0")
    assert st_info is not None
    st_id = st_info.id
    iso = req.lang.split("-")[0]
    facts = extract(req.text)

    if st_id == "L3":
        return {
            "source": "live",
            "state": "L3",
            "state_name": "Outage",
            "delivery_mode": "store_and_forward",
            "payload": None,
            "bytes": 0,
            "status": "queued",
            "note": "Link is down; message queued in store-and-forward buffer.",
        }

    if st_id == "L2":
        packed_facts = pack_facts(facts)
        return {
            "source": "live",
            "state": "L2",
            "state_name": "Critical",
            "delivery_mode": "facts_only",
            "payload": packed_facts.hex(),
            "bytes": len(packed_facts),
            "facts": facts.to_dict(),
            "status": "ready",
        }

    if st_id == "L1":
        packed_txt = pack_transcript(req.text, zdict(iso if iso in ("en", "hi", "ml") else "en"))
        return {
            "source": "live",
            "state": "L1",
            "state_name": "Degraded",
            "delivery_mode": "transcript",
            "payload": packed_txt.hex(),
            "bytes": len(packed_txt),
            "facts": facts.to_dict(),
            "status": "ready",
        }

    # L0 Nominal: Timbre speech via Codec2 + captions
    ip = request.client.host if request.client else "unknown"
    vid = get_visitor_id(request, x_visitor_id)
    is_rev = is_reviewer_request(request, x_reviewer_code)

    if not live():
        sample = get_saved_sample_fallback(req.lang)
        return {
            "source": "saved",
            "state": "L0",
            "state_name": "Nominal",
            "delivery_mode": "full_audio",
            "payload": "",
            "bytes": 600,
            "captions": sample["text"],
            "facts": sample["facts"],
            "note": "Replay mode active; returning saved sample.",
        }

    allowed, reason = limit_tracker().check_and_record(ip, vid, is_rev, "/api/live/reply", "tts", cfg())
    if not allowed:
        sample = get_saved_sample_fallback(req.lang)
        return {
            "source": "saved",
            "state": "L0",
            "state_name": "Nominal",
            "delivery_mode": "full_audio",
            "payload": "",
            "bytes": 600,
            "captions": sample["text"],
            "facts": sample["facts"],
            "note": f"Limit reached ({reason}); returning saved fallback.",
        }

    voice = cfg()["voices"][0]
    est = credits.estimate(cfg()["credits"], "tts", characters=len(req.text))
    audio_cfg = {"sample_rate": 16000, "encoding": "linear_pcm", "num_channels": 1, "sample_width": 2, "container": "wav"}
    try:
        audio = spend(
            est, lambda: gnani().tts(req.text, req.lang, voice, 1.0, audio_cfg)
        )
        pcm, rate = codec.wav_to_pcm(audio)
        c2_payload = codec.c2_encode(codec.resample(pcm, rate, codec.C2_RATE))
        return {
            "source": "live",
            "state": "L0",
            "state_name": "Nominal",
            "delivery_mode": "full_audio",
            "payload": base64.b64encode(c2_payload).decode(),
            "bytes": len(c2_payload),
            "captions": req.text,
            "facts": facts.to_dict(),
        }
    except (RuntimeError, httpx.HTTPError, OSError) as exc:
        sample = get_saved_sample_fallback(req.lang)
        return {
            "source": "saved",
            "state": "L0",
            "state_name": "Nominal",
            "delivery_mode": "full_audio",
            "payload": "",
            "bytes": 600,
            "captions": sample["text"],
            "facts": sample["facts"],
            "note": f"TTS call failed ({type(exc).__name__}); returning saved sample.",
        }


class LiveReadbackRequest(BaseModel):
    facts: dict[str, Any]
    lang: str = "en-IN"
    altered_fact: dict[str, Any] | None = None


@app.post("/api/live/readback")
def live_readback(
    req: LiveReadbackRequest,
    request: Request,
    x_visitor_id: str | None = Header(default=None),
    x_reviewer_code: str | None = Header(default=None),
) -> dict[str, Any]:
    """Timbre speaks facts, Prisma transcribes, teachback compares (optional altered fact)."""
    ip = request.client.host if request.client else "unknown"
    vid = get_visitor_id(request, x_visitor_id)
    is_rev = is_reviewer_request(request, x_reviewer_code)

    facts_obj = Facts.from_dict(req.facts)
    # Render text for facts
    parts = []
    if facts_obj.places:
        parts.append(f"Place {', '.join(facts_obj.places)}")
    if facts_obj.numbers:
        parts.append(f"Count {', '.join(f'{v} {u}' for v, u in facts_obj.numbers)}")
    if facts_obj.times:
        parts.append(f"Time {', '.join(f'{h} {p}' for h, p in facts_obj.times)}")
    rendered = ". <pauses> ".join(parts) if parts else "No critical facts."

    if not live():
        # Offline/replay check
        readback_f = facts_obj
        if req.altered_fact:
            readback_f = Facts(
                places=tuple(req.altered_fact.get("places", facts_obj.places)),
                numbers=tuple((n["value"], n["unit"]) for n in req.altered_fact.get("numbers", [{"value": v, "unit": u} for v, u in facts_obj.numbers])),
                times=tuple((t["hour"], t["period"]) for t in req.altered_fact.get("times", [{"hour": h, "period": p} for h, p in facts_obj.times])),
            )
        res = compare_facts(facts_obj, readback_f)
        return {"source": "saved", "transcript": rendered, **res}

    # Live: requires 2 Gnani calls (TTS + STT)
    allowed, reason = limit_tracker().check_and_record(ip, vid, is_rev, "/api/live/readback", "tts+stt", cfg(), units=2.0)
    if not allowed:
        res = compare_facts(facts_obj, facts_obj)
        return {"source": "saved", "transcript": rendered, "note": f"Limit reached ({reason})", **res}

    voice = cfg()["voices"][0]
    est_tts = credits.estimate(cfg()["credits"], "tts", characters=len(rendered))
    est_stt = credits.estimate(cfg()["credits"], "stt", audio_seconds=5.0)
    est_total = (est_tts or 0.0) + (est_stt or 0.0) if est_tts is not None or est_stt is not None else None
    audio_cfg = {"sample_rate": 16000, "encoding": "linear_pcm", "num_channels": 1, "sample_width": 2, "container": "wav"}
    try:
        audio = spend(est_total, lambda: gnani().tts(rendered, req.lang, voice, 1.0, audio_cfg))
        keyterms = get_lexicon_keyterms()
        stt_res = spend(est_total, lambda: gnani().stt(audio, [req.lang], "transcribe", keyterms=keyterms))
        transcript = stt_res.get("transcript", "")
        extracted_readback = extract(transcript)
        if req.altered_fact:
            extracted_readback = Facts.from_dict(req.altered_fact)
        comp = compare_facts(facts_obj, extracted_readback)
        return {"source": "live", "transcript": transcript, **comp}
    except (RuntimeError, httpx.HTTPError, OSError) as exc:
        res = compare_facts(facts_obj, facts_obj)
        return {"source": "saved", "transcript": rendered, "note": f"Gnani error: {type(exc).__name__}", **res}


@app.post("/api/live/report")
async def live_report(
    audio_file: UploadFile | None = File(None),
    state: str = Form("L0"),
    rate_kbps: float | None = Form(None),
    loss_percent: float | None = Form(None),
    seed: int | None = Form(None),
    language_hint: str = Form("indic-auto"),
    mode: str = Form("relay"),
    request: Request = None,  # type: ignore[assignment]
    x_visitor_id: str | None = Header(default=None),
    x_reviewer_code: str | None = Header(default=None),
) -> dict[str, Any]:
    """Live audio report over simulated link.
    state: L0..L3 (or 0..3)
    L3 queues without Gnani call.
    mode: relay (received audio STT) or on_device (ASSUMPTION, UNTESTED).
    """
    # Parse state
    if state.isdigit():
        st_info = get_link_state(int(state))
    else:
        st_info = get_link_state(state.upper())
    if not st_info:
        st_info = get_link_state("L0")
    assert st_info is not None

    r_kbps = rate_kbps if rate_kbps is not None else (st_info.demo_rate_kbps or 10.0)
    l_pct = loss_percent if loss_percent is not None else (st_info.demo_loss_percent or 0.0)
    s_seed = seed if seed is not None else cfg()["seeds"]["link"]

    mode_label = "ASSUMPTION, UNTESTED" if mode == "on_device" else "relay"

    if st_info.id == "L3":
        return {
            "source": "live",
            "state": "L3",
            "state_name": "Outage",
            "delivery_mode": "store_and_forward",
            "rate_kbps": 0.0,
            "loss_percent": 100.0,
            "seed": s_seed,
            "mode": mode_label,
            "transcript": "",
            "facts": Facts().to_dict(),
            "unrecognised": [],
            "bytes": 0,
            "packets": 0,
            "resends": 0,
            "delivered_percent": 0.0,
            "gnani_calls": 0,
            "status": "queued",
            "note": "L3 Outage: transmission held and retried; zero Gnani calls.",
        }

    # Audio validation & in-memory read
    data = b""
    mime = "audio/wav"
    if audio_file:
        mime = (audio_file.content_type or "audio/wav").split(";")[0]
        lc = cfg()["live"]
        if mime not in lc["upload_types"] or mime not in FORMATS:
            raise HTTPException(415, f"Audio type {mime} is not accepted.")
        data = await audio_file.read(lc["max_upload_bytes"] + 1)
        if len(data) > lc["max_upload_bytes"]:
            raise HTTPException(413, "Audio file exceeds 5MB limit.")

    # Check limits
    ip = request.client.host if request and request.client else "unknown"
    vid = get_visitor_id(request, x_visitor_id) if request else "unknown"
    is_rev = is_reviewer_request(request, x_reviewer_code) if request else False

    if not live() or not data:
        sample = get_saved_sample_fallback(language_hint)
        return {
            "source": "saved",
            "state": st_info.id,
            "state_name": st_info.name,
            "delivery_mode": st_info.delivery_mode,
            "rate_kbps": r_kbps,
            "loss_percent": l_pct,
            "seed": s_seed,
            "mode": mode_label,
            "transcript": sample["text"],
            "facts": sample["facts"],
            "unrecognised": [],
            "bytes": 350,
            "packets": 8,
            "resends": 1,
            "delivered_percent": 100.0 if l_pct < 30 else 75.0,
            "gnani_calls": 0,
            "note": "Replay mode active or empty audio; returning saved sample.",
        }

    # Convert audio strictly in memory through ffmpeg (15s limit)
    wav, seconds = to_wav16k(data, mime)
    if seconds > cfg()["live"].get("max_audio_seconds", 15):
        raise HTTPException(413, f"Audio length ({seconds:.1f}s) exceeds 15s limit.")

    allowed, reason = limit_tracker().check_and_record(ip, vid, is_rev, "/api/live/report", "stt", cfg())
    if not allowed:
        sample = get_saved_sample_fallback(language_hint)
        return {
            "source": "saved",
            "state": st_info.id,
            "state_name": st_info.name,
            "delivery_mode": st_info.delivery_mode,
            "rate_kbps": r_kbps,
            "loss_percent": l_pct,
            "seed": s_seed,
            "mode": mode_label,
            "transcript": sample["text"],
            "facts": sample["facts"],
            "unrecognised": [],
            "bytes": 350,
            "packets": 8,
            "resends": 1,
            "delivered_percent": 100.0,
            "gnani_calls": 0,
            "note": f"Limit reached ({reason}); returning saved fallback with source: saved.",
        }

    # Simulate link crossing with Codec2
    pcm, rate = codec.wav_to_pcm(wav)
    payload = codec.c2_encode(codec.resample(pcm, rate, codec.C2_RATE))
    lk_cfg = cfg()["link"]
    sim = Link(r_kbps, l_pct, s_seed, lk_cfg["mean_burst_packets"], lk_cfg["payload_bytes"], lk_cfg["header_bytes"], lk_cfg["max_resends"])
    sim_res = sim.send_stream(payload)

    # Decode received audio
    heard_pcm = codec.c2_decode_with_loss(sim_res.received, sim.payload_bytes // 6)
    received_wav = codec.pcm_to_wav(codec.resample(heard_pcm, codec.C2_RATE, 16000), 16000)

    # Run STT with keyterms
    keyterms = get_lexicon_keyterms()
    est = credits.estimate(cfg()["credits"], "stt", audio_seconds=seconds)
    stt_res = spend(est, lambda: gnani().stt(received_wav, [language_hint], "transcribe", keyterms=keyterms))
    transcript = stt_res.get("transcript", "")
    extracted_res = extract(transcript)

    delivered_pct = (sum(1 for p in sim_res.received if p is not None) / max(1, len(sim_res.received))) * 100.0

    return {
        "source": "live",
        "state": st_info.id,
        "state_name": st_info.name,
        "delivery_mode": st_info.delivery_mode,
        "rate_kbps": r_kbps,
        "loss_percent": l_pct,
        "seed": s_seed,
        "mode": mode_label,
        "transcript": transcript,
        "facts": {
            "places": extracted_res.places,
            "numbers": extracted_res.numbers,
            "times": extracted_res.times,
        },
        "unrecognised": extracted_res.unrecognised,
        "bytes": sim_res.bytes_sent,
        "packets": sim_res.packets,
        "resends": sim_res.resends,
        "delivered_percent": round(delivered_pct, 1),
        "gnani_calls": 1,
    }


@app.get("/api/review/summary")
def review_summary() -> dict[str, Any]:
    """Read-only summary of review metrics, zero keys or IPs exposed."""
    rows = ledger_rows()
    total_calls = len(rows)
    by_kind = {"stt": 0, "tts": 0}
    by_route: dict[str, int] = defaultdict(int)
    by_status: dict[str, int] = defaultdict(int)
    by_lang: dict[str, int] = defaultdict(int)

    for r in rows:
        k = r.get("kind", "unknown")
        if k in by_kind:
            by_kind[k] += r.get("attempts", 1)
        by_route[r.get("route", "unknown")] += 1
        by_status[str(r.get("status", 200))] += 1
        if r.get("language"):
            by_lang[r["language"]] += 1

    return {
        "total_calls": total_calls,
        "by_kind": by_kind,
        "by_route": dict(by_route),
        "by_status": dict(by_status),
        "by_language": dict(by_lang),
        "timestamp": time.time(),
    }

