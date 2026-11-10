"""Build varied interactive story examples from cached synthetic speech and real packing."""

import json
from pathlib import Path

from scripts.export_voice_samples import main as export_voice
from tinytalk import corpus
from tinytalk.facts import extract
from tinytalk.gnani import Gnani
from tinytalk.linksim import Link
from tinytalk.textpack import make_dict
from tinytalk.tiers import send_audio, send_facts, send_transcript


def main() -> None:
    export_voice()
    import subprocess

    g = Gnani("cache", "cache/story-export.jsonl", replay=True, max_calls=0)
    records = [
        json.loads(s)
        for s in Path("results/main/records.jsonl").read_text("utf-8").splitlines()
        if s
    ]
    records += [
        json.loads(s)
        for s in Path("results/pilot/records.jsonl").read_text("utf-8").splitlines()
        if s
    ]
    samples = json.loads(Path("web/public/data/voice-samples.json").read_text("utf-8"))
    stories = []
    for sample in samples:
        if sample["category"] not in ("medical", "supply", "boats"):
            continue
        lang = sample["language"].split("-")[0]
        row = next(
            r for r in corpus.load("data/corpus", lang) if r["category"] == sample["category"]
        )
        heard = next(
            (r["transcript"] for r in records if r["id"] == row["id"] and r["condition"] == "off"),
            None,
        )
        if heard is None:
            raise RuntimeError(f"No actual saved Prisma transcript for {row['id']}")
        facts = extract(heard)
        wav = g.tts(row["text"], sample["language"], "Vasudha")
        dictionary = make_dict([r["text"] for r in corpus.load("data/corpus", lang, "dev")])
        runs = {}
        audio = {"original": sample["audio"]}
        for loss in (0, 10, 20, 30):
            tiers = [
                send_audio(wav, Link(5, loss, 2026)),
                send_transcript(heard, lang, dictionary, Link(5, loss, 2026)),
                send_facts(facts, Link(5, loss, 2026)),
            ]
            runs[str(loss)] = {
                "tiers": [
                    {
                        "tier": t.tier,
                        "payload_bytes": t.payload_bytes,
                        "bytes_sent": t.link.bytes_sent,
                        "delivered": t.link.delivered,
                    }
                    for t in tiers
                ]
            }
            name = f"{sample['id']}_A{loss}.mp3"
            subprocess.run(
                [
                    "ffmpeg",
                    "-v",
                    "error",
                    "-y",
                    "-i",
                    "pipe:0",
                    "-b:a",
                    "32k",
                    str(Path("web/public/data/audio") / name),
                ],
                input=tiers[0].audio_wav,
                check=True,
            )
            audio[f"A{loss}"] = f"data/audio/{name}"
        stories.append(
            {
                "id": sample["id"],
                "title": sample["title"],
                "lang": lang,
                "text": sample["text"],
                "heard": heard,
                "facts": facts.to_dict(),
                "audio": audio,
                "runs": runs,
            }
        )
    Path("web/public/data/story-examples.json").write_text(
        json.dumps(stories, ensure_ascii=False, indent=2), "utf-8"
    )
    print(f"Exported {len(stories)} varied saved story examples and codec audio. Zero live calls.")


if __name__ == "__main__":
    main()
