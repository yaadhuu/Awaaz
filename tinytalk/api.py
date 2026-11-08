"""Thin FastAPI layer over the library. Replay by default; LIVE=1 allows real Gnani calls."""

import json
import os
from collections import Counter
from functools import lru_cache
from pathlib import Path
from typing import Any, Literal

import yaml
from fastapi import Depends, FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from tinytalk import corpus, pipeline
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
    return Gnani(
        c["paths"]["cache"],
        c["paths"]["ledger"],
        replay=not live(),
        max_calls=c["credits"]["max_calls"],
    )


def require_token(x_tinytalk_token: str | None = Header(default=None)) -> None:
    """In LIVE mode a request can spend credits, so it must carry the TINYTALK_TOKEN secret."""
    token = os.environ.get("TINYTALK_TOKEN")
    if live() and (not token or x_tinytalk_token != token):
        raise HTTPException(
            401, "LIVE mode needs the X-Tinytalk-Token header (set TINYTALK_TOKEN)."
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
        ),
        pipeline.audio_seconds(wav),
    )  # fmt: skip


@app.get("/api/health")
def health() -> dict[str, Any]:
    return {"ok": True, "live": live()}


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
