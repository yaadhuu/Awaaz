"""Glue between the pieces: corpus -> Timbre audio -> Prisma transcripts -> scores, and the tiers."""

from pathlib import Path
from typing import Any

import diskcache

from tinytalk import codec, corpus
from tinytalk.facts import Facts, extract, score_facts, wer_cer
from tinytalk.gnani import Gnani
from tinytalk.lexicon import LANGS, PLACES
from tinytalk.linksim import Link
from tinytalk.textpack import make_dict
from tinytalk.tiers import link_seed, send_audio, send_facts, send_transcript

LANG_CODE = {lang: f"{lang}-IN" for lang in LANGS}
TOPIC = "Flood rescue and relief message from Kerala"


def keyterms(lang: str) -> list[str]:
    """The place names in the message language, as a hint for Prisma."""
    return [PLACES[p][lang][0] for p in sorted(PLACES)]


def synth(g: Gnani, cfg: dict[str, Any], text: str, lang: str, voice: str, speed: float) -> bytes:
    """Timbre audio for one message (cached)."""
    return g.tts(text, LANG_CODE[lang], voice, speed, cfg["tts_audio_config"])


def transcribe(g: Gnani, wav: bytes, lang: str, condition: str) -> str:
    """Prisma transcript with the given context condition: off, keyterms, topic or both."""
    kw: dict[str, Any] = {}
    if condition in ("keyterms", "both"):
        kw["keyterms"] = keyterms(lang)
    if condition in ("topic", "both"):
        kw["topic"] = TOPIC
    out = g.stt(wav, [LANG_CODE[lang]], "transcribe", **kw)
    return str(out.get("transcript", ""))


def score(row: dict[str, Any], transcript: str) -> dict[str, Any]:
    """Fact score and WER/CER of a transcript against the message it came from."""
    s = score_facts(Facts.from_dict(row["facts"]), extract(transcript))
    wer, cer = wer_cer(row["text"], transcript)
    return {
        "matched": s["matched"],
        "total": s["total"],
        "extra": s["extra"],
        "all_exact": s["all_exact"],
        "wer": wer,
        "cer": cer,
    }


def audio_seconds(wav: bytes) -> float:
    """Length of 16-bit mono WAV audio in seconds."""
    pcm, rate = codec.wav_to_pcm(wav)
    return len(pcm) / rate


def select(
    cfg: dict[str, Any], split: str, per_language: int | None = None
) -> list[dict[str, Any]]:
    """Corpus rows of all languages for a split (dev, test or all), optionally the first N per language."""
    rows: list[dict[str, Any]] = []
    for lang in LANGS:
        part = corpus.load(cfg["paths"]["corpus"], lang, None if split == "all" else split)
        rows += part[:per_language]
    return rows


def run_clean(
    g: Gnani,
    cfg: dict[str, Any],
    rows: list[dict[str, Any]],
    voices: list[str],
    speeds: list[float],
    conditions: list[str],
) -> list[dict[str, Any]]:
    """Speak every message with every voice and speed, transcribe under every condition."""
    out = []
    for row in rows:
        for voice in voices:
            for speed in speeds:
                wav = synth(g, cfg, row["text"], row["lang"], voice, speed)
                for cond in conditions:
                    t = transcribe(g, wav, row["lang"], cond)
                    out.append(
                        {
                            "id": row["id"],
                            "lang": row["lang"],
                            "split": row["split"],
                            "voice": voice,
                            "speed": speed,
                            "condition": cond,
                            "transcript": t,
                            "audio_seconds": audio_seconds(wav),
                            **score(row, t),
                        }
                    )
    return out


def decoded_audio(cfg: dict[str, Any], key: str, wav: bytes, link: Link) -> tuple[bytes, Any]:
    """Tier A audio after Codec2 and the lossy link. The Codec2 decoder adds random phase, so the
    decoded WAV is stored on first use; reruns then hit the Prisma cache instead of paying again."""
    with diskcache.Cache(str(Path(cfg["paths"]["cache"]) / "tierA")) as store:
        sent = send_audio(wav, link)
        if key not in store:
            store[key] = sent.audio_wav
        return store[key], sent


def run_tiers(
    g: Gnani,
    cfg: dict[str, Any],
    rows: list[dict[str, Any]],
    clean: list[dict[str, Any]],
    voice: str,
    speed: float,
    losses: list[int],
    rate_kbps: float = 5,
) -> list[dict[str, Any]]:
    """Send every message as Tier A, B and C at each loss level; one record per message, tier, loss.

    `clean` holds the baseline transcripts (condition off) that Tier B and C start from."""
    base = {
        r["id"]: r
        for r in clean
        if r["voice"] == voice and r["speed"] == speed and r["condition"] == "off"
    }
    lk = cfg["link"]
    zdicts = {
        lang: make_dict([r["text"] for r in corpus.load(cfg["paths"]["corpus"], lang, "dev")])
        for lang in LANGS
    }
    out = []
    for row in rows:
        truth = Facts.from_dict(row["facts"])
        wav = synth(g, cfg, row["text"], row["lang"], voice, speed)
        secs = audio_seconds(wav)
        transcript = base[row["id"]]["transcript"]
        for loss in losses:

            def link(tier: str, loss: int = loss, rid: str = row["id"]) -> Link:
                return Link(
                    rate_kbps,
                    loss,
                    link_seed(cfg["seeds"]["link"], rid, tier, loss),
                    lk["mean_burst_packets"],
                    lk["payload_bytes"],
                    lk["header_bytes"],
                    lk["max_resends"],
                )

            key = f"{row['id']}|{voice}|{speed}|{loss}"
            heard, a = decoded_audio(cfg, key, wav, link("A"))
            hyp_a = extract(transcribe(g, heard, row["lang"], "off"))
            b = send_transcript(transcript, row["lang"], zdicts[row["lang"]], link("B"))
            c = send_facts(extract(transcript), link("C"))
            sends = [(a, hyp_a), (b, b.facts or Facts()), (c, c.facts or Facts())]
            for sent, got in sends:
                s = score_facts(truth, got)
                out.append(
                    {
                        "id": row["id"],
                        "lang": row["lang"],
                        "tier": sent.tier,
                        "loss": loss,
                        "matched": s["matched"],
                        "total": s["total"],
                        "extra": s["extra"],
                        "all_exact": s["all_exact"],
                        "payload_bytes": sent.payload_bytes,
                        "bytes_sent": sent.link.bytes_sent,
                        "audio_seconds": secs,
                        "delivered": sent.link.delivered,
                        "resends": sent.link.resends,
                    }
                )
    return out
