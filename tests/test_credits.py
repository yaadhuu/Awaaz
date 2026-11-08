"""Credit math: estimates, warning levels, the cap, calibration."""

from pathlib import Path

from tinytalk import credits

BASE = {
    "starting_balance": 5000,
    "credits_per_audio_second": None,
    "credits_per_1k_chars": None,
    "cap_credits": 100,
    "cap_calls": 10,
    "warn_at": [0.5, 0.8, 0.95],
}


def row(kind: str, hit: bool = False, secs: float = 0.0, chars: int = 0, attempts: int = 1) -> dict:  # type: ignore[type-arg]
    return {
        "kind": kind,
        "cache_hit": hit,
        "audio_seconds": secs,
        "characters": chars,
        "attempts": 0 if hit else attempts,
        "timestamp": "2026-11-09T10:00:00+0530",
    }


def test_no_rate_means_no_credit_estimate_and_cap_counts_calls() -> None:
    assert credits.estimate(BASE, "stt", audio_seconds=10) is None
    s = credits.summary(
        BASE, [row("stt", secs=5), row("tts", chars=100), row("stt", hit=True)], None
    )
    assert (s["rate_configured"], s["unit"], s["used"], s["cap"]) == (False, "calls", 2, 10)
    assert s["remaining_credits"] is None
    assert s["audio_seconds"] == 5 and s["characters"] == 100


def test_estimates_with_rates_and_retries_cost_each_attempt() -> None:
    c = {**BASE, "credits_per_audio_second": 0.5, "credits_per_1k_chars": 2.0}
    assert credits.estimate(c, "stt", audio_seconds=10) == 5.0
    assert credits.estimate(c, "tts", characters=500) == 1.0
    assert credits.row_credits(c, row("stt", secs=10, attempts=3)) == 15.0
    assert credits.row_credits(c, row("stt", hit=True, secs=10)) == 0.0
    s = credits.summary(c, [row("stt", secs=10), row("tts", chars=500)], None)
    assert s["used"] == 6.0 and s["remaining_credits"] == 4994.0 and s["unit"] == "credits"


def test_warning_levels_and_stop() -> None:
    w = BASE["warn_at"]
    assert [credits.level(x, w) for x in (0.1, 0.5, 0.85, 0.96, 1.0)] == [  # type: ignore[arg-type]
        "ok",
        "warn50",
        "warn80",
        "warn95",
        "stop",
    ]


def test_cap_level_reaches_stop() -> None:
    rows = [row("stt", secs=1) for _ in range(9)]
    assert credits.summary(BASE, rows, None)["level"] == "warn80"
    assert credits.summary(BASE, rows + [row("tts", chars=10)], None)["level"] == "stop"


def test_calibration_counts_from_the_dashboard_balance(tmp_path: Path) -> None:
    c = {**BASE, "credits_per_audio_second": 1.0, "credits_per_1k_chars": 1.0}
    rows = [row("stt", secs=100), row("stt", secs=4)]
    cal = credits.save_calibration(tmp_path / "cal.json", 1000, ledger_rows=1)
    assert credits.load_calibration(tmp_path / "cal.json") == cal
    assert credits.summary(c, rows, cal)["remaining_credits"] == 996.0
