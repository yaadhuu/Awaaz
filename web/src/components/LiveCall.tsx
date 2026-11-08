import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { setAccessCode, source, SourceError } from '@/data/source'
import type { Estimate, Spend } from '@/data/types'
import { describeEstimate } from '@/lib/credits'

/** Access code field, shown only in the live edition. Kept in memory, never stored. */
export function AccessCode() {
  const { t } = useTranslation()
  const [code, setCode] = useState('')
  if (source.kind !== 'api') return null
  return (
    <label className="block max-w-xs text-sm font-medium">
      {t('common.accessCode')}
      <input
        type="password"
        autoComplete="off"
        className="field mt-1"
        value={code}
        onChange={(e) => {
          setCode(e.target.value)
          setAccessCode(e.target.value)
        }}
      />
    </label>
  )
}

interface Pending {
  estimate: Estimate
  go: () => void
}

/** Estimate first, ask to confirm above the threshold, then run and report the actual cost. */
export function useLiveCall() {
  const qc = useQueryClient()
  const [pending, setPending] = useState<Pending | null>(null)
  const [last, setLast] = useState<{ estimate: Estimate; actual?: Spend } | null>(null)
  const [error, setError] = useState<SourceError | null>(null)
  const [busy, setBusy] = useState(false)

  async function run<T extends { actual: Spend }>(kind: 'stt' | 'tts', amount: number, call: (confirm: boolean) => Promise<T>) {
    setError(null)
    try {
      const estimate = await source.estimate(kind, amount)
      const exec = async () => {
        setPending(null)
        setBusy(true)
        try {
          const out = await call(estimate.confirm_needed)
          setLast({ estimate, actual: out.actual })
          void qc.invalidateQueries({ queryKey: ['usage'] })
          void qc.invalidateQueries({ queryKey: ['usage-summary'] })
          return out
        } catch (e) {
          setError(e instanceof SourceError ? e : new SourceError(500, String(e)))
          return undefined
        } finally {
          setBusy(false)
        }
      }
      setLast({ estimate })
      if (estimate.confirm_needed) {
        return await new Promise<T | undefined>((resolve) => setPending({ estimate, go: () => void exec().then(resolve) }))
      }
      return await exec()
    } catch (e) {
      setError(e instanceof SourceError ? e : new SourceError(500, String(e)))
      return undefined
    }
  }

  return { run, pending, cancel: () => setPending(null), last, error, busy }
}

export function CallReport({ call }: { call: ReturnType<typeof useLiveCall> }) {
  const { t } = useTranslation()
  const { pending, last, error } = call
  const unit = (u: string) => t(`common.${u}`)
  return (
    <div aria-live="polite" className="space-y-2">
      {pending && (
        <div role="alertdialog" aria-label={t('common.confirmBtn')} className="border-2 border-vermilion bg-card p-4">
          {(() => {
            const d = describeEstimate(pending.estimate.credits, pending.estimate.units)
            return <p>{t('common.confirm', { amount: d.value, unit: unit(d.unit) })}</p>
          })()}
          <div className="mt-3 flex gap-2">
            <button type="button" className="btn" onClick={pending.go}>
              {t('common.confirmBtn')}
            </button>
            <button type="button" className="btn btn-ghost" onClick={call.cancel}>
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}
      {last && (
        <dl className="num grid grid-cols-2 gap-x-6 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted">{t('common.estimate')}</dt>
            <dd>
              {(() => {
                const d = describeEstimate(last.estimate.credits, last.estimate.units)
                return `${d.value} ${unit(d.unit)}`
              })()}
            </dd>
          </div>
          {last.actual && (
            <div>
              <dt className="text-muted">{t('common.actual')}</dt>
              <dd>
                {last.actual.credits !== null ? `${last.actual.credits.toFixed(1)} ${unit('credits')}` : `${last.actual.calls} ${unit('calls')}`}
              </dd>
            </div>
          )}
        </dl>
      )}
      {error && (
        <p role="alert" className="border-l-4 border-vermilion bg-card px-3 py-2 text-sm">
          {error.message === 'replay' ? t('common.liveNeeded') : `${error.status} · ${error.message}`}
        </p>
      )}
    </div>
  )
}
