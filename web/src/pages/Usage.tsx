import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DayBars } from '@/components/Charts'
import { AccessCode } from '@/components/LiveCall'
import { PageHead } from '@/components/Shell'
import { Await, Failure } from '@/components/States'
import { source } from '@/data/source'
import { leftBeforeCap, tone, toCsv } from '@/lib/credits'
import { useUsage } from '@/lib/useData'
import { cn } from '@/lib/utils'

const PAGE = 50

export default function Usage() {
  const { t } = useTranslation()
  const q = useUsage()
  const qc = useQueryClient()
  const [shown, setShown] = useState(PAGE)
  const [balance, setBalance] = useState('')
  const [calError, setCalError] = useState<unknown>(null)

  const calibrate = async () => {
    setCalError(null)
    try {
      await source.calibrate(Number(balance))
      void qc.invalidateQueries({ queryKey: ['usage'] })
    } catch (e) {
      setCalError(e)
    }
  }

  return (
    <div className="space-y-12">
      <PageHead no="7" title={t('usage.title')} lede={t('usage.lede')} />
      <Await q={q} isEmpty={(u) => u.ledger.length === 0}>
        {(u) => {
          const rows = [...u.ledger].reverse()
          const days = Object.entries(u.by_day).map(([day, v]) => ({ day, stt: v.stt, tts: v.tts }))
          return (
            <>
              <section className="kasavu grid gap-6 p-6 md:grid-cols-3" aria-label={t('meter.title')}>
                <div>
                  <p className="text-sm text-muted">{t('meter.title')}</p>
                  <p className="num mt-1 text-3xl">
                    {Math.round(u.used ?? 0).toLocaleString()} <span className="text-base text-muted">/ {u.cap.toLocaleString()} {t(`common.${u.unit}`)}</span>
                  </p>
                  <div className="mt-2 h-2 bg-rule">
                    <div
                      className={cn('h-full', tone(u.level) === 'ok' ? 'bg-teal' : tone(u.level) === 'warn' ? 'bg-turmeric' : 'bg-vermilion')}
                      style={{ width: `${Math.min(100, u.share * 100)}%` }}
                    />
                  </div>
                  <p className="num mt-1 text-sm">{leftBeforeCap(u).toLocaleString()} {t(`common.${u.unit}`)} → cap</p>
                  {u.level !== 'ok' && <p className={cn('mt-1 text-sm', u.level === 'stop' ? 'text-vermilion' : 'text-turmeric-ink')}>{t(`meter.${u.level}`)}</p>}
                </div>
                <div>
                  <p className="text-sm text-muted">{t('usage.remaining')}</p>
                  <p className="num mt-1 text-3xl">{u.remaining_credits !== null ? Math.round(u.remaining_credits).toLocaleString() : '—'}</p>
                  <p className="text-sm text-muted">{u.rate_configured ? '' : t('meter.noRate')}</p>
                  <dl className="num mt-2 text-sm">
                    <div>
                      <dt className="inline text-muted">STT: </dt>
                      <dd className="inline">
                        {u.by_kind.stt} {t('common.calls')} · {u.audio_seconds.toLocaleString()} s
                      </dd>
                    </div>
                    <div>
                      <dt className="inline text-muted">TTS: </dt>
                      <dd className="inline">
                        {u.by_kind.tts} {t('common.calls')} · {u.characters.toLocaleString()} {t('common.characters')}
                      </dd>
                    </div>
                  </dl>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold">
                    {t('usage.calibrate')}
                    <input type="number" min={0} className="field num mt-1" value={balance} onChange={(e) => setBalance(e.target.value)} disabled={source.kind !== 'api'} />
                  </label>
                  <AccessCode />
                  <button type="button" className="btn" disabled={source.kind !== 'api' || balance === ''} onClick={() => void calibrate()}>
                    {t('usage.calibrateBtn')}
                  </button>
                  {source.kind !== 'api' && <p className="text-sm text-muted">{t('common.replayOnly')}</p>}
                  {calError !== null && <Failure error={calError} />}
                </div>
              </section>
              <p className="max-w-3xl text-sm text-muted">{t('usage.rateNote')}</p>

              <section aria-labelledby="days">
                <h2 id="days" className="display text-2xl">
                  {t('usage.byDay')}
                </h2>
                <DayBars days={days} />
                <p className="text-sm">
                  <span className="mr-1 inline-block size-3 bg-teal align-middle" aria-hidden /> STT
                  <span className="ml-4 mr-1 inline-block size-3 bg-turmeric align-middle" aria-hidden /> TTS
                </p>
              </section>

              <section aria-labelledby="ledger">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <h2 id="ledger" className="display text-2xl">
                    {t('usage.ledger')}
                  </h2>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => {
                      const a = document.createElement('a')
                      a.href = URL.createObjectURL(new Blob([toCsv(u.ledger as unknown as Record<string, unknown>[])], { type: 'text/csv' }))
                      a.download = 'tinytalk-ledger.csv'
                      a.click()
                    }}
                  >
                    {t('usage.export')}
                  </button>
                </div>
                <div className="mt-3 overflow-x-auto">
                  <table className="table-ruled num min-w-[44rem] text-sm">
                    <thead className="font-sans">
                      <tr>
                        {(['time', 'kind', 'language', 'size', 'creditsCol', 'cache'] as const).map((c) => (
                          <th key={c} scope="col">
                            {t(`usage.${c}`)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, shown).map((r, i) => (
                        <tr key={i}>
                          <td>{r.time?.replace('T', ' ').slice(0, 19)}</td>
                          <td>{r.kind}</td>
                          <td>{r.language}</td>
                          <td>
                            {r.size ?? '—'} {r.size_unit}
                          </td>
                          <td>{r.credits ?? (r.cache_hit ? 0 : `${r.attempts} ${t('common.calls')}`)}</td>
                          <td className={r.cache_hit ? 'text-muted' : 'text-vermilion'}>{r.cache_hit ? t('usage.hit') : t('usage.miss')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-sm text-muted">{t('usage.showing', { n: Math.min(shown, rows.length), total: rows.length })}</p>
                {shown < rows.length && (
                  <button type="button" className="btn btn-ghost mt-2" onClick={() => setShown((s) => s + PAGE * 4)}>
                    {t('usage.more')}
                  </button>
                )}
              </section>
            </>
          )
        }}
      </Await>
    </div>
  )
}
