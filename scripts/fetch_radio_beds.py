"""Find and download licensed radio-noise beds (no speech) for the Link Lab and channel samples.

Sources: Wikimedia Commons and the Internet Archive. Only CC0, public domain and CC-BY (no SA,
NC or ND) are kept. Each file is cut to at most 30 s, 16 kHz mono WAV (under 1 MB) plus a small
MP3 for the web, and recorded in assets/manifest.json with its source, author, licence and sha256.
A voice-activity check rejects files that sound like speech, since no real voices may be used.
"""

import hashlib
import io
import json
import re
import subprocess
import time
import wave
from pathlib import Path
from typing import Any

import httpx
import numpy as np
import webrtcvad

UA = "TinyTalkHackathon/0.1 (research; https://github.com/yaadhuu/Gnani_Hackathon)"
OUT = Path("assets/beds")
WEB = Path("web/public/assets/beds")
MANIFEST = Path("assets/manifest.json")
QUERIES = [
    "radio static",
    "shortwave noise",
    "white noise radio",
    "radio interference",
    "morse code",
    "squelch",
    "radio tuning",
    "static noise",
]
SPEECHY = re.compile(
    r"speech|voice|news|interview|talk|announc|song|music|broadcast|sing|conversation|address|"
    r"isrc|concert|psalm|anniversary| - \d\d - |^LL-|^\w\w-",
    re.IGNORECASE,
)
MAX_SECONDS, MAX_BYTES, KEEP = 30, 1_000_000, 10


def licence_ok(short: str) -> bool:
    """CC0, public domain or plain CC-BY; anything with SA, NC, ND or unknown is refused."""
    s = short.lower().replace("_", "-").replace(" ", "-")
    if any(x in s for x in ("-nc", "-nd", "-sa", "noncommercial", "noderivs", "sharealike")):
        return False
    return s.startswith(("cc0", "public-domain", "pd", "cc-by-")) or s in {"cc-by", "pdm"}


def clean(html: str) -> str:
    return re.sub(r"<[^>]+>", "", html or "").strip()


def commons_candidates(client: httpx.Client) -> list[dict[str, Any]]:
    out = []
    for q in QUERIES:
        r = client.get(
            "https://commons.wikimedia.org/w/api.php",
            params={
                "action": "query",
                "format": "json",
                "generator": "search",
                "gsrnamespace": 6,
                "gsrsearch": f"{q} filetype:audio",
                "gsrlimit": 20,
                "prop": "imageinfo",
                "iiprop": "url|extmetadata|size|mime",
            },
        )
        for page in (r.json().get("query", {}).get("pages") or {}).values():
            info = (page.get("imageinfo") or [{}])[0]
            meta = info.get("extmetadata", {})
            out.append(
                {
                    "title": page["title"].removeprefix("File:"),
                    "source": "Wikimedia Commons",
                    "source_url": info.get("descriptionurl"),
                    "download_url": info.get("url"),
                    "author": clean(meta.get("Artist", {}).get("value", "")),
                    "licence": meta.get("LicenseShortName", {}).get("value", "unknown"),
                    "licence_url": meta.get("LicenseUrl", {}).get("value", ""),
                    "description": clean(meta.get("ImageDescription", {}).get("value", ""))[:200],
                    "query": q,
                }
            )
        time.sleep(0.5)
    return out


def archive_candidates(client: httpx.Client) -> list[dict[str, Any]]:
    out = []
    for q in ("radio static", "shortwave noise", "morse code"):
        r = client.get(
            "https://archive.org/advancedsearch.php",
            params={
                "q": f'"{q}" AND mediatype:audio AND (licenseurl:*publicdomain* OR licenseurl:*licenses/by/*)',
                "fl[]": ["identifier", "title", "licenseurl", "creator"],
                "rows": 8,
                "output": "json",
            },
        )
        for d in r.json().get("response", {}).get("docs", []):
            meta = client.get(f"https://archive.org/metadata/{d['identifier']}").json()
            files = [
                f
                for f in meta.get("files", [])
                if f.get("name", "").lower().endswith((".mp3", ".ogg", ".wav", ".flac"))
            ]
            if not files:
                continue
            f = min(files, key=lambda x: int(x.get("size", 10**12)))
            url = d.get("licenseurl", "")
            out.append(
                {
                    "title": str(d.get("title")),
                    "source": "Internet Archive",
                    "source_url": f"https://archive.org/details/{d['identifier']}",
                    "download_url": f"https://archive.org/download/{d['identifier']}/{f['name']}",
                    "author": ", ".join(d["creator"])
                    if isinstance(d.get("creator"), list)
                    else str(d.get("creator", "unknown")),
                    "licence": "CC0/Public domain" if "publicdomain" in url else "CC BY",
                    "licence_url": url,
                    "description": "",
                    "query": q,
                }
            )
        time.sleep(0.5)
    return out


