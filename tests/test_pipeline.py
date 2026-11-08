"""Pipeline with a fake Gnani that 'transcribes' perfectly: no network, no credits."""

from pathlib import Path
from typing import Any

import numpy as np
import yaml

from tinytalk import codec, pipeline
from tinytalk.evaluate import curve, summarise

ROOT = Path(__file__).parent.parent


class FakeGnani:
    """Speaks a tone and 'hears' the last text it spoke."""

    def __init__(self) -> None:
        self.last = ""
        self.calls = {"tts": 0, "stt": 0}

    def tts(self, text: str, *a: Any, **k: Any) -> bytes:
        self.last = text
        self.calls["tts"] += 1
        t = np.arange(32000) / 16000
        harmonics = np.sum([np.sin(2 * np.pi * 120 * j * t) / j for j in range(1, 12)], axis=0)
        return codec.pcm_to_wav((6000 * harmonics).astype(np.int16), 16000)

    def stt(self, *a: Any, **k: Any) -> dict[str, Any]:
        self.calls["stt"] += 1
        return {"transcript": self.last}


def cfg_for(tmp: Path) -> dict[str, Any]:
    cfg: dict[str, Any] = yaml.safe_load((ROOT / "config.yaml").read_text("utf-8"))
    cfg["paths"]["cache"] = str(tmp / "cache")
    cfg["paths"]["corpus"] = str(ROOT / cfg["paths"]["corpus"])
    return cfg


def test_run_clean_scores_a_perfect_transcript(tmp_path: Path) -> None:
    cfg = cfg_for(tmp_path)
    rows = pipeline.select(cfg, "dev", 2)
    assert len(rows) == 6
    recs = pipeline.run_clean(FakeGnani(), cfg, rows, ["Vasudha"], [1.0], ["off", "both"])  # type: ignore[arg-type]
    assert len(recs) == 12
    assert all(r["all_exact"] and r["wer"] == 0 for r in recs)
    assert summarise(recs, 7)["fact_rate"] == 1.0


def test_run_tiers_makes_a_record_per_message_tier_and_loss(tmp_path: Path) -> None:
    cfg = cfg_for(tmp_path)
    rows = pipeline.select(cfg, "test", 1)
    g = FakeGnani()
    clean = pipeline.run_clean(g, cfg, rows, ["Vasudha"], [1.0], ["off"])  # type: ignore[arg-type]
    recs = pipeline.run_tiers(g, cfg, rows, clean, "Vasudha", 1.0, [0, 30])  # type: ignore[arg-type]
    assert len(recs) == 3 * 3 * 2  # 3 languages x 3 tiers x 2 loss levels
    clean_loss = [r for r in recs if r["loss"] == 0]
    assert all(r["matched"] == r["total"] for r in clean_loss if r["tier"] != "A")
    by_tier = {r["tier"]: r["payload_bytes"] for r in recs if r["lang"] == "hi" and r["loss"] == 0}
    assert by_tier["C"] < by_tier["B"] < by_tier["A"]
    points = curve(recs)
    assert {p["tier"] for p in points} == {"A", "B", "C"}
    again = pipeline.run_tiers(g, cfg, rows, clean, "Vasudha", 1.0, [0, 30])  # type: ignore[arg-type]
    assert [r["bytes_sent"] for r in again] == [r["bytes_sent"] for r in recs]  # seeded, repeatable
