"""Text normalising, fact extraction and fact scoring for Malayalam, Hindi and English."""

import unicodedata
from collections import Counter
from dataclasses import dataclass
from typing import Any

import jiwer
import regex

from tinytalk import lexicon as lx

# Old-style Malayalam chillu (consonant + virama + ZWJ) -> the single chillu letter.
_CHILLU = {
    "ണ്‍": "ൺ",
    "ന്‍": "ൻ",
    "ര്‍": "ർ",
    "ല്‍": "ൽ",
    "ള്‍": "ൾ",
    "ക്‍": "ൿ",
}
_DIGITS = {
    ord(c): str(i)
    for base in (0x0966, 0x0D66)  # Devanagari, Malayalam
    for i, c in enumerate(chr(base + k) for k in range(10))
}
_KEEP = regex.compile(r"[^\p{L}\p{M}\p{N}\s]")
_DIGIT_LETTER = regex.compile(r"(?<=\d)(?=[\p{L}\p{M}])|(?<=[\p{L}\p{M}])(?=\d)")
_COMMA_NUM = regex.compile(r"(?<=\d),(?=\d)")
_CLOCK_ZERO = regex.compile(r"(?<=\d):00\b")


def normalise(text: str) -> str:
    """Canonical form for comparing texts: NFC, joiners handled, native digits to 0-9, lowercase."""
    text = unicodedata.normalize("NFC", text)
    for old, new in _CHILLU.items():
        text = text.replace(old, new)
    text = text.replace("‌", "").replace("‍", "").translate(_DIGITS).lower()
    text = _COMMA_NUM.sub("", text)
    text = _CLOCK_ZERO.sub("", text)
    text = _KEEP.sub(" ", text)
    text = _DIGIT_LETTER.sub(" ", text)
    return " ".join(text.split())


def _norm_all(words: list[str]) -> list[str]:
    return [normalise(w) for w in words]


_WORD_VAL = {normalise(k): v for k, v in lx.NUMBER_WORDS.items()}
_HUNDRED = set(_norm_all(lx.HUNDRED))
_PLACES = {
    pid: _norm_all([n for names in v.values() for n in names]) for pid, v in lx.PLACES.items()
}
_UNITS = {uid: tuple(_norm_all(stems)) for uid, stems in lx.UNIT_STEMS.items()}
_PERIODS = {p: tuple(_norm_all(stems)) for p, stems in lx.PERIOD_STEMS.items()}
_CLOCK = tuple(_norm_all(list(lx.CLOCK_WORDS)))


@dataclass(frozen=True)
class Facts:
    """The facts of one message: place ids, (value, unit) numbers, (hour, am/pm) times."""

    places: tuple[str, ...] = ()
    numbers: tuple[tuple[int, str], ...] = ()
    times: tuple[tuple[int, str], ...] = ()

    def to_dict(self) -> dict[str, Any]:
        return {
            "places": list(self.places),
            "numbers": [{"value": v, "unit": u} for v, u in self.numbers],
            "times": [{"hour": h, "period": p} for h, p in self.times],
        }

    @staticmethod
    def from_dict(d: dict[str, Any]) -> "Facts":
        return Facts(
            tuple(sorted(d["places"])),
            tuple(sorted((n["value"], n["unit"]) for n in d["numbers"])),
            tuple(sorted((t["hour"], t["period"]) for t in d["times"])),
        )


def _merge_number_words(tokens: list[str]) -> list[str]:
    """Replace runs of number words ('दो सौ पचास', 'fifty five') by one digit token."""
    out: list[str] = []
    i = 0
    while i < len(tokens):
        if tokens[i] in _WORD_VAL or tokens[i] in _HUNDRED:
            cur = 0
            while i < len(tokens) and (tokens[i] in _WORD_VAL or tokens[i] in _HUNDRED):
                cur = (cur or 1) * 100 if tokens[i] in _HUNDRED else cur + _WORD_VAL[tokens[i]]
                i += 1
            out.append(str(cur))
        else:
            out.append(tokens[i])
            i += 1
    return out


def _starts(token: str, stems: tuple[str, ...]) -> bool:
    """Token begins with a stem; two-letter stems (am, pm, km) must match the whole token."""
    return any(token == s if len(s) <= 2 else token.startswith(s) for s in stems)


def extract(text: str) -> Facts:
    """Find places, numbers with units and times in a transcript or message."""
    norm = normalise(text)
    places = tuple(sorted(p for p, names in _PLACES.items() if any(n in norm for n in names)))
    tokens = _merge_number_words(norm.split())
    numbers: list[tuple[int, str]] = []
    times: list[tuple[int, str]] = []
    for i, tok in enumerate(tokens):
        if not tok.isdigit():
            continue
        nxt = tokens[i + 1 : i + 3]
        if nxt and _starts(nxt[0], _CLOCK):
            near = [*tokens[max(0, i - 2) : i], *tokens[i + 1 : i + 4]]
            period = next(
                (p for p, st in _PERIODS.items() if any(_starts(t, st) for t in near)), None
            )
            if period and 1 <= int(tok) <= 12:
                times.append((int(tok), period))
            continue
        unit = next((u for t in nxt for u, st in _UNITS.items() if _starts(t, st)), None)
        if unit:
            numbers.append((int(tok), unit))
    return Facts(places, tuple(sorted(numbers)), tuple(sorted(times)))


def score_facts(truth: Facts, hyp: Facts) -> dict[str, Any]:
    """Per kind: how many true facts the hypothesis has exactly, and how many extra facts it made up."""
    out: dict[str, Any] = {}
    total = matched = extra = 0
    for kind in ("places", "numbers", "times"):
        t, h = Counter(getattr(truth, kind)), Counter(getattr(hyp, kind))
        hit = sum((t & h).values())
        out[kind] = {"truth": sum(t.values()), "matched": hit, "extra": sum((h - t).values())}
        total += sum(t.values())
        matched += hit
        extra += sum((h - t).values())
    out["total"], out["matched"], out["extra"] = total, matched, extra
    out["all_exact"] = matched == total and extra == 0
    return out


def wer_cer(reference: str, hypothesis: str) -> tuple[float, float]:
    """Word and character error rate after normalising both texts."""
    ref, hyp = normalise(reference), normalise(hypothesis)
    if not ref:
        raise ValueError("empty reference")
    if not hyp:
        return 1.0, 1.0
    return float(jiwer.wer(ref, hyp)), float(jiwer.cer(ref, hyp))
