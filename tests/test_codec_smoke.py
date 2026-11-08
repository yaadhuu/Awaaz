"""Smoke test: pycodec2 mode 2400 has the frame sizes and bit rate the design assumes."""

import numpy as np
from pycodec2 import Codec2


def test_codec2_2400_bit_rate() -> None:
    c2 = Codec2(2400)
    assert (c2.samples_per_frame(), c2.bytes_per_frame()) == (160, 6)
    pcm = np.zeros(8000, dtype=np.int16)  # 1 s at 8 kHz
    assert len(c2.encode(pcm)) * 8 == 2400
