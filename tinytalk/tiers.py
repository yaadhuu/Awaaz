"""The three tiers (audio, transcript, facts), the link meter and the rule-based tier picker."""

import zlib
from dataclasses import dataclass
from typing import Any

import zstandard

from tinytalk import codec
from tinytalk.facts import Facts, extract
from tinytalk.linksim import Link, LinkResult
from tinytalk.textpack import pack_facts, pack_transcript, unpack_facts, unpack_transcript

TIERS = ("A", "B", "C")


@dataclass
class TierSend:
    """One message sent as one tier over one link."""

    tier: str
    payload_bytes: int
    link: LinkResult
    facts: Facts | None  # facts the receiver can read; None for Tier A (audio needs STT first)
    audio_wav: bytes | None = None  # what the receiver hears (Tier A only)


def link_seed(base: int, *parts: Any) -> int:
    """A stable seed per message, tier and loss level (not Python's salted hash)."""
    return base + zlib.crc32("|".join(map(str, parts)).encode())


def send_audio(wav: bytes, link: Link) -> TierSend:
    """Tier A: Codec2 2400 bps over the link with no resends; lost packets become silence."""
    pcm, rate = codec.wav_to_pcm(wav)
    payload = codec.c2_encode(codec.resample(pcm, rate, codec.C2_RATE))
    result = link.send_stream(payload)
    heard = codec.c2_decode_with_loss(result.received, link.payload_bytes // 6)
    out = codec.pcm_to_wav(codec.resample(heard, codec.C2_RATE, 16000), 16000)
    return TierSend("A", len(payload), result, None, out)


def send_transcript(
    text: str, lang: str, zdict: zstandard.ZstdCompressionDict, link: Link
) -> TierSend:
    """Tier B: the full transcript, packed, with resends. The facts are read from what arrives."""
    payload = pack_transcript(text, zdict)
    result = link.send_reliable(payload)
    facts = extract(unpack_transcript(result.data, lang, zdict)) if result.delivered else Facts()
    return TierSend("B", len(payload), result, facts)


def send_facts(facts: Facts, link: Link) -> TierSend:
    """Tier C: only the critical facts, a few bytes, with resends."""
    payload = pack_facts(facts)
    result = link.send_reliable(payload)
    return TierSend(
        "C", len(payload), result, unpack_facts(result.data) if result.delivered else Facts()
    )


def pick_tier(
    rate_kbps: float,
    loss_percent: float,
    audio_seconds: float,
    text_bytes: int,
    cfg: dict[str, Any],
) -> str:
    """Link meter rule: audio if the link can carry it live and is clean, else transcript if
    it is quick enough, else facts only. Thresholds are in config.yaml (tier_picker)."""
    p = cfg["tier_picker"]
    wire_factor = 1 + cfg["link"]["header_bytes"] / cfg["link"]["payload_bytes"]
    audio_airtime = audio_seconds * cfg["codec"]["codec2_mode"] * wire_factor / (rate_kbps * 1000)
    if loss_percent <= p["audio_max_loss_percent"] and audio_airtime <= audio_seconds:
        return "A"
    text_airtime = text_bytes * wire_factor * 8 / (rate_kbps * 1000) / (1 - loss_percent / 100)
    return "B" if text_airtime <= p["text_max_airtime_s"] else "C"
