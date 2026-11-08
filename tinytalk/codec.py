"""Codec2 (primary) and Opus (fallback) encode/decode, plus WAV helpers."""

import io
import shutil
import subprocess
import wave

import numpy as np
import soxr
from numpy.typing import NDArray
from pycodec2 import Codec2

Pcm = NDArray[np.int16]
C2_MODE = 2400
C2_RATE = 8000


def wav_to_pcm(audio: bytes) -> tuple[Pcm, int]:
    """Mono int16 samples and sample rate from WAV bytes (the header frame count can be wrong)."""
    with wave.open(io.BytesIO(audio)) as w:
        rate, width, channels = w.getframerate(), w.getsampwidth(), w.getnchannels()
    if width != 2 or channels != 1:
        raise ValueError(f"need 16-bit mono WAV, got {width * 8}-bit x{channels}")
    start = audio.find(b"data") + 8
    return np.frombuffer(audio[start : start + (len(audio) - start) // 2 * 2], dtype="<i2"), rate


def pcm_to_wav(pcm: Pcm, rate: int) -> bytes:
    """16-bit mono WAV bytes."""
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(pcm.astype("<i2").tobytes())
    return buf.getvalue()


def resample(pcm: Pcm, src: int, dst: int) -> Pcm:
    """Change the sample rate with soxr."""
    if src == dst:
        return pcm
    out = soxr.resample(pcm.astype(np.float32), src, dst)
    return np.asarray(np.clip(np.rint(out), -32768, 32767), dtype=np.int16)


def c2_encode(pcm8k: Pcm) -> bytes:
    """Codec2 2400 bps: 160 samples (20 ms) become 6 bytes. Pads the last frame with silence."""
    c2 = Codec2(C2_MODE)
    n = c2.samples_per_frame()
    padded = np.pad(pcm8k, (0, -len(pcm8k) % n))
    return bytes(c2.encode(padded))


def c2_decode(data: bytes) -> Pcm:
    """Codec2 2400 bps decode back to 8 kHz samples."""
    return np.asarray(Codec2(C2_MODE).decode(data), dtype=np.int16)


def opus_available() -> bool:
    """True if ffmpeg is installed with the libopus encoder."""
    if not shutil.which("ffmpeg"):
        return False
    out = subprocess.run(
        ["ffmpeg", "-hide_banner", "-encoders"], check=False, capture_output=True, text=True
    )
    return "libopus" in out.stdout


def opus_encode(pcm: Pcm, rate: int, kbps: int = 6) -> bytes:
    """Opus in an Ogg container at the given bit rate, via ffmpeg."""
    cmd = ["ffmpeg", "-v", "error", "-f", "s16le", "-ar", str(rate), "-ac", "1", "-i", "-"]
    cmd += ["-c:a", "libopus", "-b:a", f"{kbps}k", "-f", "ogg", "-"]
    return subprocess.run(cmd, input=pcm.tobytes(), capture_output=True, check=True).stdout


def opus_decode(data: bytes, rate: int) -> Pcm:
    """Decode Ogg Opus to 16-bit mono samples at the given rate, via ffmpeg."""
    cmd = ["ffmpeg", "-v", "error", "-i", "-", "-f", "s16le", "-ar", str(rate), "-ac", "1", "-"]
    out = subprocess.run(cmd, input=data, capture_output=True, check=True).stdout
    return np.frombuffer(out, dtype="<i2")


def c2_decode_with_loss(chunks: list[bytes | None], frames_per_chunk: int = 8) -> Pcm:
    """Decode received chunks; a lost chunk (None) becomes silence of the same length."""
    n = Codec2(C2_MODE).samples_per_frame()
    parts = [
        c2_decode(c) if c is not None else np.zeros(frames_per_chunk * n, dtype=np.int16)
        for c in chunks
    ]
    return np.concatenate(parts) if parts else np.zeros(0, dtype=np.int16)
