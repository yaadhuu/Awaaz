"""Compact packing: facts as a few bytes (Tier C), transcripts with a place codebook,
binary numbers and a zstd dictionary built from the dev split only (Tier B)."""

import regex
import zstandard

from tinytalk.facts import Facts
from tinytalk.lexicon import PLACES, UNIT_STEMS

PLACE_IDS = sorted(PLACES)
UNIT_IDS = sorted(UNIT_STEMS)
_VARIANT_ID = {n.lower(): pid for pid, v in PLACES.items() for names in v.values() for n in names}
_TOKEN = regex.compile(
    "("
    + "|".join(regex.escape(v) for v in sorted(_VARIANT_ID, key=len, reverse=True))
    + r")|(\d+)",
    regex.IGNORECASE,
)
_PLACE, _NUMBER = b"\x01", b"\x02"


def _varint(n: int) -> bytes:
    out = bytearray()
    while True:
        out.append((n & 0x7F) | (0x80 if n > 0x7F else 0))
        n >>= 7
        if not n:
            return bytes(out)


def _read_varint(data: bytes, i: int) -> tuple[int, int]:
    n = shift = 0
    while True:
        b = data[i]
        n |= (b & 0x7F) << shift
        i += 1
        shift += 7
        if not b & 0x80:
            return n, i


def pack_facts(f: Facts) -> bytes:
    """Tier C: 1 header byte, 1 byte per place, varint + 1 byte per number, 1 byte per time."""
    if len(f.places) > 7 or len(f.numbers) > 7 or len(f.times) > 3:
        raise ValueError("too many facts for one packet")
    out = bytearray([len(f.places) << 5 | len(f.numbers) << 2 | len(f.times)])
    out += bytes(PLACE_IDS.index(p) for p in f.places)
    for value, unit in f.numbers:
        out += _varint(value) + bytes([UNIT_IDS.index(unit)])
    out += bytes(h << 1 | (p == "pm") for h, p in f.times)
    return bytes(out)


def unpack_facts(data: bytes) -> Facts:
    """Reverse of pack_facts."""
    np_, nn, nt = data[0] >> 5, (data[0] >> 2) & 7, data[0] & 3
    i = 1
    places = tuple(sorted(PLACE_IDS[b] for b in data[i : i + np_]))
    i += np_
    numbers = []
    for _ in range(nn):
        value, i = _read_varint(data, i)
        numbers.append((value, UNIT_IDS[data[i]]))
        i += 1
    times = [(b >> 1, "pm" if b & 1 else "am") for b in data[i : i + nt]]
    return Facts(places, tuple(sorted(numbers)), tuple(sorted(times)))


def to_codebook(text: str) -> bytes:
    """Replace place names by a 2-byte code and digit runs by a binary number."""
    out = bytearray()
    pos = 0
    for m in _TOKEN.finditer(text):
        out += text[pos : m.start()].encode()
        pos = m.end()
        if m.group(1):
            out += _PLACE + bytes([PLACE_IDS.index(_VARIANT_ID[m.group(1).lower()])])
        elif m.group(2).startswith("0") or len(m.group(2)) > 9:
            out += m.group(2).encode()  # leading zeros or huge: keep as text so nothing is lost
        else:
            out += _NUMBER + _varint(int(m.group(2)))
    return bytes(out + text[pos:].encode())


def from_codebook(data: bytes, lang: str) -> str:
    """Reverse of to_codebook; places come back in their standard spelling for the language."""
    out: list[bytes] = []
    i = start = 0
    while i < len(data):
        if data[i : i + 1] == _PLACE:
            out += [data[start:i], PLACES[PLACE_IDS[data[i + 1]]][lang][0].encode()]
            i += 2
            start = i
        elif data[i : i + 1] == _NUMBER:
            value, j = _read_varint(data, i + 1)
            out += [data[start:i], str(value).encode()]
            i = start = j
        else:
            i += 1
    return b"".join(out + [data[start:]]).decode()


def make_dict(dev_texts: list[str]) -> zstandard.ZstdCompressionDict:
    """A zstd dictionary from dev-split transcripts only (the test split is never seen)."""
    return zstandard.ZstdCompressionDict(b"\0".join(to_codebook(t) for t in dev_texts))


def pack_transcript(text: str, zdict: zstandard.ZstdCompressionDict) -> bytes:
    """Tier B payload: codebook form, then zstd with the dev dictionary."""
    c = zstandard.ZstdCompressor(
        level=19, dict_data=zdict, write_content_size=False, write_dict_id=False
    )
    return c.compress(to_codebook(text))


def unpack_transcript(data: bytes, lang: str, zdict: zstandard.ZstdCompressionDict) -> str:
    """Reverse of pack_transcript."""
    raw = zstandard.ZstdDecompressor(dict_data=zdict).decompress(data, max_output_size=1 << 16)
    return from_codebook(raw, lang)
