"""Run a live stage: pilot, main, tiers, or curve.

Without --live nothing is spent: Gnani is read from the cache only and the script reports how many
calls are missing. With --live you must also give --max-new-calls, the most calls this run may use.

  uv run python -m scripts.run_stage pilot [--live --max-new-calls N]
  uv run python -m scripts.run_stage main  --split test --voices 1 --speeds 1.0 --conditions off,both
  uv run python -m scripts.run_stage tiers --split test --losses 0,10,20,30
  uv run python -m scripts.run_stage curve     (free: rebuilds the curve from saved results)
"""

import argparse
import json
from pathlib import Path
from typing import Any, ClassVar

import numpy as np
import yaml

from tinytalk import codec, pipeline
from tinytalk.evaluate import curve, summarise
from tinytalk.facts import Facts, extract
from tinytalk.gnani import Gnani, ReplayMiss
from tinytalk.lexicon import LANGS


class DryRunGnani(Gnani):
    """Replay-only client that counts cache misses instead of stopping at the first one."""

    missing: ClassVar[dict[str, int]] = {"tts": 0, "stt": 0}

    def tts(self, *a: Any, **k: Any) -> bytes:
        try:
            return super().tts(*a, **k)
        except ReplayMiss:
            self.missing["tts"] += 1
            return codec.pcm_to_wav(np.zeros(16000, dtype=np.int16), 16000)

    def stt(self, *a: Any, **k: Any) -> dict[str, Any]:
        try:
            return super().stt(*a, **k)
        except ReplayMiss:
            self.missing["stt"] += 1
            return {"transcript": ""}


def save_jsonl(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(json.dumps(r, ensure_ascii=False) for r in rows) + "\n", "utf-8")


def load_jsonl(path: Path) -> list[dict[str, Any]]:
    return [json.loads(x) for x in path.read_text("utf-8").splitlines() if x]


def make_gnani(cfg: dict[str, Any], live: bool, max_new: int | None) -> Gnani:
    cls = Gnani if live else DryRunGnani
    g = cls(cfg["paths"]["cache"], cfg["paths"]["ledger"], replay=not live)
    if live:
        if not max_new:
            raise SystemExit("--live needs --max-new-calls N")
        g.max_calls = g._used + max_new  # a per-run cap on top of what the ledger already shows
    return g


def report_dry(g: Gnani) -> None:
    m = getattr(g, "missing", {})
    print(f"NOT LIVE. Calls missing from the cache: TTS {m.get('tts')}, STT {m.get('stt')}.")
    print("Nothing was spent. Re-run with --live --max-new-calls N to make them.")


def group(rows: list[dict[str, Any]], keys: tuple[str, ...]) -> dict[str, list[dict[str, Any]]]:
    out: dict[str, list[dict[str, Any]]] = {}
    for r in rows:
        out.setdefault("|".join(str(r[k]) for k in keys), []).append(r)
    return out


def do_pilot(cfg: dict[str, Any], g: Gnani, live: bool) -> None:
    p = cfg["pilot"]
    rows = pipeline.select(cfg, p["split"], p["messages_per_language"])
    voice = cfg["voices"][p["voice_index"]]
    recs = pipeline.run_clean(g, cfg, rows, [voice], [p["speed"]], ["off"])
    if not live:
        return report_dry(g)
    out = Path("results/pilot")
    save_jsonl(out / "records.jsonl", recs)
    seed = cfg["seeds"]["bootstrap"]
    summary = {k: summarise(v, seed) for k, v in group(recs, ("lang",)).items()}
    (out / "summary.json").write_text(json.dumps(summary, indent=1, ensure_ascii=False), "utf-8")
    ml = summary["ml"]
    need = cfg["malayalam_min_exact_facts"]
    decision = {
        "rule": f"Malayalam stays a full language only at >= {need:.0%} exact facts",
        "ml_fact_rate": ml["fact_rate"],
        "ml_fact_rate_ci": ml["fact_rate_ci"],
        "ml_stays_full": ml["fact_rate"] is not None and ml["fact_rate"] >= need,
    }
    (out / "decision.json").write_text(json.dumps(decision, indent=1), "utf-8")
    texts = {r["id"]: r for r in rows}
    fails = []
    for r in recs:
        if r["lang"] == "ml" and not r["all_exact"]:
            truth = Facts.from_dict(texts[r["id"]]["facts"])
            fails.append(
                {
                    "id": r["id"],
                    "text": texts[r["id"]]["text"],
                    "transcript": r["transcript"],
                    "true_numbers": truth.numbers,
                    "heard_numbers": extract(r["transcript"]).numbers,
                }
            )
    (out / "ml_failures.json").write_text(json.dumps(fails, indent=1, ensure_ascii=False), "utf-8")
    print(json.dumps(decision, indent=1))


