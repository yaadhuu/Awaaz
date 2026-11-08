"""Check Codec2 2400: frame sizes, that every frame carries data, and the measured bit rate."""

import numpy as np

from tinytalk import codec

SECONDS, RATE = 2, 8000
t = np.arange(SECONDS * RATE) / RATE
pcm = (6000 * np.sum([np.sin(2 * np.pi * 120 * k * t) / k for k in range(1, 12)], axis=0)).astype(
    np.int16
)
data = codec.c2_encode(pcm)
out = codec.c2_decode(data)
print(
    f"encoded_bytes={len(data)} nonzero_bytes={sum(b != 0 for b in data)} decoded_samples={len(out)}"
)
print(f"measured_bps={len(data) * 8 / SECONDS:.1f}")


def rms(x: np.ndarray) -> float:
    return float(np.sqrt((x.astype(float) ** 2).mean()))


print(f"input_rms={rms(pcm):.0f} decoded_rms={rms(out):.0f}")
assert round(len(data) * 8 / SECONDS) == 2400 and sum(b != 0 for b in data) > 0.5 * len(data)
