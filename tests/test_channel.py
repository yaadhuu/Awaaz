"""Channel mixing hits the requested signal-to-noise ratio."""

import numpy as np
import pytest

from scripts.make_channel_samples import mix


@pytest.mark.parametrize("snr", [20, 5, 0])
def test_mix_reaches_the_snr(snr: int) -> None:
    rng = np.random.default_rng(0)
    speech = (3000 * np.sin(np.arange(16000) / 7)).astype(np.int16)
    bed = rng.normal(0, 500, 40000).astype(np.int16)
    out = mix(speech, bed, snr, np.random.default_rng(1)).astype(float)
    noise = out - speech.astype(float)
    measured = 10 * np.log10(np.mean(speech.astype(float) ** 2) / np.mean(noise**2))
    assert abs(measured - snr) < 0.5
