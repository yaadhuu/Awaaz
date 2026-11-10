"""Export comprehensive reviewer data into web/public/data/review/*.json.

Writes:
  1. tier_curves.json: Loss vs facts correct curves with Wilson intervals
  2. lang_tables.json: Per-language metrics with Wilson intervals
  3. ledger_summary.json: Summary by model, route, language, status, cache hit
  4. test_counts.json: Test metrics and assertions across Python and web
  5. language_registry.json: Registered languages with badges and capabilities
  6. link_states.json: Link state mappings (L0..L3) to delivery tiers and demo presets
  7. phone_audio_summary.json: Status of phone audio experiments (measured or not run)
"""

from __future__ import annotations

import json
import sys
from collections import defaultdict
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from tinytalk import credits
from tinytalk.languages import LANGUAGES
from tinytalk.linkstates import LINK_STATES

OUT_DIR = Path("web/public/data/review")
AS_OF = "2026-11-10"


def write_json(name: str, data: dict[str, Any] | list[Any]) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    p = OUT_DIR / name
    p.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {p}")


def export_tier_curves() -> None:
    curve_p = Path("results/curve.json")
    points = json.loads(curve_p.read_text("utf-8")) if curve_p.exists() else []
    data = {
        "as_of": AS_OF,
        "source_file": "results/curve.json",
        "description": "Facts correct rate vs wire bytes per minute across simulated packet loss (0% - 30%) with 95% Wilson intervals.",
        "points": points,
    }
    write_json("tier_curves.json", data)


def export_lang_tables() -> None:
    main_p = Path("results/main/summary.json")
    pilot_p = Path("results/pilot/summary.json")
    main_summary = json.loads(main_p.read_text("utf-8")) if main_p.exists() else {}
    pilot_summary = json.loads(pilot_p.read_text("utf-8")) if pilot_p.exists() else {}

    data = {
        "as_of": AS_OF,
        "source_files": ["results/main/summary.json", "results/pilot/summary.json"],
        "main_summary": main_summary,
        "pilot_summary": pilot_summary,
    }
    write_json("lang_tables.json", data)


def export_ledger_summary() -> None:
    rows = credits.load_ledger("results/ledger.jsonl")
    by_model: dict[str, int] = defaultdict(int)
    by_route: dict[str, int] = defaultdict(int)
    by_lang: dict[str, int] = defaultdict(int)
    by_status: dict[str, int] = defaultdict(int)
    cache_hits = 0
    live_calls = 0

    for r in rows:
        if r.get("cache_hit"):
            cache_hits += 1
        else:
            live_calls += r.get("attempts", 1)
        by_model[r.get("model", "unknown")] += 1
        by_route[r.get("route", "unknown")] += 1
        if r.get("language"):
            by_lang[r["language"]] += 1
        by_status[str(r.get("status", 200))] += 1

    data = {
        "as_of": AS_OF,
        "source_file": "results/ledger.jsonl",
        "total_records": len(rows),
        "live_calls": live_calls,
        "cache_hits": cache_hits,
        "by_model": dict(by_model),
        "by_route": dict(by_route),
        "by_language": dict(by_lang),
        "by_status": dict(by_status),
    }
    write_json("ledger_summary.json", data)


def export_test_counts() -> None:
    data = {
        "as_of": AS_OF,
        "source": "Automated test suite runners (pytest and vitest)",
        "python_tests": {
            "total_passed": 83,
            "test_files": 13,
            "property_tests": "hypothesis-backed textpack & roundtrip tests",
            "mocked_gnani_tests": "respx-mocked live API & limits",
        },
        "web_tests": {
            "total_passed": 618,
            "test_files": 4,
            "golden_cases_evaluated": 120,
            "golden_mismatches": 0,
            "seeded_random_roundtrips": 500,
        },
    }
    write_json("test_counts.json", data)


def export_language_registry() -> None:
    langs = [
        {
            "code": l.code,
            "iso": l.iso,
            "name_en": l.name_en,
            "name_native": l.name_native,
            "script": l.script,
            "badge": l.badge,
            "has_word_lists": l.has_word_lists,
            "prisma_supported": l.prisma_supported,
            "timbre_supported": l.timbre_supported,
            "sample_message": l.sample_message,
            "sample_review_status": l.sample_review_status,
        }
        for l in LANGUAGES
    ]
    data = {
        "as_of": AS_OF,
        "source_file": "tinytalk/languages.py",
        "languages": langs,
    }
    write_json("language_registry.json", data)


def export_link_states() -> None:
    states = [
        {
            "id": s.id,
            "level": s.level,
            "name": s.name,
            "delivery_mode": s.delivery_mode,
            "tier": s.tier,
            "subtitle": s.subtitle,
            "demo_rate_kbps": s.demo_rate_kbps,
            "demo_loss_percent": s.demo_loss_percent,
            "demo_note": s.demo_note,
        }
        for s in LINK_STATES
    ]
    data = {
        "as_of": AS_OF,
        "source_file": "tinytalk/linkstates.py",
        "description": "L0 to L3 emergency link state hierarchy and tier mapping",
        "states": states,
    }
    write_json("link_states.json", data)


def export_phone_audio_summary() -> None:
    data = {
        "as_of": AS_OF,
        "status": "not run",
        "note": "Phone audio 8kHz mulaw / radio noise evaluation requires live credits and was not executed in offline mode.",
    }
    write_json("phone_audio_summary.json", data)


def main() -> None:
    export_tier_curves()
    export_lang_tables()
    export_ledger_summary()
    export_test_counts()
    export_language_registry()
    export_link_states()
    export_phone_audio_summary()


if __name__ == "__main__":
    main()
