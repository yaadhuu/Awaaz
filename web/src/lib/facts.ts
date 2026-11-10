/**
 * facts.ts — TypeScript port of tinytalk/facts.py
 *
 * Python is the source of truth.  Any change to facts.py must be reflected here,
 * and the golden tests (golden.test.ts) must pass on every corpus message.
 *
 * Rules:
 *  - Unknown places → unrecognised[], never guessed
 *  - Unknown units  → unrecognised[], never guessed
 *  - Limits: 7 places, 7 numbers, 3 times (same as Python pack_facts)
 */

import {
  CLOCK_WORDS,
  HUNDRED,
  NUMBER_WORDS,
  PERIOD_STEMS,
  PLACE_IDS,
  PLACES,
  UNIT_IDS,
  UNIT_STEMS,
} from './lexicon.gen'

// ---------------------------------------------------------------------------
// Chillu normalization — old-style (consonant + virama + ZWJ) → single chillu
// ---------------------------------------------------------------------------
const CHILLU: Record<string, string> = {
  'ണ്\u200D': 'ൺ',
  'ന്\u200D': 'ൻ',
  'ര്\u200D': 'ർ',
  'ല്\u200D': 'ൽ',
  'ള്\u200D': 'ൾ',
  'ക്\u200D': 'ൿ',
}

// ---------------------------------------------------------------------------
// Indic digit ranges → ASCII 0-9
// Every base codepoint maps digit 0 at base+0, 1 at base+1, … 9 at base+9
// ---------------------------------------------------------------------------
const INDIC_DIGIT_BASES = [
  0x0966, // Devanagari (hi, mr, bho, ...)
  0x09e6, // Bengali (bn)
  0x0a66, // Gurmukhi (pa)
  0x0ae6, // Gujarati (gu)
  0x0b66, // Odia
  0x0be6, // Tamil (ta)
  0x0c66, // Telugu (te)
  0x0ce6, // Kannada (kn)
  0x0d66, // Malayalam (ml)
]

function indicToAscii(text: string): string {
  const cp = [...text]
  return cp
    .map((ch) => {
      const code = ch.codePointAt(0)!
      for (const base of INDIC_DIGIT_BASES) {
        if (code >= base && code <= base + 9) return String(code - base)
      }
      return ch
    })
    .join('')
}

// ---------------------------------------------------------------------------
// Regex patterns (same semantics as Python)
// \p{L}\p{M}\p{N} require the Unicode flag
// ---------------------------------------------------------------------------

/** Remove everything that is not a letter, mark, number or whitespace. */
const RE_KEEP = /[^\p{L}\p{M}\p{N}\s]/gu

/** Insert a space at every digit→letter or letter→digit boundary. */
const RE_DIGIT_LETTER = /(?<=\d)(?=[\p{L}\p{M}])|(?<=[\p{L}\p{M}])(?=\d)/gu

/** Remove commas that are digit-grouping separators (1,000 → 1000). */
const RE_COMMA_NUM = /(?<=\d),(?=\d)/gu

/** Remove trailing :00 from clock times (7:00 pm → 7 pm). */
const RE_CLOCK_ZERO = /(?<=\d):00\b/gu

// ---------------------------------------------------------------------------
// Normalize — canonical form for comparing texts.
// Must produce exactly the same output as tinytalk/facts.normalise().
// ---------------------------------------------------------------------------
export function normalise(text: string): string {
  // 1. Unicode NFC
  text = text.normalize('NFC')

  // 2. Old-style chillu → single codepoint
  for (const [old, rep] of Object.entries(CHILLU)) {
    text = text.split(old).join(rep)
  }

  // 3. Strip ZWNJ (U+200C) and ZWJ (U+200D)
  text = text.replace(/[\u200C\u200D]/gu, '')

  // 4. Indic digits → ASCII
  text = indicToAscii(text)

  // 5. Lowercase
  text = text.toLowerCase()

  // 6. Comma-separated digits: remove the comma
  text = text.replace(RE_COMMA_NUM, '')

  // 7. :00 after a digit: remove
  text = text.replace(RE_CLOCK_ZERO, '')

  // 8. Remove punctuation (keep letters, marks, numbers, whitespace)
  text = text.replace(RE_KEEP, ' ')

  // 9. Digit ↔ letter boundary: insert space
  text = text.replace(RE_DIGIT_LETTER, ' ')

  // 10. Collapse whitespace
  return text.split(/\s+/).filter(Boolean).join(' ')
}

// ---------------------------------------------------------------------------
// Pre-normalise lexicon lookups
// ---------------------------------------------------------------------------

/** Normalised number words → integer value */
const WORD_VAL: Map<string, number> = new Map(
  Object.entries(NUMBER_WORDS).map(([w, v]) => [normalise(w), v]),
)

/** Normalised hundred-words */
const HUNDREDS: Set<string> = new Set((HUNDRED as readonly string[]).map(normalise))

/** place id → list of normalised names (all languages flattened) */
const NORM_PLACES: Map<string, string[]> = new Map(
  PLACE_IDS.map((pid) => {
    const allNames: string[] = []
    const placeEntry = (PLACES as Record<string, Record<string, readonly string[]>>)[pid]
    if (placeEntry) {
      for (const names of Object.values(placeEntry)) {
        for (const n of names) allNames.push(normalise(n))
      }
    }
    return [pid, allNames]
  }),
)

/** unit id → list of normalised stems */
const NORM_UNITS: Map<string, string[]> = new Map(
  UNIT_IDS.map((uid) =>
    [uid, ((UNIT_STEMS as Record<string, readonly string[]>)[uid] || []).map(normalise)] as [string, string[]],
  ),
)

