"""Python twin of web/src/lib/languages.ts.

Provides the same 10-language registry so Python code (API, export scripts)
can share the same constants.  Any change here must be mirrored in
web/src/lib/languages.ts and vice versa.

Data source: docs/GNANI_NOTES.md only.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

Badge = Literal["Measured", "Working", "Supported, not tested"]
ReviewStatus = Literal["reviewed", "UNVERIFIED"]


@dataclass(frozen=True)
class LangInfo:
    code: str               # Gnani lang code, e.g. "ml-IN"
    iso: str                # ISO 639-1 short, e.g. "ml"
    name_en: str
    name_native: str
    script: str
    unicode_ranges: list[tuple[int, int]]  # [start, end] inclusive
    badge: Badge
    has_word_lists: bool
    prisma_supported: bool
    timbre_supported: bool
    sample_message: str     # labelled "sample, not reviewed"
    sample_review_status: ReviewStatus


# Stable order: index = language byte in share codes.  Do NOT reorder.
LANGUAGES: list[LangInfo] = [
    LangInfo(
        code="bn-IN", iso="bn", name_en="Bengali", name_native="বাংলা",
        script="Bengali", unicode_ranges=[(0x0980, 0x09FF)],
        badge="Supported, not tested", has_word_lists=False,
        prisma_supported=True, timbre_supported=True,
        sample_message="বন্যা সতর্কতা: আলুভা, 50 জন আক্রান্ত, সন্ধ্যা 7।",
        sample_review_status="UNVERIFIED",
    ),
    LangInfo(
        code="en-IN", iso="en", name_en="English", name_native="English",
        script="Latin", unicode_ranges=[(0x0041, 0x005A), (0x0061, 0x007A)],
        badge="Measured", has_word_lists=True,
        prisma_supported=True, timbre_supported=True,
        sample_message="Flood warning: 50 people stranded at Aluva, doctors needed by 7 pm.",
        sample_review_status="reviewed",
    ),
    LangInfo(
        code="gu-IN", iso="gu", name_en="Gujarati", name_native="ગુજરાતી",
        script="Gujarati", unicode_ranges=[(0x0A80, 0x0AFF)],
        badge="Supported, not tested", has_word_lists=False,
        prisma_supported=True, timbre_supported=True,
        sample_message="પૂરની ચેતવણી: 50 લોકો, આળ ક્ષેત્ર, સાંજે 7 વાગ્યે.",
        sample_review_status="UNVERIFIED",
    ),
    LangInfo(
        code="hi-IN", iso="hi", name_en="Hindi", name_native="हिन्दी",
        script="Devanagari", unicode_ranges=[(0x0900, 0x097F)],
        badge="Measured", has_word_lists=True,
        prisma_supported=True, timbre_supported=True,
        sample_message="बाढ़ की चेतावनी: आलुवा में 50 लोग फंसे हैं, शाम 7 बजे डॉक्टर चाहिए।",
        sample_review_status="UNVERIFIED",
    ),
    LangInfo(
        code="kn-IN", iso="kn", name_en="Kannada", name_native="ಕನ್ನಡ",
        script="Kannada", unicode_ranges=[(0x0C80, 0x0CFF)],
        badge="Supported, not tested", has_word_lists=False,
        prisma_supported=True, timbre_supported=True,
        sample_message="ಪ್ರವಾಹ ಎಚ್ಚರಿಕೆ: 50 ಜನ, ಸಂಜೆ 7 ಗಂಟೆಗೆ ವೈದ್ಯರು ಬೇಕು.",
        sample_review_status="UNVERIFIED",
    ),
    LangInfo(
        code="ml-IN", iso="ml", name_en="Malayalam", name_native="മലയാളം",
        script="Malayalam", unicode_ranges=[(0x0D00, 0x0D7F)],
        badge="Measured", has_word_lists=True,
        prisma_supported=True, timbre_supported=True,
        sample_message=(
            "ആലുവ പ്രദേശത്ത് വെള്ളപ്പൊക്ക മുന്നറിയിപ്പ്. "
            "50 ആളുകൾക്ക് വൈദ്യസഹായം വേണം, വൈകുന്നേരം 7 മണിക്ക്."
        ),
        sample_review_status="UNVERIFIED",
    ),
    LangInfo(
        code="mr-IN", iso="mr", name_en="Marathi", name_native="मराठी",
        script="Devanagari", unicode_ranges=[(0x0900, 0x097F)],
        badge="Supported, not tested", has_word_lists=False,
        prisma_supported=True, timbre_supported=True,
        sample_message="पूर चेतावणी: 50 लोक अडकले, संध्याकाळी 7 वाजता डॉक्टर हवे.",
        sample_review_status="UNVERIFIED",
    ),
    LangInfo(
        code="pa-IN", iso="pa", name_en="Punjabi", name_native="ਪੰਜਾਬੀ",
        script="Gurmukhi", unicode_ranges=[(0x0A00, 0x0A7F)],
        badge="Supported, not tested", has_word_lists=False,
        prisma_supported=True, timbre_supported=True,
        sample_message="ਹੜ੍ਹ ਦੀ ਚੇਤਾਵਨੀ: 50 ਲੋਕ, ਸ਼ਾਮ 7 ਵਜੇ ਡਾਕਟਰਾਂ ਦੀ ਲੋੜ।",
        sample_review_status="UNVERIFIED",
    ),
    LangInfo(
        code="ta-IN", iso="ta", name_en="Tamil", name_native="தமிழ்",
        script="Tamil", unicode_ranges=[(0x0B80, 0x0BFF)],
        badge="Supported, not tested", has_word_lists=False,
        prisma_supported=True, timbre_supported=True,
        sample_message="வெள்ள எச்சரிக்கை: 50 பேர் சிக்கியுள்ளனர், மாலை 7 மணிக்கு மருத்துவர் தேவை.",
        sample_review_status="UNVERIFIED",
    ),
    LangInfo(
        code="te-IN", iso="te", name_en="Telugu", name_native="తెలుగు",
        script="Telugu", unicode_ranges=[(0x0C00, 0x0C7F)],
        badge="Supported, not tested", has_word_lists=False,
        prisma_supported=True, timbre_supported=True,
        sample_message="వరద హెచ్చరిక: 50 మంది చిక్కుకున్నారు, సాయంత్రం 7 గంటలకు వైద్యులు కావాలి.",
        sample_review_status="UNVERIFIED",
    ),
]

LANG_CODES: list[str] = [l.code for l in LANGUAGES]

_BY_CODE: dict[str, LangInfo] = {l.code: l for l in LANGUAGES}
_BY_ISO: dict[str, LangInfo] = {l.iso: l for l in LANGUAGES}


def get_lang(code: str) -> LangInfo | None:
    """Look up by Gnani code ('ml-IN') or ISO code ('ml')."""
    return _BY_CODE.get(code) or _BY_ISO.get(code)