def speech_share(wav: bytes) -> float:
    """Share of 30 ms frames that webrtcvad (mode 3) calls speech."""
    with wave.open(io.BytesIO(wav)) as w:
        pcm = w.readframes(w.getnframes())
    vad = webrtcvad.Vad(3)
    n = 480 * 2  # 30 ms at 16 kHz, 16-bit
    frames = [pcm[i : i + n] for i in range(0, len(pcm) - n + 1, n)]
    return float(sum(vad.is_speech(f, 16000) for f in frames) / max(1, len(frames)))


def peaks(wav: bytes, bins: int = 120) -> list[float]:
    with wave.open(io.BytesIO(wav)) as w:
        x = np.frombuffer(w.readframes(w.getnframes()), dtype="<i2").astype(float)
    parts = np.array_split(np.abs(x), bins)
    top = max(1.0, float(np.abs(x).max()))
    return [round(float(p.max()) / top, 3) if len(p) else 0.0 for p in parts]


def ffmpeg(args: list[str]) -> bool:
    return (
        subprocess.run(
            ["ffmpeg", "-v", "error", "-y", *args], capture_output=True, check=False
        ).returncode
        == 0
    )


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    WEB.mkdir(parents=True, exist_ok=True)
    kept: list[dict[str, Any]] = []
    rejected: list[dict[str, str]] = []
    with httpx.Client(headers={"User-Agent": UA}, timeout=60, follow_redirects=True) as client:
        cands = []
        for fn in (commons_candidates, archive_candidates):
            try:
                cands += fn(client)
            except (
                httpx.HTTPError,
                ValueError,
                KeyError,
            ) as exc:  # one blocked source must not stop the other
                rejected.append({"title": fn.__name__, "reason": f"source failed: {exc!r}"[:200]})
    seen: set[str] = set()
    for c in cands:
        if len(kept) >= KEEP:
            break
        if not c.get("download_url") or c["download_url"] in seen:
            continue
        seen.add(c["download_url"])
        if not licence_ok(c["licence"]):
            rejected.append({"title": c["title"], "reason": f"licence {c['licence']}"})
            continue
        if SPEECHY.search(c["title"] + " " + c["description"]):
            rejected.append(
                {"title": c["title"], "reason": "title or description suggests speech or music"}
            )
            continue
        slug = re.sub(r"[^a-z0-9]+", "-", c["title"].lower()).strip("-")[:40]
        wav_path, mp3_path = OUT / f"{slug}.wav", WEB / f"{slug}.mp3"
        raw = OUT / f"{slug}.download"
        try:
            with httpx.stream(
                "GET",
                c["download_url"],
                headers={"User-Agent": UA},
                timeout=60,
                follow_redirects=True,
            ) as r:
                r.raise_for_status()
                with raw.open("wb") as f:
                    for chunk in r.iter_bytes():
                        f.write(chunk)
                        if f.tell() > 4_000_000:  # the first 4 MB hold far more than 30 s
                            break
        except httpx.HTTPError as exc:
            rejected.append({"title": c["title"], "reason": f"download failed: {exc!r}"[:160]})
            continue
        ok = ffmpeg(
            ["-i", str(raw), "-t", str(MAX_SECONDS), "-ac", "1", "-ar", "16000", str(wav_path)]
        )
        raw.unlink(missing_ok=True)
        time.sleep(0.5)
        if not ok or not wav_path.exists():
            rejected.append({"title": c["title"], "reason": "download or decode failed"})
            continue
        wav = wav_path.read_bytes()
        seconds = (len(wav) - 44) / 32000
        share = speech_share(wav)
        if seconds < 5 or len(wav) > MAX_BYTES or share > 0.5:
            wav_path.unlink()
            rejected.append(
                {
                    "title": c["title"],
                    "reason": f"length {seconds:.1f} s or speech-like ({share:.0%} voiced frames)",
                }
            )
            continue
        ffmpeg(["-i", str(wav_path), "-ac", "1", "-b:a", "48k", str(mp3_path)])
        kept.append(
            {
                **{
                    k: c[k]
                    for k in (
                        "title",
                        "source",
                        "source_url",
                        "author",
                        "licence",
                        "licence_url",
                        "description",
                        "query",
                    )
                },
                "file": str(wav_path).replace("\\", "/"),
                "web_file": f"assets/beds/{mp3_path.name}",
                "accessed": time.strftime("%Y-%m-%d"),
                "sha256": hashlib.sha256(wav).hexdigest(),
                "duration_s": round(seconds, 2),
                "voiced_share": round(share, 3),
                "peaks": peaks(wav),
            }
        )
        print(f"kept: {c['title']} ({c['licence']}, {seconds:.1f} s)")
    MANIFEST.write_text(
        json.dumps({"beds": kept, "rejected": rejected}, indent=1, ensure_ascii=False), "utf-8"
    )
    print(f"{len(kept)} kept, {len(rejected)} rejected; manifest at {MANIFEST}")
    if len(kept) < 6:
        print(
            "fewer than 6 beds kept; run scripts/make_synthetic_beds.py to add generated (CC0) beds"
        )


if __name__ == "__main__":
    main()
