"""The facts-versus-bytes curve and its statistics (Wilson intervals, bootstrap intervals)."""

import math
import random
from collections import defaultdict
from collections.abc import Callable, Sequence
from typing import Any


def wilson(k: int, n: int, z: float = 1.96) -> tuple[float, float]:
    """95% Wilson score interval for k successes out of n."""
    if n == 0:
        return (0.0, 1.0)
    p = k / n
    d = 1 + z * z / n
    centre = (p + z * z / (2 * n)) / d
    half = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return (max(0.0, centre - half), min(1.0, centre + half))


def bootstrap_ci(
    values: Sequence[float],
    seed: int,
    stat: Callable[[Sequence[float]], float] = lambda v: sum(v) / len(v),
    n_boot: int = 2000,
) -> tuple[float, float]:
    """95% percentile bootstrap interval of a statistic (mean by default)."""
    if not values:
        return (float("nan"), float("nan"))
    rng = random.Random(seed)
    stats = sorted(stat([rng.choice(values) for _ in values]) for _ in range(n_boot))
    return (stats[int(0.025 * n_boot)], stats[int(0.975 * n_boot) - 1])


def summarise(rows: list[dict[str, Any]], seed: int) -> dict[str, Any]:
    """Fact rate with Wilson interval, message-exact rate, mean WER and CER with bootstrap.

    Each row needs: matched, total, extra, all_exact, and optionally wer, cer."""
    k, n = sum(r["matched"] for r in rows), sum(r["total"] for r in rows)
    exact = sum(bool(r["all_exact"]) for r in rows)
    out: dict[str, Any] = {
        "messages": len(rows),
        "facts_matched": k,
        "facts_total": n,
        "facts_extra": sum(r["extra"] for r in rows),
        "fact_rate": k / n if n else None,
        "fact_rate_ci": wilson(k, n),
        "message_exact": exact,
        "message_exact_rate": exact / len(rows) if rows else None,
        "message_exact_ci": wilson(exact, len(rows)),
    }
    for key in ("wer", "cer"):
        vals = [r[key] for r in rows if r.get(key) is not None]
        if vals:
            out[key] = sum(vals) / len(vals)
            out[f"{key}_ci"] = bootstrap_ci(vals, seed)
    return out


def curve(
    rows: list[dict[str, Any]], rates_kbps: Sequence[float] = (2, 5, 10)
) -> list[dict[str, Any]]:
    """One point per (tier, language, loss): facts correct versus bytes per minute of speech.

    Each row needs: tier, lang, loss, matched, total, payload_bytes, bytes_sent, audio_seconds,
    delivered. Airtime follows from the bytes sent, so it is computed for each link rate."""
    groups: dict[tuple[str, str, int], list[dict[str, Any]]] = defaultdict(list)
    for r in rows:
        groups[(r["tier"], r["lang"], r["loss"])].append(r)
    out = []
    for (tier, lang, loss), g in sorted(groups.items()):
        k, n = sum(r["matched"] for r in g), sum(r["total"] for r in g)
        minutes = sum(r["audio_seconds"] for r in g) / 60
        out.append(
            {
                "tier": tier,
                "lang": lang,
                "loss": loss,
                "messages": len(g),
                "fact_rate": k / n if n else None,
                "fact_rate_ci": wilson(k, n),
                "payload_bytes_per_min": sum(r["payload_bytes"] for r in g) / minutes,
                "wire_bytes_per_min": sum(r["bytes_sent"] for r in g) / minutes,
                "mean_airtime_s": {
                    str(rate): sum(r["bytes_sent"] for r in g) / len(g) * 8 / (rate * 1000)
                    for rate in rates_kbps
                },
                "delivered_rate": sum(bool(r["delivered"]) for r in g) / len(g),
            }
        )
    return out