def do_main(cfg: dict[str, Any], g: Gnani, live: bool, a: argparse.Namespace) -> None:
    rows = pipeline.select(cfg, a.split)
    speeds = [float(x) for x in a.speeds.split(",")]
    conds = a.conditions.split(",")
    recs = pipeline.run_clean(g, cfg, rows, cfg["voices"][: a.voices], speeds, conds)
    if not live:
        return report_dry(g)
    save_jsonl(Path("results/main/records.jsonl"), recs)
    keys = ("lang", "voice", "speed", "condition")
    summary = {k: summarise(v, cfg["seeds"]["bootstrap"]) for k, v in group(recs, keys).items()}
    Path("results/main/summary.json").write_text(
        json.dumps(summary, indent=1, ensure_ascii=False), "utf-8"
    )
    print(f"{len(recs)} records saved to results/main/")


def do_tiers(cfg: dict[str, Any], g: Gnani, live: bool, a: argparse.Namespace) -> None:
    rows = pipeline.select(cfg, a.split)
    losses = [int(x) for x in a.losses.split(",")]
    voice, speed = cfg["voices"][0], 1.0
    if not live:
        n = len(rows) * len(losses)
        print(
            f"NOT LIVE. Tier A needs {n} new Prisma calls ({len(rows)} messages x {len(losses)} losses)."
        )
        print("It also needs results/main/records.jsonl (voice 0, speed 1.0, condition off).")
        return
    clean = load_jsonl(Path("results/main/records.jsonl"))
    recs = pipeline.run_tiers(g, cfg, rows, clean, voice, speed, losses)
    save_jsonl(Path("results/tiers.jsonl"), recs)
    do_curve(cfg)


def do_curve(cfg: dict[str, Any]) -> None:
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    points = curve(load_jsonl(Path("results/tiers.jsonl")), cfg["link"]["rates_kbps"])
    Path("results/curve.json").write_text(json.dumps(points, indent=1), "utf-8")
    fig, axes = plt.subplots(1, len(LANGS), figsize=(13, 4), sharey=True)
    colors = {"A": "tab:red", "B": "tab:blue", "C": "tab:green"}
    for ax, lang in zip(axes, LANGS, strict=True):
        for t in (p for p in points if p["lang"] == lang):
            lo, hi = t["fact_rate_ci"]
            ax.errorbar(
                t["wire_bytes_per_min"], t["fact_rate"],
                yerr=[[t["fact_rate"] - lo], [hi - t["fact_rate"]]],
                fmt="o", color=colors[t["tier"]], capsize=3,
                label=f"Tier {t['tier']}" if t["loss"] == 0 else None,
            )  # fmt: skip
        ax.set_xscale("log")
        ax.set_title(lang)
        ax.set_xlabel("bytes on the air per minute of speech")
    axes[0].set_ylabel("facts correct (95% Wilson)")
    axes[0].legend()
    fig.savefig("results/curve.png", dpi=150, bbox_inches="tight")
    print("results/curve.json and results/curve.png written")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawTextHelpFormatter)
    ap.add_argument("stage", choices=["pilot", "main", "tiers", "curve"])
    ap.add_argument("--live", action="store_true")
    ap.add_argument("--max-new-calls", type=int)
    ap.add_argument("--split", default="test", choices=["dev", "test", "all"])
    ap.add_argument("--voices", type=int, default=1)
    ap.add_argument("--speeds", default="1.0")
    ap.add_argument("--conditions", default="off")
    ap.add_argument("--losses", default="0,10,20,30")
    a = ap.parse_args()
    cfg = yaml.safe_load(Path("config.yaml").read_text("utf-8"))
    if a.stage == "curve":
        return do_curve(cfg)
    g = make_gnani(cfg, a.live, a.max_new_calls)
    {"pilot": lambda: do_pilot(cfg, g, a.live), "main": lambda: do_main(cfg, g, a.live, a),
     "tiers": lambda: do_tiers(cfg, g, a.live, a)}[a.stage]()  # fmt: skip


if __name__ == "__main__":
    main()
