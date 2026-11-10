/**
 * code.test.ts — Stage E1 share code tests
 *
 * Tests:
 *  1. Version 1 round-trip on all golden rows
 *  2. Version 2 round-trip with needs bitmask
 *  3. One wrong character → bad_crc detected
 *  4. Version detection
 */

import { describe, expect, test } from 'vitest'
import {
  encodeShareCode,
  decodeShareCode,
  NEED_FLAGS,
  needsToMask,
  maskToNeeds,
} from './code'
import { GOLDEN } from './golden.gen'
import { LANG_CODES } from './languages'
import type { Facts } from './facts'

// ---------------------------------------------------------------------------
// Version 1 round-trip on golden rows
// ---------------------------------------------------------------------------
describe('share code v1 round-trip', () => {
  for (const row of GOLDEN) {
    test(`${row.id}: encode → decode`, () => {
      const facts: Facts = {
        places: row.facts.places,
        numbers: row.facts.numbers,
        times: row.facts.times,
      }
      const langCode = `${row.lang}-IN`
      const encoded = encodeShareCode({ version: 1, langCode, facts })

      // Must be groups of 4 with dashes (or last group shorter)
      const groups = encoded.split('-')
      expect(groups.every((g) => g.length <= 4)).toBe(true)

      const result = decodeShareCode(encoded)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      expect(result.code.version).toBe(1)
      expect(result.code.langCode).toBe(langCode)

      const got = result.code.facts
      expect([...got.places].sort()).toEqual([...facts.places].sort())
      expect(
        [...got.numbers].sort((a, b) => a.value - b.value || a.unit.localeCompare(b.unit)),
      ).toEqual(
        [...facts.numbers].sort((a, b) => a.value - b.value || a.unit.localeCompare(b.unit)),
      )
      expect(
        [...got.times].sort((a, b) => a.hour - b.hour || a.period.localeCompare(b.period)),
      ).toEqual(
        [...facts.times].sort((a, b) => a.hour - b.hour || a.period.localeCompare(b.period)),
      )
    })
  }
})

// ---------------------------------------------------------------------------
// Version 2 round-trip with needs
// ---------------------------------------------------------------------------
describe('share code v2 round-trip', () => {
  test('needs mask survives encode→decode', () => {
    const facts: Facts = {
      places: ['aluva'],
      numbers: [{ value: 50, unit: 'people' }],
      times: [{ hour: 7, period: 'pm' }],
    }
    const needs = ['ambulance', 'water', 'food'] as const
    const encoded = encodeShareCode({ version: 2, langCode: 'ml-IN', facts, needs: [...needs] })
    const result = decodeShareCode(encoded)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.code.version).toBe(2)
    const decoded = result.code as { needs: string[] }
    expect(decoded.needs.sort()).toEqual([...needs].sort())
  })

  test('needs mask: all 15 flags round-trip', () => {
    const allNeeds = [...NEED_FLAGS]
    const mask = needsToMask(allNeeds)
    const recovered = maskToNeeds(mask)
    expect(recovered.sort()).toEqual(allNeeds.sort())
  })

  test('empty needs → mask 0', () => {
    expect(needsToMask([])).toBe(0)
    expect(maskToNeeds(0)).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Typo detection: one wrong character → bad_crc
// ---------------------------------------------------------------------------
describe('typo detection', () => {
  test('one character changed → bad_crc', () => {
    const facts: Facts = {
      places: ['kochi'],
      numbers: [{ value: 100, unit: 'food_packets' }],
      times: [],
    }
    const encoded = encodeShareCode({ version: 1, langCode: 'en-IN', facts })
    const raw = encoded.replace(/-/g, '')

    // Flip one character (try each position until one is detected)
    let detections = 0
    for (let i = 0; i < raw.length; i++) {
      const altered =
        raw.slice(0, i) +
        (raw[i] === '0' ? '1' : '0') +
        raw.slice(i + 1)
      // Re-add dashes
      const withDashes = altered.match(/.{1,4}/g)?.join('-') ?? altered
      const result = decodeShareCode(withDashes)
      if (!result.ok && result.error === 'bad_crc') detections++
    }
    // Every single-character flip must be caught
    expect(detections).toBe(raw.length)
  })

  test('invalid character → invalid_chars', () => {
    const result = decodeShareCode('ABCD-EFG!-HI')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('invalid_chars')
  })

  test('short input → bad_length', () => {
    const result = decodeShareCode('AB')
    expect(result.ok).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Language index stability — all ten codes are covered
// ---------------------------------------------------------------------------
describe('language registry covers all ten Gnani codes', () => {
  const expected = ['bn-IN', 'en-IN', 'gu-IN', 'hi-IN', 'kn-IN', 'ml-IN', 'mr-IN', 'pa-IN', 'ta-IN', 'te-IN']
  test('LANG_CODES has all ten in stable order', () => {
    expect([...LANG_CODES]).toEqual(expected)
  })

  test('every lang code round-trips in a share code', () => {
    const facts: Facts = { places: ['aluva'], numbers: [], times: [] }
    for (const langCode of LANG_CODES) {
      const encoded = encodeShareCode({ version: 1, langCode, facts })
      const result = decodeShareCode(encoded)
      expect(result.ok).toBe(true)
      if (result.ok) expect(result.code.langCode).toBe(langCode)
    }
  })
})

