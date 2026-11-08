"""Check config.yaml loads and holds the keys the later stages read."""

from pathlib import Path

import yaml

KEYS = {
    "languages",
    "models",
    "paths",
    "credits",
    "concurrency",
    "clip_max_seconds",
    "link",
    "codec",
    "split",
    "seeds",
}


def test_config_has_expected_keys() -> None:
    cfg = yaml.safe_load((Path(__file__).parent.parent / "config.yaml").read_text("utf-8"))
    assert KEYS <= cfg.keys()
    assert cfg["split"]["dev_fraction"] + cfg["split"]["test_fraction"] == 1
