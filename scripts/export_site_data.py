"""Export the real saved results into web/public/data/ for the Replay build of the web app.

Everything here is read from results/, docs/EXPERIMENTS.md, the ledger, the corpus, the asset
manifest and the Gnani cache. Nothing calls the API. The output is committed, so the Replay build
works offline from a clean clone (the cache itself is not committed)."""

import json
import re
import shutil
import subprocess
import tempfile
import time
from pathlib import Path
from typing import Any

import diskcache
import yaml

from tinytalk import api, corpus, credits, pipeline
from tinytalk.gnani import Gnani
from tinytalk.lexicon import LANGS

OUT = Path("web/public/data")
AUDIO = OUT / "audio"
PER_LANG = 4  # studio and link-lab messages per language (test split)
REPO = "https://github.com/yaadhuu/Gnani_Hackathon/blob/main/"


def write(name: str, data: Any) -> None:
    (OUT / name).write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), "utf-8")


def jsonl(path: str) -> list[dict[str, Any]]:
    return [json.loads(x) for x in Path(path).read_text("utf-8").splitlines() if x.strip()]


def to_mp3(wav: bytes, name: str) -> str:
    src = AUDIO / f"{name}.wav"
    src.write_bytes(wav)
    subprocess.run(
        [
            "ffmpeg",
            "-v",
            "error",
            "-y",
            "-i",
            str(src),
            "-ac",
            "1",
            "-b:a",
            "32k",
            str(AUDIO / f"{name}.mp3"),
        ],
        check=True,
    )
    src.unlink()
    return f"data/audio/{name}.mp3"


def experiments() -> list[dict[str, str]]:
    text = Path("docs/EXPERIMENTS.md").read_text("utf-8")
    parts = re.split(r"^## ", text, flags=re.MULTILINE)[1:]
    out = []
    for p in parts:
        title, _, body = p.partition("\n")
        m = re.match(r"(E\d+) - (.*)", title)
        out.append(
            {
                "id": m.group(1) if m else "",
                "title": (m.group(2) if m else title).strip(),
                "body": body.strip(),
            }
        )
    return out


def main() -> None:
    cfg = yaml.safe_load(Path("config.yaml").read_text("utf-8"))
    if OUT.exists():
        shutil.rmtree(OUT)
    AUDIO.mkdir(parents=True)
    # Replay reads still write cache-hit rows; keep them out of the real ledger.
    scratch = Path(tempfile.mkdtemp(prefix="tinytalk-export-")) / "ledger.jsonl"
    g = Gnani(cfg["paths"]["cache"], scratch, replay=True)
    api.gnani = lambda: g  # type: ignore[assignment]
    voice = cfg["voices"][0]

    for name in ("curve.json", "sizes.json", "teachback.json"):
        shutil.copy(Path("results") / name, OUT / name)
    write("main_summary.json", json.loads(Path("results/main/summary.json").read_text("utf-8")))
    write("pilot_summary.json", json.loads(Path("results/pilot/summary.json").read_text("utf-8")))
    write("pilot_decision.json", json.loads(Path("results/pilot/decision.json").read_text("utf-8")))
    write("experiments.json", experiments())

    rows = credits.load_ledger(cfg["paths"]["ledger"])
    c = cfg["credits"]
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
    write(
        "usage.json",
        {
            **credits.summary(c, rows, credits.load_calibration(c["calibration_file"])),
            "live": False,
            "queue": 0,
            "ledger": table,
        },
    )

    manifest = json.loads(Path("assets/manifest.json").read_text("utf-8"))
    write("beds.json", [{k: v for k, v in b.items() if k != "file"} for b in manifest["beds"]])

    tiers = jsonl("results/tiers.jsonl")
    clean = {r["id"]: r for r in jsonl("results/main/records.jsonl") if r["condition"] == "off"}
    tier_a_store = diskcache.Cache(str(Path(cfg["paths"]["cache"]) / "tierA"))
    studio: dict[str, Any] = {"samples": {}, "runs": {}, "audio": {}, "measured": {}, "heard": {}}
    for lang in LANGS:
        all_rows = corpus.load(cfg["paths"]["corpus"], lang)
        studio["samples"][lang] = [
            {
                "id": r["id"],
                "text": r["text"],
                "category": r["category"],
                "split": r["split"],
                "facts": r["facts"],
            }
            for r in all_rows
        ]
        for r in [x for x in all_rows if x["split"] == "test"][:PER_LANG]:
            wav = pipeline.synth(g, cfg, r["text"], lang, voice, 1.0)
            files = {"original": to_mp3(wav, f"{r['id']}_orig")}
            for loss in cfg["link"]["loss_percent"]:
                key = f"{r['id']}|{voice}|1.0|{loss}"
                if key in tier_a_store:
                    files[f"A{loss}"] = to_mp3(tier_a_store[key], f"{r['id']}_A{loss}")
            studio["audio"][r["id"]] = files
            studio["heard"][r["id"]] = clean[r["id"]]["transcript"] if r["id"] in clean else None
            studio["measured"][r["id"]] = [
                {k: t[k] for k in ("tier", "loss", "matched", "total", "bytes_sent", "delivered")}
                for t in tiers
                if t["id"] == r["id"]
            ]
            for rate in cfg["link"]["rates_kbps"]:
                for loss in cfg["link"]["loss_percent"]:
                    req = api.SendRequest.model_validate(
                        {"text": r["text"], "lang": lang, "rate_kbps": rate, "loss_percent": loss}
                    )
                    studio["runs"][f"{r['id']}|{rate}|{loss}"] = api.send(req).model_dump()
    write("studio.json", studio)

    samples = []
    for r in [x for lng in LANGS for x in corpus.load(cfg["paths"]["corpus"], lng, "test")[:1]]:
        wav = pipeline.synth(g, cfg, r["text"], r["lang"], voice, 1.0)
        stt = g.stt(wav, [f"{r['lang']}-IN"], "transcribe")
        samples.append(
            {
                "label": f"Saved run: {r['id']}",
                "tts": {
                    "text": r["text"],
                    "language": f"{r['lang']}-IN",
                    "voice": voice,
                    "speed": 1.0,
                    "audio": studio["audio"][r["id"]]["original"],
                },
                "stt": {"language_code": f"{r['lang']}-IN", "format": "transcribe", "result": stt},
            }
        )
    write("playground.json", samples)

    commit = subprocess.run(
        ["git", "rev-parse", "--short", "HEAD"], capture_output=True, text=True, check=False
    ).stdout.strip()
    write(
        "meta.json",
        {
            "built": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
            "commit": commit,
            "repo": REPO,
            "sources": {
                "curve.json": "results/curve.json",
                "main_summary.json": "results/main/summary.json",
                "pilot_summary.json": "results/pilot/summary.json",
                "pilot_decision.json": "results/pilot/decision.json",
                "teachback.json": "results/teachback.json",
                "sizes.json": "results/sizes.json",
                "usage.json": "results/ledger.jsonl",
                "experiments.json": "docs/EXPERIMENTS.md",
                "beds.json": "assets/manifest.json",
            },
        },
    )
    print("site data written to", OUT)


if __name__ == "__main__":
    main()
