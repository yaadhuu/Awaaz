"""Voice teach-back comparison and verification logic."""

from __future__ import annotations

from collections import Counter
from typing import Any

from tinytalk.facts import Facts, extract


def compare_facts(sent_facts: Facts, readback_facts: Facts) -> dict[str, Any]:
    """Compare sent facts against read-back facts.
    Returns whether they match, any missing facts, and any extra/wrong facts.
    """
    missing: list[list[Any]] = []
    wrong: list[list[Any]] = []
    for kind in ("places", "numbers", "times"):
        t = Counter(getattr(sent_facts, kind))
        h = Counter(getattr(readback_facts, kind))
        missing += [[kind, k] for k in (t - h).elements()]
        wrong += [[kind, k] for k in (h - t).elements()]

    match = not missing and not wrong
    return {
        "status": "Confirmed" if match else "Check",
        "match": match,
        "missing": missing,
        "wrong": wrong,
        "mismatches": [
            f"Missing {kind}: {k}" for kind, k in missing
        ] + [
            f"Incorrect {kind}: {k}" for kind, k in wrong
        ],
        "sent": sent_facts.to_dict(),
        "readback": readback_facts.to_dict(),
    }


def verify_teachback(sent_text: str, readback_text: str) -> dict[str, Any]:
    """Extract facts from sent and readback texts and compare."""
    sent_f = extract(sent_text)
    read_f = extract(readback_text)
    return compare_facts(sent_f, read_f)
