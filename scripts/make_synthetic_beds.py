"""Generate radio-noise beds ourselves (CC0, seeded, no speech) and add them to assets/manifest.json.

Used because few downloadable recordings are CC0, public domain or plain CC-BY. Each bed is a
simple, documented model of a real channel effect, 20 s, 16 kHz mono."""

import hashlib
import io
import json
import subprocess
import time
import wave
from pathlib import Path

import numpy as np
from scipy import signal

RATE, SECONDS, SEED = 16000, 20, 2026
OUT, WEB, MANIFEST = (
    Path("assets/beds"),
    Path("web/public/assets/beds"),
    Path("assets/manifest.json"),
)


def band(x: np.ndarray, lo: float, hi: float) -> np.ndarray:
    sos = signal.butter(4, [lo, hi], btype="band", fs=RATE, output="sos")
    return np.asarray(signal.sosfilt(sos, x))


def shortwave(rng: np.random.Generator, t: np.ndarray) -> np.ndarray:
    """Band-limited hiss with slow fading and occasional crackle, like an empty HF channel."""
    hiss = band(rng.normal(size=t.size), 300, 3400)
    fade = 0.6 + 0.4 * np.sin(2 * np.pi * 0.17 * t + 1) * np.sin(2 * np.pi * 0.05 * t)
    crackle = (rng.random(t.size) < 0.0008) * rng.normal(0, 6, t.size)
    return np.asarray(hiss * fade + band(crackle, 200, 5000))


def hf_fading(rng: np.random.Generator, t: np.ndarray) -> np.ndarray:
    """A carrier heterodyne whistle that drifts and fades in and out (selective fading)."""
    f = 900 + 60 * np.sin(2 * np.pi * 0.07 * t)
    tone = np.sin(2 * np.pi * np.cumsum(f) / RATE)
    fade = np.clip(np.sin(2 * np.pi * 0.11 * t) * 1.5, 0, 1) ** 2
    return 0.5 * tone * fade + 0.4 * band(rng.normal(size=t.size), 300, 3000)


def squelch(rng: np.random.Generator, t: np.ndarray) -> np.ndarray:
    """VHF squelch: short bursts of loud noise with a tail, then silence."""
    out = np.zeros(t.size)
    for start in rng.uniform(0, SECONDS - 1.5, 9):
        i, n = int(start * RATE), int(rng.uniform(0.15, 0.6) * RATE)
        burst = rng.normal(0, 1, n) * np.linspace(1, 0.2, n)
        out[i : i + n] += burst
    return band(out, 200, 6000) + 0.02 * rng.normal(size=t.size)


def morse(rng: np.random.Generator, t: np.ndarray) -> np.ndarray:
    """A 700 Hz CW tone keying 'CQ CQ DE VU2' (amateur call sign style, no real station) at 18 wpm."""
    code = {"C": "-.-.", "Q": "--.-", "D": "-..", "E": ".", "V": "...-", "U": "..-", "2": "..---"}
    dot = 1.2 / 18
    keys: list[tuple[float, float]] = []
    pos = 0.5
    for word in "CQ CQ DE VU2".split():
        for ch in word:
            for sym in code[ch]:
                dur = dot if sym == "." else 3 * dot
                keys.append((pos, pos + dur))
                pos += dur + dot
            pos += 2 * dot
        pos += 4 * dot
    env = np.zeros(t.size)
    while keys and keys[-1][1] < SECONDS:
        a, b = keys.pop(0)
        env[int(a * RATE) : int(b * RATE)] = 1
        keys.append((a + pos, b + pos))
    env = np.convolve(env, np.hanning(80) / np.hanning(80).sum(), mode="same")
    return 0.6 * env * np.sin(2 * np.pi * 700 * t) + 0.25 * band(rng.normal(size=t.size), 300, 3000)


def digital(rng: np.random.Generator, t: np.ndarray) -> np.ndarray:
    """Digital interference: a buzzing 217 Hz pulse train (like a GSM phone near a speaker) and clicks."""
    pulses = (np.sin(2 * np.pi * 217 * t) > 0.95).astype(float)
    gate = (np.sin(2 * np.pi * 0.4 * t) > -0.3).astype(float)
    clicks = (rng.random(t.size) < 0.0005) * 4.0
    return band(pulses * gate + clicks, 150, 5000) + 0.05 * rng.normal(size=t.size)


def hum(rng: np.random.Generator, t: np.ndarray) -> np.ndarray:
    """Mains hum at 50 Hz with harmonics, as from a generator-powered radio, plus hiss."""
    h = sum(np.sin(2 * np.pi * 50 * k * t) / k for k in range(1, 8))
    return 0.5 * h + 0.15 * band(rng.normal(size=t.size), 300, 4000)


BEDS = [
    ("generated-shortwave-hiss", "Shortwave hiss with fading", shortwave),
    ("generated-hf-fading", "HF heterodyne whistle with selective fading", hf_fading),
    ("generated-vhf-squelch", "VHF squelch bursts", squelch),
    ("generated-morse-cw", "Morse CW tone (CQ CQ DE VU2) in hiss", morse),
    ("generated-digital-buzz", "Digital interference buzz and clicks", digital),
    ("generated-mains-hum", "50 Hz mains hum with hiss", hum),
]


def to_wav(x: np.ndarray) -> bytes:
    x = x / max(1e-9, float(np.abs(x).max())) * 0.8
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes((x * 32767).astype("<i2").tobytes())
    return buf.getvalue()


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    WEB.mkdir(parents=True, exist_ok=True)
    manifest = (
        json.loads(MANIFEST.read_text("utf-8"))
        if MANIFEST.exists()
        else {"beds": [], "rejected": []}
    )
    manifest["beds"] = [
        b for b in manifest["beds"] if not b["file"].split("/")[-1].startswith("generated-")
    ]
    t = np.arange(RATE * SECONDS) / RATE
    for i, (slug, title, fn) in enumerate(BEDS):
        wav = to_wav(fn(np.random.default_rng(SEED + i), t))
        (OUT / f"{slug}.wav").write_bytes(wav)
        subprocess.run(
            [
                "ffmpeg",
                "-v",
                "error",
                "-y",
                "-i",
                str(OUT / f"{slug}.wav"),
                "-b:a",
                "48k",
                str(WEB / f"{slug}.mp3"),
            ],
            check=True,
        )
        x = np.frombuffer(wav[44:], dtype="<i2").astype(float)
        parts = np.array_split(np.abs(x), 120)
        manifest["beds"].append(
            {
                "title": title,
                "source": "Generated by TinyTalk",
                "source_url": "https://github.com/yaadhuu/Gnani_Hackathon/blob/main/scripts/make_synthetic_beds.py",
                "author": "TinyTalk (scripts/make_synthetic_beds.py, seed 2026)",
                "licence": "CC0",
                "licence_url": "https://creativecommons.org/publicdomain/zero/1.0/",
                "description": (fn.__doc__ or "").strip(),
                "query": "generated",
                "file": f"assets/beds/{slug}.wav",
                "web_file": f"assets/beds/{slug}.mp3",
                "accessed": time.strftime("%Y-%m-%d"),
                "sha256": hashlib.sha256(wav).hexdigest(),
                "duration_s": float(SECONDS),
                "voiced_share": None,
                "peaks": [
                    round(float(p.max()) / max(1.0, float(np.abs(x).max())), 3) for p in parts
                ],
            }
        )
        print("generated", slug)
    MANIFEST.write_text(json.dumps(manifest, indent=1, ensure_ascii=False), "utf-8")
    print(len(manifest["beds"]), "beds in manifest")


if __name__ == "__main__":
    main()
