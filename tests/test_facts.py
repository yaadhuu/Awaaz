"""Fact normalising, extraction and scoring: hand-made variants in all three languages."""

import pytest
from hypothesis import given
from hypothesis import strategies as st

from tinytalk import corpus
from tinytalk.facts import Facts, extract, normalise, score_facts, wer_cer
from tinytalk.lexicon import LANGS

ROWS = corpus.build(1108, 0.3)[0]
DIGITS = {"hi": "०१२३४५६७८९", "ml": "൦൧൨൩൪൫൬൭൮൯", "en": "0123456789"}


def native_digits(text: str, lang: str) -> str:
    return text.translate(str.maketrans("0123456789", DIGITS[lang]))


def messy(text: str) -> str:
    """Spacing, punctuation and joiner noise a transcript could have."""
    return "\u200d".join(["  ".join(text.replace(".", " , ").split(" ")), ""]).upper()


@pytest.mark.parametrize("lang", LANGS)
def test_rendered_message_parses_back_to_its_facts(lang: str) -> None:
    rows = [r for r in ROWS if r["lang"] == lang]
    assert len(rows) == 40
    for r in rows:
        assert extract(r["text"]) == Facts.from_dict(r["facts"]), r["text"]


@pytest.mark.parametrize("lang", LANGS)
def test_variants_keep_or_break_facts_as_expected(lang: str) -> None:
    rows = [r for r in ROWS if r["lang"] == lang][::4]  # 10 messages x 3 variants = 30 pairs
    for r in rows:
        truth = Facts.from_dict(r["facts"])
        assert score_facts(truth, extract(native_digits(r["text"], lang)))["all_exact"]
        assert score_facts(truth, extract(messy(r["text"])))["all_exact"]
        first_value = truth.numbers[0][0]
        wrong = r["text"].replace(str(first_value), str(first_value + 1), 1)
        s = score_facts(truth, extract(wrong))
        assert not s["all_exact"] and s["numbers"]["matched"] == len(truth.numbers) - 1


def test_number_words_and_units() -> None:
    assert extract("दो सौ पचास लीटर पानी").numbers == ((250, "litres"),)
    assert extract("fifty five people near Kochi").numbers == ((55, "people"),)
    assert extract("അമ്പത് ആളുകൾ").numbers == ((50, "people"),)
    assert extract("2,40,000 litres").numbers == ((240000, "litres"),)


def test_time_needs_a_period_and_ambulance_is_not_am() -> None:
    assert extract("by 6 pm").times == ((6, "pm"),)
    assert extract("6 बजे").times == ()
    assert extract("5 ambulances").times == () and extract("5 ambulances").numbers == ()


def test_malayalam_chillu_and_zwj_forms_match() -> None:
    assert normalise("ആളുകൾ") == normalise("ആളുകള്\u200d")


def test_scoring_counts_extra_facts() -> None:
    t = Facts(("kochi",), ((5, "boats"),), ())
    s = score_facts(t, Facts(("kochi", "aluva"), ((5, "boats"), (9, "km")), ()))
    assert (s["matched"], s["extra"], s["all_exact"]) == (2, 2, False)


def test_wer_cer() -> None:
    assert wer_cer("a b c d", "a b c d") == (0.0, 0.0)
    wer, _ = wer_cer("one two three four", "one two three")
    assert wer == 0.25
    assert wer_cer("abc", "") == (1.0, 1.0)


@given(st.text(max_size=60))
def test_normalise_is_idempotent(text: str) -> None:
    assert normalise(normalise(text)) == normalise(text)


def test_malayalam_unit_with_joined_suffix() -> None:
    # Prisma wrote "മീറ്ററാകും" (metre + will be) as one word in the pilot.
    assert extract("ജലനിരപ്പ് 4 മീറ്ററാകും").numbers == ((4, "metres"),)
    assert extract("3 കിലോമീറ്ററാണ്").numbers == ((3, "km"),)
