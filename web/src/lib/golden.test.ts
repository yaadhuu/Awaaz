/**
 * golden.test.ts — Stage E1 golden tests
 *
 * Every en/hi/ml corpus message must yield identical facts and pack bytes
 * when processed by the TypeScript engine versus the Python ground truth.
 * Any mismatch is reported explicitly (never silently skipped).
 */

import { describe, expect, test } from 'vitest'
import { GOLDEN, GOLDEN_MISMATCHES } from './golden.gen'
import { extract, compareFacts, type Facts } from './facts'
import { packFacts, unpackFacts, fromHex, toHex } from './pack'
import { PLACE_IDS, UNIT_IDS } from './lexicon.gen'

// ---------------------------------------------------------------------------
// Golden corpus: facts
// ---------------------------------------------------------------------------
describe('golden facts — TypeScript matches Python for every corpus message', () => {
  // Report any Python-side mismatches (Python extractor vs stored corpus)
  test('no Python-side mismatches in golden data', () => {
    if (GOLDEN_MISMATCHES > 0) {
      console.warn(
        `${GOLDEN_MISMATCHES} Python-side mismatch(es) detected in golden.gen.ts. ` +
          'Run scripts/export_golden.py for details.',
      )
    }
    // We only fail if mismatches are > 0 — they are reported not hidden
    expect(GOLDEN_MISMATCHES).toBe(0)
  })

  for (const row of GOLDEN) {
    test(`${row.id}: extract()`, () => {
      const got = extract(row.text)
      const expected: Facts = {
        places: row.facts.places,
        numbers: row.facts.numbers,
        times: row.facts.times,
      }
      const diffs = compareFacts(got, expected)
      if (diffs.length > 0) {
        console.error(`MISMATCH ${row.id}: ${diffs.join('; ')}`)
        console.error(`  text: ${row.text}`)
        console.error(`  ts  : places=${JSON.stringify(got.places)} numbers=${JSON.stringify(got.numbers)} times=${JSON.stringify(got.times)}`)
        console.error(`  py  : places=${JSON.stringify(expected.places)} numbers=${JSON.stringify(expected.numbers)} times=${JSON.stringify(expected.times)}`)
      }
      expect(diffs).toEqual([])
    })
  }
})

// ---------------------------------------------------------------------------
// Golden corpus: pack bytes
// ---------------------------------------------------------------------------
describe('golden pack — TypeScript bytes match Python for every corpus message', () => {
  for (const row of GOLDEN) {
    test(`${row.id}: packFacts() hex`, () => {
      const facts: Facts = {
        places: row.facts.places,
        numbers: row.facts.numbers,
        times: row.facts.times,
      }
      const packed = packFacts(facts)
      const hex = toHex(packed)
      if (hex !== row.packedHex) {
        console.error(
          `PACK MISMATCH ${row.id}: ts=${hex} py=${row.packedHex}`,
        )
      }
      expect(hex).toBe(row.packedHex)
    })
  }
})

// ---------------------------------------------------------------------------
// Round-trip: pack → unpack is identity for all golden rows
// ---------------------------------------------------------------------------
describe('golden round-trip: unpackFacts(packFacts(f)) === f', () => {
  for (const row of GOLDEN) {
    test(`${row.id}: round-trip`, () => {
      const original: Facts = {
        places: [...row.facts.places].sort(),
        numbers: [...row.facts.numbers].sort((a, b) => a.value - b.value || a.unit.localeCompare(b.unit)),
        times: [...row.facts.times].sort((a, b) => a.hour - b.hour || a.period.localeCompare(b.period)),
      }
      const packed = packFacts(original)
      const unpacked = unpackFacts(packed)
      expect(unpacked.places).toEqual(original.places)
      expect(unpacked.numbers).toEqual(original.numbers)
      expect(unpacked.times).toEqual(original.times)
    })
  }
})

