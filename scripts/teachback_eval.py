"""Teach-back check measured on saved Prisma transcripts (no new calls).

The receiver's read-back is stood in for by what Prisma heard from the message audio (E4,
results/main/records.jsonl). Half of the read-backs get one fact deliberately changed (a number,
a place or a unit). The check compares the facts of the sent text with the facts of the read-back.
Catch rate = altered read-backs flagged; false alarm rate = unaltered read-backs flagged."""

import json
import random
import re
from pathlib import Path

import yaml

from tinytalk import corpus
from tinytalk.evaluate import wilson
from tinytalk.facts import extract
from tinytalk.lexicon import LANGS, PLACES, UNIT_STEMS

SEED = 9


def script(word: str) -> str:
    """Latin, Devanagari or Malayalam, from the first letter."""
    c = ord(word[0])
    return "deva" if 0x900 <= c < 0x980 else "mlym" if 0xD00 <= c < 0xD80 else "latn"


def alter(text: str, lang: str, rng: random.Random) -> tuple[str, str]:
    """Change one fact in a read-back: bump a number, swap a place, or swap a unit word."""
    kinds = ["number", "place", "unit"]
    rng.shuffle(kinds)
    for kind in kinds:
        if kind == "number" and re.search(r"\d+", text):
            nums = list(re.finditer(r"\d+", text))
            m = rng.choice(nums)
            return text[: m.start()] + str(int(m.group()) + rng.randint(1, 9)) + text[
                m.end() :
            ], kind
        if kind == "place":
            for pid, names in PLACES.items():
                for n in names[lang]:
                    if n in text:
                        other = rng.choice([p for p in PLACES if p != pid])
                        return text.replace(n, PLACES[other][lang][0], 1), kind
        if kind == "unit":
            for unit, stems in UNIT_STEMS.items():
                for st in stems:
                    if len(st) > 2 and st in text:
                        same = [
                            x
                            for u in UNIT_STEMS
                            if u != unit
                            for x in UNIT_STEMS[u]
                            if len(x) > 2 and script(x) == script(st)
                        ]
                        return text.replace(st, rng.choice(same), 1), kind
    return text + " 1 km", "added"


def main() -> None:
    cfg = yaml.safe_load(Path("config.yaml").read_text("utf-8"))
    recs = [
        json.loads(x)
        for x in Path("results/main/records.jsonl").read_text("utf-8").splitlines()
        if x
    ]
    rng = random.Random(SEED)
    out: dict[str, dict[str, object]] = {}
    for cond in sorted({r["condition"] for r in recs}):
        for lang in LANGS:
            texts = {r["id"]: r["text"] for r in corpus.load(cfg["paths"]["corpus"], lang)}
            rows = [r for r in recs if r["lang"] == lang and r["condition"] == cond]
            caught = altered = alarms = clean = 0
            fails = []
            for i, r in enumerate(rows):
                sent = texts[r["id"]]
                readback, kind = (r["transcript"], "none")
                if i % 2 == 0:
                    readback, kind = alter(readback, lang, rng)
                flagged = extract(sent) != extract(readback)
                if kind == "none":
                    clean += 1
                    alarms += flagged
                    if flagged:
                        fails.append({"id": r["id"], "type": "false alarm", "readback": readback})
                else:
                    altered += 1
                    caught += flagged
                    if not flagged:
                        fails.append(
                            {"id": r["id"], "type": f"missed ({kind})", "readback": readback}
                        )
            out[f"{lang}|{cond}"] = {
                "lang": lang,
                "condition": cond,
                "altered": altered,
                "caught": caught,
                "catch_rate": caught / altered if altered else None,
                "catch_ci": wilson(caught, altered),
                "unaltered": clean,
                "false_alarms": alarms,
                "false_alarm_rate": alarms / clean if clean else None,
                "false_alarm_ci": wilson(alarms, clean),
                "failures": fails,
            }
    Path("results/teachback.json").write_text(
        json.dumps(out, indent=1, ensure_ascii=False), "utf-8"
    )
    for k, v in out.items():
        print(
            k,
            f"caught {v['caught']}/{v['altered']}",
            f"false alarms {v['false_alarms']}/{v['unaltered']}",
        )


if __name__ == "__main__":
    main()
