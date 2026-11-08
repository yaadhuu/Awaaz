"""Ground-truth message corpus: the same 40 fact sets rendered in Malayalam, Hindi and English."""

import json
import random
from pathlib import Path
from typing import Any

import yaml

from tinytalk.facts import Facts
from tinytalk.lexicon import LANGS, PLACES

PER_CATEGORY = 10
PERIOD_WORD = {
    "hi": {"am": "सुबह", "pm": "शाम"},
    "ml": {"am": "രാവിലെ", "pm": "വൈകുന്നേരം"},
}

# numbers: (unit id, (low, high)); the unit words are written inside the templates.
CATEGORIES: dict[str, dict[str, Any]] = {
    "flood": {
        "numbers": [("metres", (2, 9))],
        "time": True,
        "en": "Flood warning for {place}. Water level will reach {n1} metres by {time}.",
        "hi": "{place} के लिए बाढ़ की चेतावनी। जलस्तर {time} तक {n1} मीटर तक पहुँच जाएगा।",
        "ml": "{place} പ്രദേശത്ത് വെള്ളപ്പൊക്ക മുന്നറിയിപ്പ്. {time} ജലനിരപ്പ് {n1} മീറ്റർ ആകും.",
    },
    "boats": {
        "numbers": [("boats", (2, 30)), ("people", (10, 300))],
        "time": False,
        "en": "{n1} boats are near {place}. {n2} people are on board.",
        "hi": "{place} के पास {n1} नावें हैं। उन पर {n2} लोग सवार हैं।",
        "ml": "{place} സമീപം {n1} ബോട്ടുകൾ ഉണ്ട്. അവയിൽ {n2} ആളുകൾ ഉണ്ട്.",
    },
    "supply": {
        "numbers": [("food_packets", (50, 500)), ("litres", (100, 1000))],
        "time": False,
        "en": "Supplies needed at {place}: {n1} food packets and {n2} litres of drinking water.",
        "hi": "{place} में {n1} खाने के पैकेट और {n2} लीटर पीने का पानी चाहिए।",
        "ml": "{place} പ്രദേശത്ത് {n1} ഭക്ഷണപ്പൊതികളും {n2} ലിറ്റർ കുടിവെള്ളവും ആവശ്യമുണ്ട്.",
    },
    "medical": {
        "numbers": [("people", (2, 40)), ("km", (2, 30))],
        "time": True,
        "en": "{n1} people need medical help at {place}. The nearest hospital is {n2} kilometres "
        "away. Doctors will arrive by {time}.",
        "hi": "{place} में {n1} लोगों को चिकित्सा सहायता चाहिए। सबसे नज़दीकी अस्पताल {n2} किलोमीटर दूर "
        "है। डॉक्टर {time} तक पहुँचेंगे।",
        "ml": "{place} പ്രദേശത്ത് {n1} പേർക്ക് വൈദ്യസഹായം വേണം. ഏറ്റവും അടുത്ത ആശുപത്രി {n2} "
        "കിലോമീറ്റർ അകലെയാണ്. ഡോക്ടർമാർ {time} എത്തും.",
    },
}


def _time_text(lang: str, hour: int, period: str) -> str:
    if lang == "en":
        return f"{hour} {period}"
    if lang == "hi":
        return f"{PERIOD_WORD['hi'][period]} {hour} बजे"
    return f"{PERIOD_WORD['ml'][period]} {hour} മണിയോടെ"


def render(category: str, facts: Facts, lang: str) -> str:
    """Write one fact set as a sentence in the given language."""
    place = PLACES[facts.places[0]][lang][0]
    slots: dict[str, Any] = {"place": place}
    for i, (value, _unit) in enumerate(facts.numbers, 1):
        slots[f"n{i}"] = value
    if facts.times:
        slots["time"] = _time_text(lang, *facts.times[0])
    return str(CATEGORIES[category][lang]).format(**slots)


def make_facts(rng: random.Random, category: str) -> Facts:
    """Draw random facts for one message. Numbers keep the order the template expects."""
    spec = CATEGORIES[category]
    numbers = tuple((rng.randint(lo, hi), unit) for unit, (lo, hi) in spec["numbers"])
    times: tuple[tuple[int, str], ...] = ()
    if spec["time"]:
        period = rng.choice(["am", "pm"])
        times = ((rng.randint(5, 11) if period == "am" else rng.randint(4, 9), period),)
    return Facts((rng.choice(sorted(PLACES)),), numbers, times)


def build(seed: int, dev_fraction: float) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    """40 messages x 3 languages, plus the dev/test split (same split for every language)."""
    rng = random.Random(seed)
    items = [(c, make_facts(rng, c)) for c in CATEGORIES for _ in range(PER_CATEGORY)]
    order = list(range(len(items)))
    rng.shuffle(order)
    n_dev = round(dev_fraction * len(items))
    split: dict[str, Any] = {
        "seed": seed,
        "dev": sorted(order[:n_dev]),
        "test": sorted(order[n_dev:]),
    }
    rows = []
    for idx, (cat, facts) in enumerate(items):
        for lang in LANGS:
            rows.append(
                {
                    "id": f"{cat}-{idx:02d}-{lang}",
                    "index": idx,
                    "lang": lang,
                    "category": cat,
                    "text": render(cat, facts, lang),
                    "facts": facts.to_dict(),
                    "split": "dev" if idx in split["dev"] else "test",
                }
            )
    return rows, split


def load(path: str | Path, lang: str, split: str | None = None) -> list[dict[str, Any]]:
    """Read the saved corpus for one language, optionally only the dev or test part."""
    rows = [json.loads(x) for x in Path(path, f"{lang}.jsonl").read_text("utf-8").splitlines()]
    return [r for r in rows if split is None or r["split"] == split]


def export(corpus_dir: Path, review_dir: Path, seed: int, dev_fraction: float) -> None:
    """Write corpus files and the human review files."""
    rows, split = build(seed, dev_fraction)
    corpus_dir.mkdir(parents=True, exist_ok=True)
    review_dir.mkdir(parents=True, exist_ok=True)
    for lang in LANGS:
        lines = [json.dumps(r, ensure_ascii=False) for r in rows if r["lang"] == lang]
        (corpus_dir / f"{lang}.jsonl").write_text("\n".join(lines) + "\n", "utf-8")
    (corpus_dir / "split.json").write_text(json.dumps(split, indent=1), "utf-8")
    en = {r["index"]: r["text"] for r in rows if r["lang"] == "en"}
    for lang, name, title in (
        ("hi", "hindi_spotcheck.md", "Hindi"),
        ("ml", "malayalam_review.md", "Malayalam"),
    ):
        out = [
            f"# {title} corpus review",
            "",
            "Check each sentence: is it correct, natural, and does it say the same as the English? "
            "Numbers must stay as digits. Mark problems in the last column.",
            "",
            "| # | English (source) | " + title + " | OK? / fix |",
            "|---|---|---|---|",
        ]
        for r in (x for x in rows if x["lang"] == lang):
            out.append(f"| {r['index']} | {en[r['index']]} | {r['text']} | |")
        (review_dir / name).write_text("\n".join(out) + "\n", "utf-8")


if __name__ == "__main__":
    cfg = yaml.safe_load(Path("config.yaml").read_text("utf-8"))
    export(
        Path(cfg["paths"]["corpus"]),
        Path("docs/review"),
        cfg["seeds"]["split"],
        cfg["split"]["dev_fraction"],
    )
    print("corpus written to", cfg["paths"]["corpus"])
