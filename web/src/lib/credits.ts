import type { MeterLevel, Usage } from '@/data/types'

export const WARN_AT = [0.5, 0.8, 0.95]

/** Same rule as tinytalk/credits.py: ok, warn50, warn80, warn95, or stop at the cap. */
export function levelFor(share: number, warnAt: number[] = WARN_AT): MeterLevel {
  if (share >= 1) return 'stop'
  const passed = [...warnAt].sort((a, b) => a - b).filter((w) => share >= w)
  if (!passed.length) return 'ok'
  return `warn${Math.round(passed[passed.length - 1] * 100)}` as MeterLevel
}

export function tone(level: MeterLevel): 'ok' | 'warn' | 'stop' {
  return level === 'ok' ? 'ok' : level === 'stop' ? 'stop' : 'warn'
}

/** Calls or credits left before the hard stop. */
export function leftBeforeCap(u: Pick<Usage, 'cap' | 'used'>): number {
  return Math.max(0, u.cap - (u.used ?? 0))
}

/** Whether a live call should ask for a confirm click. Without rates, one call counts as one unit. */
export function needsConfirm(estimate: number | null, threshold: number): boolean {
  return (estimate ?? 1) > threshold
}

/** "about 12.5 credits", or the raw units when no rate is configured. */
export function describeEstimate(
  estimate: number | null,
  units: { audio_seconds?: number; characters?: number },
): { value: string; unit: 'credits' | 'seconds' | 'characters' } {
  if (estimate !== null) return { value: estimate.toFixed(1), unit: 'credits' }
  if (units.audio_seconds !== undefined) return { value: units.audio_seconds.toFixed(1), unit: 'seconds' }
  return { value: String(units.characters ?? 0), unit: 'characters' }
}

/** Ledger rows to CSV (RFC 4180 quoting). */
export function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return ''
  const cols = Object.keys(rows[0])
  const cell = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [cols.join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\n')
}
