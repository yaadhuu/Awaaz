"""Smoke test: pycodec2 mode 2400 has the frame sizes the design assumes."""

from pycodec2 import Codec2


def test_codec2_2400_frame_sizes() -> None:
    c2 = Codec2(2400)
    assert (c2.samples_per_frame(), c2.bytes_per_frame()) == (160, 6)
