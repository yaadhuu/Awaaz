/**
 * code.ts — Awaaz share codes (Stage E1, brief section 3)
 *
 * Wire layout:
 *   Version 1:  [version=1 (1B)] [langIndex (1B)] [packedFacts (N B)] [CRC-8 (1B)]
 *   Version 2:  [version=2 (1B)] [langIndex (1B)] [packedFacts (N B)] [needsMask (2B, LE)] [CRC-8 (1B)]
 *
 * Encoded as Crockford base32, groups of 4 characters separated by dashes.
 * One wrong character → CRC mismatch → detected.
 *
 * CRC-8/SMBUS: polynomial 0x07, init 0x00, no reflection.
 */

import type { Facts } from './facts'
import { packFacts, unpackFacts, fromHex, toHex } from './pack'
import { LANG_CODES } from './languages'

// ---------------------------------------------------------------------------
// Crockford base32
// Alphabet: 0123456789ABCDEFGHJKMNPQRSTVWXYZ  (no I L O U)
// ---------------------------------------------------------------------------
const B32_ALPHA = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
const B32_DECODE: Map<string, number> = new Map()

for (let i = 0; i < B32_ALPHA.length; i++) B32_DECODE.set(B32_ALPHA[i], i)
// Normalisation: I→1, L→1, O→0, U→V
B32_DECODE.set('I', 1)
B32_DECODE.set('L', 1)
B32_DECODE.set('O', 0)
B32_DECODE.set('U', B32_DECODE.get('V')!)

function b32Encode(bytes: Uint8Array): string {
  // Convert to a big integer-like bit stream, 5 bits per output character
  let bits = 0
  let bitLen = 0
  const out: string[] = []
  for (const b of bytes) {
    bits = (bits << 8) | b
    bitLen += 8
    while (bitLen >= 5) {
      bitLen -= 5
      out.push(B32_ALPHA[(bits >> bitLen) & 0x1f])
    }
  }
  if (bitLen > 0) out.push(B32_ALPHA[(bits << (5 - bitLen)) & 0x1f])
  return out.join('')
}

function b32Decode(s: string): Uint8Array | null {
  // Normalise and validate
  const norm = s
    .toUpperCase()
    .replace(/-/g, '')
    .replace(/\s/g, '')
  let bits = 0
  let bitLen = 0
  const out: number[] = []
  for (const ch of norm) {
    const val = B32_DECODE.get(ch)
    if (val === undefined) return null // invalid character
    bits = (bits << 5) | val
    bitLen += 5
    if (bitLen >= 8) {
      bitLen -= 8
      out.push((bits >> bitLen) & 0xff)
    }
  }
  return new Uint8Array(out)
}

/** Format as groups of 4 with dashes (e.g. "ABCD-EFGH-IJ"). */
function groupFour(s: string): string {
  return s.match(/.{1,4}/g)?.join('-') ?? s
}

// ---------------------------------------------------------------------------
// CRC-8/SMBUS
// ---------------------------------------------------------------------------
function crc8(data: Uint8Array): number {
  let crc = 0
  for (const b of data) {
    crc ^= b
    for (let i = 0; i < 8; i++) crc = crc & 0x80 ? ((crc << 1) ^ 0x07) & 0xff : (crc << 1) & 0xff
  }
  return crc
}

// ---------------------------------------------------------------------------
// Need flags (version 2 only) — 15 flags in a 2-byte (16-bit) bitmask
// ---------------------------------------------------------------------------
export const NEED_FLAGS = [
  'ambulance',
  'doctor',
  'boat',
  'rescue',
  'fire',
  'police',
  'water',
  'food',
  'medicine',
  'shelter',
  'electricity',
  'blanket',
  'transport',
  'missing_person',
  'other',
] as const
export type NeedFlag = (typeof NEED_FLAGS)[number]

export function needsToMask(needs: NeedFlag[]): number {
  return needs.reduce((m, n) => m | (1 << NEED_FLAGS.indexOf(n)), 0)
}

export function maskToNeeds(mask: number): NeedFlag[] {
  return NEED_FLAGS.filter((_, i) => mask & (1 << i))
}

// ---------------------------------------------------------------------------
// Encode / decode
// ---------------------------------------------------------------------------

export interface ShareCodeV1 {
  version: 1
  langCode: string
  facts: Facts
}

export interface ShareCodeV2 {
  version: 2
  langCode: string
  facts: Facts
  needs: NeedFlag[]
}

export type ShareCode = ShareCodeV1 | ShareCodeV2

export type DecodeResult =
  | { ok: true; code: ShareCode }
  | { ok: false; error: 'invalid_chars' | 'bad_crc' | 'unknown_version' | 'unknown_lang' | 'bad_length' }

export function encodeShareCode(sc: ShareCode): string {
  const langIdx = LANG_CODES.indexOf(sc.langCode as (typeof LANG_CODES)[number])
  if (langIdx < 0) throw new RangeError(`unknown lang code: ${sc.langCode}`)

  const packed = packFacts(sc.facts)
  const body: number[] = [sc.version, langIdx, ...packed]

  if (sc.version === 2) {
    const mask = needsToMask(sc.needs)
    body.push(mask & 0xff, (mask >> 8) & 0xff) // little-endian 2 bytes
  }

  const withoutCrc = new Uint8Array(body)
  body.push(crc8(withoutCrc))

  const raw = b32Encode(new Uint8Array(body))
  return groupFour(raw)
}

export function decodeShareCode(input: string): DecodeResult {
  const bytes = b32Decode(input)
  if (!bytes) return { ok: false, error: 'invalid_chars' }

  // Min length: version(1) + lang(1) + header(1) + crc(1) = 4
  if (bytes.length < 4) return { ok: false, error: 'bad_length' }

  const payload = bytes.slice(0, -1)
  const checksum = bytes[bytes.length - 1]
  if (crc8(payload) !== checksum) return { ok: false, error: 'bad_crc' }

  const version = payload[0]
  const langIdx = payload[1]

  const langCode = LANG_CODES[langIdx]
  if (!langCode) return { ok: false, error: 'unknown_lang' }

  if (version === 1) {
    const factsBytes = payload.slice(2)
    const facts = unpackFacts(factsBytes)
    return { ok: true, code: { version: 1, langCode, facts } }
  }

  if (version === 2) {
    // Last 2 bytes of payload (before crc) are the needs mask
    const factsBytes = payload.slice(2, -2)
    const needsBytes = payload.slice(-2)
    const mask = needsBytes[0] | (needsBytes[1] << 8)
    const facts = unpackFacts(factsBytes)
    const needs = maskToNeeds(mask)
    return { ok: true, code: { version: 2, langCode, facts, needs } }
  }

  return { ok: false, error: 'unknown_version' }
}

// Re-export helpers for tests
export { toHex, fromHex }

