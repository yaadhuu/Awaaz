import { describe, expect, test } from 'vitest'
import { describeEstimate, leftBeforeCap, levelFor, needsConfirm, toCsv, tone } from './credits'

describe('credit meter', () => {
  test('warning levels match the server rule', () => {
    expect([0.1, 0.5, 0.79, 0.8, 0.96, 1, 1.4].map((s) => levelFor(s))).toEqual([
      'ok', 'warn50', 'warn50', 'warn80', 'warn95', 'stop', 'stop',
    ])
    expect(tone('warn80')).toBe('warn')
    expect(tone('stop')).toBe('stop')
  })

  test('the cap leaves nothing below zero', () => {
    expect(leftBeforeCap({ cap: 1200, used: 987 })).toBe(213)
    expect(leftBeforeCap({ cap: 10, used: 12 })).toBe(0)
    expect(leftBeforeCap({ cap: 10, used: null })).toBe(10)
  })

  test('confirm above the threshold; without a rate one call counts as one', () => {
    expect(needsConfirm(30, 25)).toBe(true)
    expect(needsConfirm(5, 25)).toBe(false)
    expect(needsConfirm(null, 25)).toBe(false)
    expect(needsConfirm(null, 0.5)).toBe(true)
  })

  test('estimates fall back to seconds or characters', () => {
    expect(describeEstimate(12.345, {})).toEqual({ value: '12.3', unit: 'credits' })
    expect(describeEstimate(null, { audio_seconds: 9.04 })).toEqual({ value: '9.0', unit: 'seconds' })
    expect(describeEstimate(null, { characters: 110 })).toEqual({ value: '110', unit: 'characters' })
  })

  test('csv quoting', () => {
    expect(toCsv([{ a: 'x,y', b: 'say "hi"', c: null }])).toBe('a,b,c\n"x,y","say ""hi""",')
  })
})
