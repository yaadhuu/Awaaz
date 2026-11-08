"""Credit accounting from the ledger: estimates, spend, remaining, warnings and the hard cap.

Gnani publishes no prices, so the conversion rates live in config.yaml and may be null. Until they
are set, spend is shown in audio seconds and characters, and the cap counts live attempts instead."""

import json
import time
from collections import defaultdict
from pathlib import Path
from typing import Any

MAX_CLIP_SECONDS = 30.0  # Prisma refuses longer audio, so a larger ledger value is a logging error


def secs(row: dict[str, Any]) -> float:
    """Audio seconds of a row; the first smoke-test row logged a bogus WAV length, so clamp to 30."""
    return min(float(row.get("audio_seconds") or 0.0), MAX_CLIP_SECONDS)


def load_ledger(path: str | Path) -> list[dict[str, Any]]:
    """All ledger rows (one JSON object per line); empty if the file does not exist."""
    p = Path(path)
    if not p.exists():
        return []
    return [json.loads(x) for x in p.read_text("utf-8").splitlines() if x.strip()]


def rates_configured(c: dict[str, Any]) -> bool:
    return (
        c.get("credits_per_audio_second") is not None and c.get("credits_per_1k_chars") is not None
    )


def estimate(
    c: dict[str, Any], kind: str, audio_seconds: float = 0.0, characters: int = 0
) -> float | None:
    """Credits one call should cost, or None if the rate for that kind is not configured."""
    if kind == "stt":
        rate = c.get("credits_per_audio_second")
        return None if rate is None else round(rate * audio_seconds, 3)
    rate = c.get("credits_per_1k_chars")
    return None if rate is None else round(rate * characters / 1000, 3)


def row_credits(c: dict[str, Any], row: dict[str, Any]) -> float | None:
    """Estimated credits of one ledger row: 0 for cache hits, attempts count as separate calls."""
    if row.get("cache_hit"):
        return 0.0
    one = estimate(c, row["kind"], secs(row), row.get("characters") or 0)
    return None if one is None else one * max(1, row.get("attempts", 1))


def level(share: float, warn_at: list[float]) -> str:
    """ok, warn50, warn80, warn95 or stop for a share of the cap."""
    if share >= 1:
        return "stop"
    passed = [w for w in sorted(warn_at) if share >= w]
    return f"warn{round(passed[-1] * 100)}" if passed else "ok"


def summary(
    c: dict[str, Any], rows: list[dict[str, Any]], calibration: dict[str, Any] | None
) -> dict[str, Any]:
    """Totals, spend by day and kind, remaining credits and the meter state."""
    live_rows = [r for r in rows if not r.get("cache_hit")]
    calls = sum(r.get("attempts", 1) for r in live_rows)
    seconds = sum(secs(r) for r in live_rows if r["kind"] == "stt")
    chars = sum(r.get("characters") or 0 for r in live_rows if r["kind"] == "tts")
    configured = rates_configured(c)
    spent = sum(row_credits(c, r) or 0.0 for r in live_rows) if configured else None

    by_day: dict[str, dict[str, float]] = defaultdict(
        lambda: {"stt": 0.0, "tts": 0.0, "calls": 0.0}
    )
    for r in live_rows:
        day = str(r.get("timestamp", ""))[:10]
        by_day[day]["calls"] += r.get("attempts", 1)
        by_day[day][r["kind"]] += (row_credits(c, r) or 0.0) if configured else r.get("attempts", 1)

    remaining = None
    if configured:
        if calibration:
            since = rows[calibration["ledger_rows"] :]
            remaining = calibration["remaining"] - sum(row_credits(c, r) or 0.0 for r in since)
        else:
            remaining = c["starting_balance"] - (spent or 0.0)

    if configured:
        share = (spent or 0.0) / c["cap_credits"]
        cap, used, unit = c["cap_credits"], spent, "credits"
    else:
        share = calls / c["cap_calls"]
        cap, used, unit = c["cap_calls"], calls, "calls"
    return {
        "rate_configured": configured,
        "unit": unit,
        "used": used,
        "cap": cap,
        "share": share,
        "level": level(share, c["warn_at"]),
        "remaining_credits": remaining,
        "starting_balance": c["starting_balance"],
        "calibrated": calibration is not None,
        "calls": calls,
        "audio_seconds": round(seconds, 2),
        "characters": chars,
        "by_day": dict(sorted(by_day.items())),
        "by_kind": {
            k: sum(r.get("attempts", 1) for r in live_rows if r["kind"] == k)
            for k in ("stt", "tts")
        },
    }


def today_calls(rows: list[dict[str, Any]]) -> int:
    today = time.strftime("%Y-%m-%d")
    return sum(
        r.get("attempts", 1)
        for r in rows
        if not r.get("cache_hit") and str(r.get("timestamp", "")).startswith(today)
    )


def load_calibration(path: str | Path) -> dict[str, Any] | None:
    p = Path(path)
    if not p.exists():
        return None
    data: dict[str, Any] = json.loads(p.read_text("utf-8"))
    return data


def save_calibration(path: str | Path, remaining: float, ledger_rows: int) -> dict[str, Any]:
    """Remember the dashboard balance; later spend is counted from this ledger position."""
    data = {
        "remaining": remaining,
        "ledger_rows": ledger_rows,
        "at": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
    }
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text(json.dumps(data, indent=1), "utf-8")
    return data
