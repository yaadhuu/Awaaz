/**
 * pack.ts — TypeScript port of the fact-packing in tinytalk/textpack.py
 *
 * Bit layout (identical to Python pack_facts / unpack_facts):
 *   Byte 0:  header = (nPlaces << 5) | (nNumbers << 2) | nTimes
 *   Then nPlaces × 1 byte  (index into sorted PLACE_IDS)
 *   Then nNumbers × (varint(value) + 1 byte unit index into sorted UNIT_IDS)
 *   Then nTimes × 1 byte   (hour << 1 | (period === 'pm' ? 1 : 0))
 *
 * Limits: 7 places, 7 numbers, 3 times  (same as Python; enforced at encode time).
 */

import { PLACE_IDS, UNIT_IDS } from './lexicon.gen'
import type { Facts } from './facts'

// ---------------------------------------------------------------------------
// Varint (little-endian 7-bit groups, continuation bit = 0x80)
// Same encoding as Python _varint / _read_varint in textpack.py
// ---------------------------------------------------------------------------

function varint(n: number): number[] {
  if (n < 0 || !Number.isInteger(n)) throw new RangeError(`varint: bad value ${n}`)
  const out: number[] = []
  do {
    out.push((n & 0x7f) | (n > 0x7f ? 0x80 : 0))
    n >>>= 7
  } while (n > 0)
  return out
}

function readVarint(data: Uint8Array, i: number): [number, number] {
  let n = 0
  let shift = 0
  for (;;) {
    const b = data[i]
    n |= (b & 0x7f) << shift
    i++
    shift += 7
    if (!(b & 0x80)) return [n, i]
  }
}

// ---------------------------------------------------------------------------
// Pack / unpack facts
// ---------------------------------------------------------------------------

export function packFacts(f: Facts): Uint8Array {
  const np = f.places.length
  const nn = f.numbers.length
  const nt = f.times.length
  if (np > 7 || nn > 7 || nt > 3) throw new RangeError('too many facts for one packet')

  const bytes: number[] = [(np << 5) | (nn << 2) | nt]

  for (const pid of f.places) {
    const idx = (PLACE_IDS as readonly string[]).indexOf(pid)
    if (idx < 0) throw new RangeError(`unknown place id: ${pid}`)
    bytes.push(idx)
  }

  for (const { value, unit } of f.numbers) {
    bytes.push(...varint(value))
    const idx = (UNIT_IDS as readonly string[]).indexOf(unit)
    if (idx < 0) throw new RangeError(`unknown unit id: ${unit}`)
    bytes.push(idx)
  }

  for (const { hour, period } of f.times) {
    bytes.push((hour << 1) | (period === 'pm' ? 1 : 0))
  }

  return new Uint8Array(bytes)
}

export function unpackFacts(data: Uint8Array): Facts {
  const header = data[0]
  const np = header >> 5
  const nn = (header >> 2) & 7
  const nt = header & 3

  let i = 1

  const places: string[] = []
  for (let j = 0; j < np; j++) {
    places.push((PLACE_IDS as readonly string[])[data[i]])
    i++
  }
  places.sort()

  const numbers: { value: number; unit: string }[] = []
  for (let j = 0; j < nn; j++) {
    const [val, next] = readVarint(data, i)
    i = next
    numbers.push({ value: val, unit: (UNIT_IDS as readonly string[])[data[i]] })
    i++
  }
  numbers.sort((a, b) => a.value - b.value || a.unit.localeCompare(b.unit))

  const times: { hour: number; period: string }[] = []
  for (let j = 0; j < nt; j++) {
    const b = data[i]
    times.push({ hour: b >> 1, period: b & 1 ? 'pm' : 'am' })
    i++
  }
  times.sort((a, b) => a.hour - b.hour || a.period.localeCompare(b.period))

  return { places, numbers, times }
}

/** Hex string → Uint8Array (for golden tests) */
export function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) out[i / 2] = parseInt(hex.slice(i, i + 2), 16)
  return out
}

/** Uint8Array → hex string */
export function toHex(data: Uint8Array): string {
  return Array.from(data)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

