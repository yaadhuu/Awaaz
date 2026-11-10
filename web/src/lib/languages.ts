/**
 * languages.ts — Language registry for all ten Gnani languages.
 *
 * Python twin: tinytalk/languages.py
 * Data source: docs/GNANI_NOTES.md only. Nothing claimed that is not in the notes.
 *
 * Badges:
 *   Measured             — key facts scored with Wilson intervals (en, hi, ml)
 *   Working              — full pipeline ran in a live smoke test (none yet beyond measured)
 *   Supported, not tested — Prisma and Timbre accept the language code; pipeline not smoke-tested
 *
 * Sample messages are labelled "sample, not reviewed" and live in a separate
 * corpus split that is NEVER mixed into the measured test split.
 */

export type Badge = 'Measured' | 'Working' | 'Supported, not tested'

export interface LangInfo {
  /** Gnani language code, e.g. "ml-IN" */
  code: string
  /** ISO 639-1 short code, e.g. "ml" */
  iso: string
  nameEn: string
  nameNative: string
  /** Unicode script name */
  script: string
  /**
   * Unicode codepoint ranges for the primary script.
   * Used to detect which script a transcript is in.
   * [start, end] inclusive.  A single char in this range → this script.
   */
  unicodeRanges: [number, number][]
  badge: Badge
  /** Word lists exist for fact extraction (place names, number words, unit stems). */
  hasWordLists: boolean
  /** Prisma STT accepts this language code (from docs/GNANI_NOTES.md). */
  prismaSupported: boolean
  /** Timbre TTS accepts this language code (from docs/GNANI_NOTES.md). */
  timbreSupported: boolean
  /**
   * One short templated flood-warning message in this language.
   * Uses the same four fact groups: place, quantity, need, time.
   * LABELLED: "sample, not reviewed" — never used in accuracy evaluation.
   * Native-speaker review still pending for all except en.
   */
  sampleMessage: string
  /** Review status of the sample message. */
  sampleReviewStatus: 'reviewed' | 'UNVERIFIED'
}

/**
 * All ten Gnani language codes in stable order.
 * The index is used as the language byte in share codes — do not reorder.
 */
export const LANG_CODES = [
  'bn-IN',
  'en-IN',
  'gu-IN',
  'hi-IN',
  'kn-IN',
  'ml-IN',
  'mr-IN',
  'pa-IN',
  'ta-IN',
  'te-IN',
] as const

export type LangCode = (typeof LANG_CODES)[number]