/** period id → list of normalised stems */
const NORM_PERIODS: Map<string, string[]> = new Map(
  Object.entries(PERIOD_STEMS as Record<string, readonly string[]>).map(([p, stems]) => [
    p,
    stems.map(normalise),
  ]),
)

/** Normalised clock words */
const NORM_CLOCKS: string[] = (CLOCK_WORDS as readonly string[]).map(normalise)

// ---------------------------------------------------------------------------
// Number word merging (same algorithm as Python _merge_number_words)
// ---------------------------------------------------------------------------
function mergeNumberWords(tokens: string[]): string[] {
  const out: string[] = []
  let i = 0
  while (i < tokens.length) {
    if (WORD_VAL.has(tokens[i]) || HUNDREDS.has(tokens[i])) {
      let cur = 0
      while (i < tokens.length && (WORD_VAL.has(tokens[i]) || HUNDREDS.has(tokens[i]))) {
        if (HUNDREDS.has(tokens[i])) {
          cur = (cur || 1) * 100
        } else {
          cur += WORD_VAL.get(tokens[i])!
        }
        i++
      }
      out.push(String(cur))
    } else {
      out.push(tokens[i])
      i++
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// Stem matching — same as Python _starts(token, stems)
// Two-letter stems (am, pm, km) must match the whole token.
// ---------------------------------------------------------------------------
function starts(token: string, stems: string[]): boolean {
  return stems.some((s) => (s.length <= 2 ? token === s : token.startsWith(s)))
}

// ---------------------------------------------------------------------------
// Extracted facts + unrecognised tokens
// ---------------------------------------------------------------------------
export interface ExtractedFacts {
  places: string[]
  numbers: { value: number; unit: string }[]
  times: { hour: number; period: string }[]
  /** Tokens that look like a place or unit but are not in our lexicon. Never guessed. */
  unrecognised: string[]
}

/** Extract places, numbers with units and times from a normalised text. */
export function extract(text: string): ExtractedFacts {
  const norm = normalise(text)
  const unrecognised: string[] = []

  // --- places ---
  const places: string[] = []
  for (const [pid, names] of NORM_PLACES) {
    if (names.some((n) => norm.includes(n))) {
      places.push(pid)
    }
  }
  places.sort()

  // --- token loop ---
  const rawTokens = norm.split(/\s+/).filter(Boolean)
  const tokens = mergeNumberWords(rawTokens)
  const numbers: { value: number; unit: string }[] = []
  const times: { hour: number; period: string }[] = []

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i]
    if (!/^\d+$/.test(tok)) continue

    const nxt = tokens.slice(i + 1, i + 3)

    // --- time? ---
    if (nxt.length > 0 && NORM_CLOCKS.some((cw) => starts(nxt[0], [cw]))) {
      const near = [...tokens.slice(Math.max(0, i - 2), i), ...tokens.slice(i + 1, i + 4)]
      let period: string | null = null
      for (const [p, pStems] of NORM_PERIODS) {
        if (near.some((t) => starts(t, pStems))) {
          period = p
          break
        }
      }
      const h = parseInt(tok, 10)
      if (period !== null && h >= 1 && h <= 12) {
        times.push({ hour: h, period })
      }
      continue
    }

    // --- number + unit? ---
    let matched = false
    for (const t of nxt) {
      for (const [uid, stems] of NORM_UNITS) {
        if (starts(t, stems)) {
          numbers.push({ value: parseInt(tok, 10), unit: uid })
          matched = true
          break
        }
      }
      if (matched) break
    }
    if (!matched && nxt.length > 0) {
      // A digit followed by an unknown word — collect it for the unrecognised list
      // but only if the word looks like it could be a unit (not a stop word / connector)
      const candidate = nxt[0]
      if (candidate.length >= 2 && !/^\d+$/.test(candidate)) {
        unrecognised.push(candidate)
      }
    }
  }

  // Sort for deterministic output (matches Python tuple(sorted(...)))
  numbers.sort((a, b) => a.value - b.value || a.unit.localeCompare(b.unit))
  times.sort((a, b) => a.hour - b.hour || a.period.localeCompare(b.period))

  return { places, numbers, times, unrecognised }
}

/** Canonical Facts shape (without unrecognised) for comparison with golden data. */
export interface Facts {
  places: string[]
  numbers: { value: number; unit: string }[]
  times: { hour: number; period: string }[]
}

/** Compare two Facts objects; returns a list of human-readable diff strings (empty = match). */
export function compareFacts(a: Facts, b: Facts): string[] {
  const diffs: string[] = []
  const sortedPlaces = (f: Facts) => [...f.places].sort()
  const sortedNums = (f: Facts) =>
    [...f.numbers].sort((x, y) => x.value - y.value || x.unit.localeCompare(y.unit))
  const sortedTimes = (f: Facts) =>
    [...f.times].sort((x, y) => x.hour - y.hour || x.period.localeCompare(y.period))

  const ap = sortedPlaces(a).join(',')
  const bp = sortedPlaces(b).join(',')
  if (ap !== bp) diffs.push(`places: ${ap} ≠ ${bp}`)

  const an = JSON.stringify(sortedNums(a))
  const bn = JSON.stringify(sortedNums(b))
  if (an !== bn) diffs.push(`numbers: ${an} ≠ ${bn}`)

  const at = JSON.stringify(sortedTimes(a))
  const bt = JSON.stringify(sortedTimes(b))
  if (at !== bt) diffs.push(`times: ${at} ≠ ${bt}`)

  return diffs
}

