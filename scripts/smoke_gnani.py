"""Live smoke test: one Timbre call, one Prisma call on that audio. Uses 2 of the call cap."""

from pathlib import Path

import yaml

from tinytalk.gnani import Gnani

cfg = yaml.safe_load(Path("config.yaml").read_text("utf-8"))
g = Gnani(cfg["paths"]["cache"], cfg["paths"]["ledger"], max_calls=cfg["credits"]["max_calls"])
text = "बाढ़ की चेतावनी। पचास लोग फंसे हैं।"
audio = g.tts(text, "hi-IN", "Vasudha", 1.0)
print("tts bytes:", len(audio))
out = g.stt(audio, ["hi-IN"])
print({k: v for k, v in out.items()})
