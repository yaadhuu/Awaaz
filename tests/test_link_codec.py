"""Codec and link simulator: determinism, bit rate, loss rate, airtime."""

import numpy as np
import pytest

from tinytalk import codec
from tinytalk.linksim import Link, make_packet, parse_packet


def test_codec2_bit_rate_and_length() -> None:
    pcm = np.random.default_rng(0).normal(0, 3000, 16000).astype(np.int16)  # 2 s at 8 kHz
    data = codec.c2_encode(pcm)
    assert len(data) * 8 / 2 == 2400
    assert len(codec.c2_decode(data)) == len(pcm)


def test_resample_and_wav_roundtrip() -> None:
    pcm = (1000 * np.sin(np.arange(16000) / 5)).astype(np.int16)
    down = codec.resample(pcm, 16000, 8000)
    assert abs(len(down) - 8000) <= 1
    back, rate = codec.wav_to_pcm(codec.pcm_to_wav(pcm, 16000))
    assert rate == 16000 and np.array_equal(back, pcm)


@pytest.mark.skipif(not codec.opus_available(), reason="ffmpeg with libopus not installed")
def test_opus_6kbps_is_near_6kbps() -> None:
    pcm = np.random.default_rng(1).normal(0, 3000, 32000).astype(np.int16)  # 2 s at 16 kHz
    data = codec.opus_encode(pcm, 16000, 6)
    assert 4000 < len(data) * 8 / 2 < 8000  # Ogg overhead makes it a little above 6000


def test_same_seed_same_result_different_seed_differs() -> None:
    def run(seed: int) -> list[bool]:
        link = Link(5, 30, seed)
        return [link._lost() for _ in range(200)]

    assert run(1) == run(1)
    assert run(1) != run(2)


@pytest.mark.parametrize("loss", [10, 20, 30])
def test_long_run_loss_and_burst_length(loss: int) -> None:
    link = Link(5, loss, seed=3)
    flags = [link._lost() for _ in range(60000)]
    assert abs(sum(flags) / len(flags) - loss / 100) < 0.015
    bursts: list[int] = []
    run = 0
    for f in flags:
        if f:
            run += 1
        elif run:
            bursts.append(run)
            run = 0
    assert 2.5 < sum(bursts) / len(bursts) < 3.5  # configured mean burst is 3


def test_airtime_by_hand() -> None:
    # 600 bytes -> 13 packets (12 x 48 + 24); wire bytes = 600 + 13 x 4 = 652; 652 x 8 / 2000 = 2.608 s
    r = Link(2, 0, seed=1).send_reliable(bytes(600))
    assert (r.packets, r.bytes_sent, r.resends, r.delivered) == (13, 652, 0, True)
    assert r.airtime_s == pytest.approx(2.608)


def test_resends_cost_more_and_stream_loses_packets() -> None:
    clean = Link(5, 0, seed=1).send_reliable(bytes(480))
    lossy = Link(5, 30, seed=1).send_reliable(bytes(480))
    assert lossy.resends > 0
    assert lossy.bytes_sent > clean.bytes_sent
    stream = Link(5, 30, seed=1).send_stream(bytes(4800))
    assert stream.received.count(None) > 0
    assert len(stream.data) < 4800


def test_crc_detects_corruption() -> None:
    p = make_packet(7, b"hello")
    assert parse_packet(p) == (7, b"hello")
    assert parse_packet(p[:-1] + b"X") is None
