"""Mix radio beds onto our synthetic speech at fixed signal-to-noise ratios (seeded).

Speech comes only from the Timbre cache (synthetic voices), never from recordings of people.
Output: assets/channel/<message>__<bed>__<snr>dB.wav and assets/channel/index.json. No STT is run
here: noise-condition transcription needs Yadhu's approval of the credit estimate first."""

import json
from pathlib import Path

import numpy as np
import yaml

from tinytalk import codec, pipeline
from tinytalk.gnani import Gnani

SNRS_DB = [20, 10, 5, 0]
SEED = 2026
OUT = Path("assets/channel")


def mix(speech: np.ndarray, bed: np.ndarray, snr_db: float, rng: np.random.Generator) -> np.ndarray:
    """Speech plus a random slice of the bed scaled to the SNR (by mean power), clipped to int16."""
    if len(bed) < len(speech):
        bed = np.tile(bed, len(speech) // len(bed) + 1)
    start = int(rng.integers(0, len(bed) - len(speech) + 1))
    noise = bed[start : start + len(speech)].astype(float)
    s = speech.astype(float)
    p_s, p_n = np.mean(s**2), max(np.mean(noise**2), 1e-9)
    noise *= np.sqrt(p_s / (p_n * 10 ** (snr_db / 10)))
    return np.asarray(np.clip(s + noise, -32768, 32767), dtype=np.int16)


def main() -> None:
    cfg = yaml.safe_load(Path("config.yaml").read_text("utf-8"))
    g = Gnani(cfg["paths"]["cache"], cfg["paths"]["ledger"], replay=True)
    beds = json.loads(Path("assets/manifest.json").read_text("utf-8"))["beds"]
    rows = pipeline.select(cfg, "test", 1)
    OUT.mkdir(parents=True, exist_ok=True)
    rng = np.random.default_rng(SEED)
    index = []
    for row in rows:
        wav = pipeline.synth(g, cfg, row["text"], row["lang"], cfg["voices"][0], 1.0)
        speech, rate = codec.wav_to_pcm(wav)
        for bed in beds:
            noise, brate = codec.wav_to_pcm(Path(bed["file"]).read_bytes())
            noise = codec.resample(noise, brate, rate)
            for snr in SNRS_DB:
                name = f"{row['id']}__{Path(bed['file']).stem}__{snr}dB.wav"
                (OUT / name).write_bytes(codec.pcm_to_wav(mix(speech, noise, snr, rng), rate))
                index.append(
                    {"file": name, "message": row["id"], "bed": bed["title"], "snr_db": snr}
                )
    (OUT / "index.json").write_text(json.dumps(index, indent=1), "utf-8")
    print(len(index), "channel samples written to", OUT)


if __name__ == "__main__":
    main()
