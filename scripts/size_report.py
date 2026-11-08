"""Offline: average bytes per message for raw text, Tier B and Tier C on the test split."""

import json
from pathlib import Path

import yaml

from tinytalk import corpus
from tinytalk.facts import Facts
from tinytalk.lexicon import LANGS
from tinytalk.textpack import make_dict, pack_facts, pack_transcript

cfg = yaml.safe_load(Path("config.yaml").read_text("utf-8"))
out = {}
for lang in LANGS:
    zdict = make_dict([r["text"] for r in corpus.load(cfg["paths"]["corpus"], lang, "dev")])
    test = corpus.load(cfg["paths"]["corpus"], lang, "test")
    n = len(test)
    out[lang] = {
        "test_messages": n,
        "raw_utf8_bytes": sum(len(r["text"].encode()) for r in test) / n,
        "tier_b_bytes": sum(len(pack_transcript(r["text"], zdict)) for r in test) / n,
        "tier_c_bytes": sum(len(pack_facts(Facts.from_dict(r["facts"]))) for r in test) / n,
    }
Path("results").mkdir(exist_ok=True)
Path("results/sizes.json").write_text(json.dumps(out, indent=1), "utf-8")
print(json.dumps(out, indent=1))