export const LANGUAGES: readonly LangInfo[] = [
  {
    code: 'bn-IN',
    iso: 'bn',
    nameEn: 'Bengali',
    nameNative: 'বাংলা',
    script: 'Bengali',
    unicodeRanges: [[0x0980, 0x09ff]],
    badge: 'Supported, not tested',
    hasWordLists: false,
    prismaSupported: true,
    timbreSupported: true,
    // sample, not reviewed — UNVERIFIED, needs native-speaker check
    sampleMessage: 'বন্যা সতর্কতা: আলুভা, 50 জন আক্রান্ত, সন্ধ্যা 7।',
    sampleReviewStatus: 'UNVERIFIED',
  },
  {
    code: 'en-IN',
    iso: 'en',
    nameEn: 'English',
    nameNative: 'English',
    script: 'Latin',
    unicodeRanges: [
      [0x0041, 0x005a],
      [0x0061, 0x007a],
    ],
    badge: 'Measured',
    hasWordLists: true,
    prismaSupported: true,
    timbreSupported: true,
    sampleMessage: 'Flood warning: 50 people stranded at Aluva, doctors needed by 7 pm.',
    sampleReviewStatus: 'reviewed',
  },
  {
    code: 'gu-IN',
    iso: 'gu',
    nameEn: 'Gujarati',
    nameNative: 'ગુજરાતી',
    script: 'Gujarati',
    unicodeRanges: [[0x0a80, 0x0aff]],
    badge: 'Supported, not tested',
    hasWordLists: false,
    prismaSupported: true,
    timbreSupported: true,
    // sample, not reviewed — UNVERIFIED, needs native-speaker check
    sampleMessage: 'પૂરની ચેતવણી: 50 લોકો, આળ ક્ષેત્ર, સાંજે 7 વાગ્યે.',
    sampleReviewStatus: 'UNVERIFIED',
  },
  {
    code: 'hi-IN',
    iso: 'hi',
    nameEn: 'Hindi',
    nameNative: 'हिन्दी',
    script: 'Devanagari',
    unicodeRanges: [[0x0900, 0x097f]],
    badge: 'Measured',
    hasWordLists: true,
    prismaSupported: true,
    timbreSupported: true,
    // sample, not reviewed — UNVERIFIED, needs native-speaker check (Hindi text machine-written)
    sampleMessage: 'बाढ़ की चेतावनी: आलुवा में 50 लोग फंसे हैं, शाम 7 बजे डॉक्टर चाहिए।',
    sampleReviewStatus: 'UNVERIFIED',
  },
  {
    code: 'kn-IN',
    iso: 'kn',
    nameEn: 'Kannada',
    nameNative: 'ಕನ್ನಡ',
    script: 'Kannada',
    unicodeRanges: [[0x0c80, 0x0cff]],
    badge: 'Supported, not tested',
    hasWordLists: false,
    prismaSupported: true,
    timbreSupported: true,
    // sample, not reviewed — UNVERIFIED, needs native-speaker check
    sampleMessage: 'ಪ್ರವಾಹ ಎಚ್ಚರಿಕೆ: 50 ಜನ, ಸಂಜೆ 7 ಗಂಟೆಗೆ ವೈದ್ಯರು ಬೇಕು.',
    sampleReviewStatus: 'UNVERIFIED',
  },
  {
    code: 'ml-IN',
    iso: 'ml',
    nameEn: 'Malayalam',
    nameNative: 'മലയാളം',
    script: 'Malayalam',
    unicodeRanges: [[0x0d00, 0x0d7f]],
    badge: 'Measured',
    hasWordLists: true,
    prismaSupported: true,
    timbreSupported: true,
    // sample, not reviewed — Malayalam text needs Yadhu's review (see docs/review/)
    sampleMessage: 'ആലുവ പ്രദേശത്ത് വെള്ളപ്പൊക്ക മുന്നറിയിപ്പ്. 50 ആളുകൾക്ക് വൈദ്യസഹായം വേണം, വൈകുന്നേരം 7 മണിക്ക്.',
    sampleReviewStatus: 'UNVERIFIED',
  },
  {
    code: 'mr-IN',
    iso: 'mr',
    nameEn: 'Marathi',
    nameNative: 'मराठी',
    script: 'Devanagari',
    unicodeRanges: [[0x0900, 0x097f]],
    badge: 'Supported, not tested',
    hasWordLists: false,
    prismaSupported: true,
    timbreSupported: true,
    // sample, not reviewed — UNVERIFIED, needs native-speaker check
    sampleMessage: 'पूर चेतावणी: 50 लोक अडकले, संध्याकाळी 7 वाजता डॉक्टर हवे.',
    sampleReviewStatus: 'UNVERIFIED',
  },
  {
    code: 'pa-IN',
    iso: 'pa',
    nameEn: 'Punjabi',
    nameNative: 'ਪੰਜਾਬੀ',
    script: 'Gurmukhi',
    unicodeRanges: [[0x0a00, 0x0a7f]],
    badge: 'Supported, not tested',
    hasWordLists: false,
    prismaSupported: true,
    timbreSupported: true,
    // sample, not reviewed — UNVERIFIED, needs native-speaker check
    sampleMessage: 'ਹੜ੍ਹ ਦੀ ਚੇਤਾਵਨੀ: 50 ਲੋਕ, ਸ਼ਾਮ 7 ਵਜੇ ਡਾਕਟਰਾਂ ਦੀ ਲੋੜ।',
    sampleReviewStatus: 'UNVERIFIED',
  },
  {
    code: 'ta-IN',
    iso: 'ta',
    nameEn: 'Tamil',
    nameNative: 'தமிழ்',
    script: 'Tamil',
    unicodeRanges: [[0x0b80, 0x0bff]],
    badge: 'Supported, not tested',
    hasWordLists: false,
    prismaSupported: true,
    timbreSupported: true,
    // sample, not reviewed — UNVERIFIED, needs native-speaker check
    sampleMessage: 'வெள்ள எச்சரிக்கை: 50 பேர் சிக்கியுள்ளனர், மாலை 7 மணிக்கு மருத்துவர் தேவை.',
    sampleReviewStatus: 'UNVERIFIED',
  },
  {
    code: 'te-IN',
    iso: 'te',
    nameEn: 'Telugu',
    nameNative: 'తెలుగు',
    script: 'Telugu',
    unicodeRanges: [[0x0c00, 0x0c7f]],
    badge: 'Supported, not tested',
    hasWordLists: false,
    prismaSupported: true,
    timbreSupported: true,
    // sample, not reviewed — UNVERIFIED, needs native-speaker check
    sampleMessage: 'వరద హెచ్చరిక: 50 మంది చిక్కుకున్నారు, సాయంత్రం 7 గంటలకు వైద్యులు కావాలి.',
    sampleReviewStatus: 'UNVERIFIED',
  },
]

/** Look up a LangInfo by Gnani language code (e.g. "ml-IN") or ISO code (e.g. "ml"). */
export function getLang(code: string): LangInfo | undefined {
  return LANGUAGES.find((l) => l.code === code || l.iso === code)
}

/**
 * Detect which script a string is likely written in by scanning for codepoints
 * in each language's unicode ranges.  Returns the LangInfo of the first match,
 * or undefined.  For Latin script (en/mr share Devanagari with hi) this is
 * approximate — do not use for language ID; Prisma returns detected_language_code.
 */
export function detectScript(text: string): LangInfo | undefined {
  const cp = [...text].map((c) => c.codePointAt(0)!)
  for (const lang of LANGUAGES) {
    if (
      cp.some((code) => lang.unicodeRanges.some(([lo, hi]) => code >= lo && code <= hi))
    ) {
      return lang
    }
  }
  return undefined
}

