"""Corpus: schema, split and determinism."""

import json
from pathlib import Path

from tinytalk import corpus


def test_build_is_deterministic_and_split_is_30_70() -> None:
    a, split_a = corpus.build(1108, 0.3)
    b, _ = corpus.build(1108, 0.3)
    assert a == b
    assert (len(split_a["dev"]), len(split_a["test"])) == (12, 28)
    assert not set(split_a["dev"]) & set(split_a["test"])
    assert len(a) == 120


def test_schema_and_digits(tmp_path: Path) -> None:
    corpus.export(tmp_path / "c", tmp_path / "r", 1108, 0.3)
    for lang in ("ml", "hi", "en"):
        rows = corpus.load(tmp_path / "c", lang)
        assert len(rows) == 40
        for r in rows:
            assert set(r) == {"id", "index", "lang", "category", "text", "facts", "split"}
            assert r["split"] in {"dev", "test"} and r["facts"]["places"] and r["facts"]["numbers"]
            assert not any(c in r["text"] for c in "०१२३४५६७८९൦൧൨൩൪൫൬൭൮൯")  # Arabic digits only
    assert json.loads((tmp_path / "c" / "split.json").read_text())["seed"] == 1108
    assert (tmp_path / "r" / "malayalam_review.md").exists()
