"""Packing: round trips and sizes (dictionary trained on dev only, checked on test)."""

from hypothesis import given
from hypothesis import strategies as st

from tinytalk import corpus
from tinytalk.facts import Facts, extract
from tinytalk.lexicon import LANGS, PLACES, UNIT_STEMS
from tinytalk.textpack import (
    make_dict,
    pack_facts,
    pack_transcript,
    unpack_facts,
    unpack_transcript,
)

ROWS = corpus.build(1108, 0.3)[0]

facts_strategy = st.builds(
    lambda p, n, t: Facts(tuple(sorted(p)), tuple(sorted(n)), tuple(sorted(t))),
    st.lists(st.sampled_from(sorted(PLACES)), max_size=3),
    st.lists(st.tuples(st.integers(0, 10**6), st.sampled_from(sorted(UNIT_STEMS))), max_size=4),
    st.lists(st.tuples(st.integers(1, 12), st.sampled_from(["am", "pm"])), max_size=2),
)


@given(facts_strategy)
def test_pack_facts_round_trip(f: Facts) -> None:
    assert unpack_facts(pack_facts(f)) == f


def test_transcripts_round_trip_with_same_facts_and_get_smaller() -> None:
    for lang in LANGS:
        rows = [r for r in ROWS if r["lang"] == lang]
        zdict = make_dict([r["text"] for r in rows if r["split"] == "dev"])
        test_rows = [r for r in rows if r["split"] == "test"]
        raw = packed = tier_c = 0
        for r in test_rows:
            data = pack_transcript(r["text"], zdict)
            assert extract(unpack_transcript(data, lang, zdict)) == extract(r["text"])
            raw += len(r["text"].encode())
            packed += len(data)
            tier_c += len(pack_facts(Facts.from_dict(r["facts"])))
        assert tier_c < packed < raw, (lang, tier_c, packed, raw)


def test_unknown_text_is_kept() -> None:
    zdict = make_dict(["hello 5"])
    text = "No place here, 007 and 1234567890123"
    assert unpack_transcript(pack_transcript(text, zdict), "en", zdict) == text
