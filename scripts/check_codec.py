"""Check that pycodec2 works: mode 2400, 160 samples and 6 bytes per frame, measured bit rate."""

import numpy as np
from pycodec2 import Codec2

SECONDS = 2
RATE = 8000

c2 = Codec2(2400)
spf, bpf = c2.samples_per_frame(), c2.bytes_per_frame()
print(f"samples_per_frame={spf} bytes_per_frame={bpf}")
assert (spf, bpf) == (160, 6)

t = np.arange(SECONDS * RATE) / RATE
pcm = (8000 * np.sin(2 * np.pi * 440 * t)).astype(np.int16)
pcm = pcm[: len(pcm) // spf * spf]

encoded = c2.encode(pcm)
decoded = c2.decode(encoded)
bps = len(encoded) * 8 / (len(pcm) / RATE)
print(f"input_samples={len(pcm)} encoded_bytes={len(encoded)} decoded_samples={len(decoded)}")
print(f"measured_bps={bps:.1f}")
assert round(bps) == 2400
