"""Reuse cached Timbre speech for varied workspace samples. Never makes live calls."""

import json
import subprocess
from pathlib import Path

import numpy as np

from tinytalk import codec, corpus
from tinytalk.gnani import Gnani


def main() -> None:
    out = Path("web/public/data/audio")
    out.mkdir(parents=True, exist_ok=True)
    g = Gnani("cache", "cache/workspace-export.jsonl", replay=True, max_calls=0)
    samples = []
    dispatch = []
    for lang, category in [
        ("en", "medical"),
        ("en", "supply"),
        ("en", "boats"),
        ("hi", "medical"),
        ("ml", "supply"),
    ]:
        row = next(r for r in corpus.load("data/corpus", lang) if r["category"] == category)
        wav = g.tts(row["text"], f"{lang}-IN", "Vasudha")
        pcm, rate = codec.wav_to_pcm(wav)
        pcm = codec.resample(pcm, rate, 16000)
        name = f"workspace-{category}-{lang}"
        subprocess.run(
            [
                "ffmpeg",
                "-v",
                "error",
                "-y",
                "-f",
                "s16le",
                "-ar",
                "16000",
                "-ac",
                "1",
                "-i",
                "pipe:0",
                "-b:a",
                "48k",
                str(out / f"{name}.mp3"),
            ],
            input=pcm.tobytes(),
            check=True,
        )
        samples.append(
            {
                "id": name,
                "title": {
                    "medical": "Medical assistance",
                    "supply": "Supply dispatch",
                    "boats": "Rescue coordination",
                }[category],
                "audio": f"data/audio/{name}.mp3",
                "language": f"{lang}-IN",
                "duration": round(len(pcm) / 16000, 1),
                "text": row["text"],
                "kind": "Saved Timbre speech",
                "category": category,
                "source_url": "https://github.com/yaadhuu/Gnani_Hackathon",
                "license": "Project sample",
            }
        )
        if lang == "en":
            dispatch.extend([pcm, np.zeros(8000, dtype=np.int16)])
    joined = np.concatenate(dispatch)[: 29 * 16000]
    subprocess.run(
        [
            "ffmpeg",
            "-v",
            "error",
            "-y",
            "-f",
            "s16le",
            "-ar",
            "16000",
            "-ac",
            "1",
            "-i",
            "pipe:0",
            "-b:a",
            "48k",
            str(out / "workspace-dispatch-en.mp3"),
        ],
        input=joined.tobytes(),
        check=True,
    )
    samples.insert(
        0,
        {
            "id": "workspace-dispatch-en",
            "title": "Three updates. One field dispatch.",
            "audio": "data/audio/workspace-dispatch-en.mp3",
            "language": "en-IN",
            "duration": round(len(joined) / 16000, 1),
            "text": " ".join(s["text"] for s in samples[:3]),
            "kind": "Saved Timbre speech · composite drill",
            "category": "dispatch",
            "source_url": "https://github.com/yaadhuu/Gnani_Hackathon",
            "license": "Project sample",
        },
    )
    samples.append(
        {
            "id": "ham-radio",
            "title": "Real radio: a contest exchange",
            "audio": "assets/radio/ham-contest-exchange.mp3",
            "language": "en-IN",
            "duration": 26,
            "text": None,
            "kind": "Real amateur radio · CC0 · Meisam",
            "category": "radio",
            "source_url": "https://commons.wikimedia.org/wiki/File:Ham_Contest_Exchange.ogg",
            "license": "CC0",
        }
    )
    if Path("web/public/assets/radio/apollo13-problem.mp3").exists():
        samples.append({"id": "apollo13-radio", "title": "Apollo 13: a real mission call",
                        "audio": "assets/radio/apollo13-problem.mp3", "language": "en-IN",
                        "duration": 11.5, "text": None,
                        "kind": "NASA mission audio, 1970. Historical reference; no endorsement or Awaaz field test.",
                        "category": "radio", "source_url": "https://commons.wikimedia.org/wiki/File:Apollo13problem.ogg",
                        "license": "Public domain (NASA)"})
    Path("web/public/data/voice-samples.json").write_text(
        json.dumps(samples, ensure_ascii=False, indent=2), "utf-8"
    )
    print(f"Exported {len(samples)} varied audio samples; no live model calls.")


if __name__ == "__main__":
    main()