// ---------------------------------------------------------------------------
// Round-trip via Python hex: fromHex(packedHex) → unpackFacts → same facts
// ---------------------------------------------------------------------------
describe('golden hex decode: Python bytes decode to same facts in TS', () => {
  for (const row of GOLDEN) {
    test(`${row.id}: decode Python hex`, () => {
      const bytes = fromHex(row.packedHex)
      const unpacked = unpackFacts(bytes)
      const expected: Facts = {
        places: [...row.facts.places].sort(),
        numbers: [...row.facts.numbers].sort((a, b) => a.value - b.value || a.unit.localeCompare(b.unit)),
        times: [...row.facts.times].sort((a, b) => a.hour - b.hour || a.period.localeCompare(b.period)),
      }
      const diffs = compareFacts(unpacked, expected)
      expect(diffs).toEqual([])
    })
  }
})

// ---------------------------------------------------------------------------
// Seeded round-trip: 500 random valid Facts pack and unpack perfectly
// ---------------------------------------------------------------------------
describe('seeded round-trip: 500 random facts', () => {
  // Simple 32-bit xorshift PRNG — same seed on every run
  function xorshift(state: number): number {
    state ^= state << 13
    state ^= state >> 17
    state ^= state << 5
    return state >>> 0
  }

  test('all 500 random Facts round-trip', () => {
    let s = 0xdeadbeef
    const rng = () => { s = xorshift(s); return s }

    const placeIds = [...PLACE_IDS] as string[]
    const unitIds = [...UNIT_IDS] as string[]
    const periods = ['am', 'pm']

    let failures = 0
    for (let i = 0; i < 500; i++) {
      const np = rng() % 8  // 0-7
      const nn = rng() % 8
      const nt = rng() % 4  // 0-3

      // Clamp to pack limits (7, 7, 3)
      const npc = Math.min(np, 7)
      const nnc = Math.min(nn, 7)
      const ntc = Math.min(nt, 3)

      // Pick random places (unique)
      const shuffledPlaces = [...placeIds].sort(() => (rng() % 2 ? 1 : -1))
      const places = shuffledPlaces.slice(0, npc).sort()

      // Pick random numbers
      const numbers = Array.from({ length: nnc }, () => ({
        value: (rng() % 1000) + 1,
        unit: unitIds[rng() % unitIds.length],
      })).sort((a, b) => a.value - b.value || a.unit.localeCompare(b.unit))

      // Pick random times (hour 1-12)
      const times = Array.from({ length: ntc }, () => ({
        hour: (rng() % 12) + 1,
        period: periods[rng() % 2],
      })).sort((a, b) => a.hour - b.hour || a.period.localeCompare(b.period))

      const original: Facts = { places, numbers, times }

      try {
        const packed = packFacts(original)
        const unpacked = unpackFacts(packed)
        const diffs = compareFacts(unpacked, original)
        if (diffs.length > 0) failures++
      } catch {
        failures++
      }
    }

    expect(failures).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Unrecognised tokens: never guessed, always listed
// ---------------------------------------------------------------------------
describe('unrecognised list', () => {
  test('corpus messages have no unrecognised tokens (all words are known)', () => {
    for (const row of GOLDEN) {
      const got = extract(row.text)
      // For corpus messages, unrecognised should be empty
      // (all numbers are followed by known unit words)
      if (got.unrecognised.length > 0) {
        console.warn(`${row.id} has unrecognised tokens: ${got.unrecognised.join(', ')}`)
      }
      // We expect 0 — if this fails, the word lists need updating
      expect(got.unrecognised).toEqual([])
    }
  })

  test('invented words DO appear in unrecognised (never guessed)', () => {
    // A message with a digit followed by an unknown unit word
    const result = extract('Send 50 zorbits to Kochi by 7 pm')
    // 'zorbits' is not a known unit — should appear in unrecognised
    expect(result.unrecognised).toContain('zorbits')
    // And it must NOT appear as a matched number
    expect(result.numbers).toEqual([])
  })
})

