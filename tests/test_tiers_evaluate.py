"""Tiers, tier picker and evaluation statistics."""

from pathlib import Path

import numpy as np
import pytest
import yaml

from tinytalk import codec, corpus
from tinytalk.evaluate import bootstrap_ci, curve, summarise, wilson
from tinytalk.facts import Facts
from tinytalk.linksim import Link
from tinytalk.textpack import make_dict
from tinytalk.tiers import pick_tier, send_audio, send_facts, send_transcript

CFG = yaml.safe_load((Path(__file__).parent.parent / "config.yaml").read_text("utf-8"))
ROWS = [r for r in corpus.build(1108, 0.3)[0] if r["lang"] == "hi"]
ZDICT = make_dict([r["text"] for r in ROWS if r["split"] == "dev"])


def test_tier_b_and_c_deliver_the_facts_on_a_clean_link() -> None:
    r = next(x for x in ROWS if x["split"] == "test")
    truth = Facts.from_dict(r["facts"])
    c = send_facts(truth, Link(5, 0, 1))
    b = send_transcript(r["text"], "hi", ZDICT, Link(5, 0, 1))
    assert c.facts == truth
    assert b.facts == truth
    assert c.payload_bytes < b.payload_bytes


def test_failed_delivery_gives_no_facts() -> None:
    link = Link(5, 99, 1, max_resends=0)
    s = send_facts(Facts(("kochi",), ((5, "boats"),), ()), link)
    assert not s.link.delivered
    assert s.facts == Facts()


def test_tier_a_sends_codec2_and_loses_packets_on_a_lossy_link() -> None:
    t = np.arange(32000) / 16000  # 2 s of a voiced buzz: 120 Hz with harmonics
    harmonics = np.sum([np.sin(2 * np.pi * 120 * k * t) / k for k in range(1, 12)], axis=0)
    pcm = (6000 * harmonics).astype(np.int16)
    wav = codec.pcm_to_wav(pcm, 16000)
    clean = send_audio(wav, Link(5, 0, 1))
    lossy = send_audio(wav, Link(5, 30, 1))
    assert clean.payload_bytes == 600
    assert lossy.link.received.count(None) > 0
    clean_pcm, _ = codec.wav_to_pcm(clean.audio_wav or b"")
    assert abs(len(clean_pcm) - 32000) < 400


def test_lost_chunk_becomes_exact_silence() -> None:
    chunk = codec.c2_encode(np.full(1280, 3000, dtype=np.int16))[:48]  # 8 frames
    pcm = codec.c2_decode_with_loss([chunk, None, chunk])
    assert len(pcm) == 3 * 8 * 160
    assert not pcm[1280:2560].any()  # the lost middle chunk is zeros


@pytest.mark.parametrize(
    ("rate", "loss", "text_bytes", "expected"),
    [(10, 0, 30, "A"), (2, 0, 30, "B"), (10, 30, 30, "B"), (0.5, 20, 5000, "C")],
)
def test_pick_tier(rate: float, loss: float, text_bytes: int, expected: str) -> None:
    assert pick_tier(rate, loss, 10.0, text_bytes, CFG) == expected


def test_wilson_and_bootstrap() -> None:
    lo, hi = wilson(0, 10)
    assert lo == 0 and hi == pytest.approx(0.2775, abs=1e-3)
    assert wilson(10, 10)[0] == pytest.approx(0.7225, abs=1e-3)
    assert wilson(0, 0) == (0.0, 1.0)
    assert bootstrap_ci([1.0, 2.0, 3.0, 4.0], 7) == bootstrap_ci([1.0, 2.0, 3.0, 4.0], 7)


def test_summarise_and_curve() -> None:
    rows = [
        {"matched": 3, "total": 3, "extra": 0, "all_exact": True, "wer": 0.0, "cer": 0.0},
        {"matched": 1, "total": 3, "extra": 1, "all_exact": False, "wer": 0.5, "cer": 0.25},
    ]
    s = summarise(rows, 7)
    assert (s["facts_matched"], s["facts_total"], s["message_exact"]) == (4, 6, 1)
    assert s["wer"] == 0.25
    point = {
        "tier": "C", "lang": "hi", "loss": 0, "matched": 3, "total": 3,
        "payload_bytes": 6, "bytes_sent": 10, "audio_seconds": 6.0, "delivered": True,
    }  # fmt: skip
    (c,) = curve([point, point])
    assert c["payload_bytes_per_min"] == 60 and c["wire_bytes_per_min"] == 100
    assert c["fact_rate"] == 1.0
    assert c["mean_airtime_s"]["2"] == pytest.approx(10 * 8 / 2000)
