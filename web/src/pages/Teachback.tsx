import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RateBars } from '@/components/Charts'
import { FactChips } from '@/components/FactChips'
import { PageHead } from '@/components/Shell'
import { Await, Failure } from '@/components/States'
import { source } from '@/data/source'
import type { Lang } from '@/data/types'
import { diffLabel } from '@/labels'
import { useTeachbackDemo, useTeachbackRates } from '@/lib/useData'
import { cn } from '@/lib/utils'

const LANGS: Lang[] = ['ml', 'hi', 'en']
const NAMES: Record<Lang, string> = { ml: 'മലയാളം', hi: 'हिन्दी', en: 'English' }

export default function Teachback({ lang }: { lang: Lang }) {
  const { t } = useTranslation()
  const demo = useTeachbackDemo()
  const rates = useTeachbackRates()
  const [pick, setPick] = useState<string | null>(null)
  const [readback, setReadback] = useState<string | null>(null)
  const check = useMutation({ mutationFn: (v: { sent: string; readback: string }) => source.teachback(v.sent, v.readback) })

  return (
    <div className="space-y-14">
      <PageHead no="4" title={t('teach.title')} lede={t('teach.lede')} />
      <Await q={demo}>
        {(d) => {
          const ids = Object.keys(d).filter((k) => k.endsWith(`-${lang}`))
          const id = ids.includes(pick ?? '') ? pick! : ids[0]
          const item = d[id]
          if (!item) return null
          const rb = readback ?? item.heard ?? item.sent
          const res = check.data
          const set = (v: string) => {
            setReadback(v)
            check.reset()
          }
          return (
            <section className="grid gap-8 lg:grid-cols-2">
              <div className="space-y-4">
                <label className="block text-sm font-semibold">
                  {t('studio.pick')}
                  <select
                    className="field mt-1"
                    value={id}
                    lang={lang}
                    onChange={(e) => {
                      setPick(e.target.value)
                      setReadback(null)
                      check.reset()
                    }}
                  >
                    {ids.map((k) => (
                      <option key={k} value={k}>
                        {d[k].sent}
                      </option>
                    ))}
                  </select>
                </label>
                <div>
                  <p className="text-sm font-semibold">{t('teach.sent')}</p>
                  <p lang={lang} className="mt-1 text-lg">
                    {item.sent}
                  </p>
                  <div className="mt-2">
                    <FactChips truth={item.heard_check.sent} lang={lang} />
                  </div>
                </div>
              </div>
              <div className="kasavu space-y-4 p-5">
                <label className="block text-sm font-semibold">
                  {t('teach.readback')}
                  <textarea
                    className="field mt-1"
                    rows={3}
                    lang={lang}
                    value={rb}
                    readOnly={source.kind !== 'api'}
                    onChange={(e) => set(e.target.value)}
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn btn-ghost" onClick={() => set(item.heard ?? item.sent)}>
                    {t('teach.asHeard')}
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => set(item.altered)}>
                    {t('teach.alter')}
                  </button>
                  <button type="button" className="btn" onClick={() => check.mutate({ sent: item.sent, readback: rb })}>
                    {t('teach.check')}
                  </button>
                </div>
                <div aria-live="polite">
                  {check.error && <Failure error={check.error} />}
                  {res && (
                    <div data-testid="teachback-result" className={cn('border-l-4 px-4 py-3', res.match ? 'border-teal' : 'border-vermilion')}>
                      <p className={cn('display text-2xl', res.match ? 'text-teal' : 'text-vermilion')}>
                        {res.match ? t('teach.match') : t('teach.caught')}
                      </p>
                      {!res.match && (
                        <p className="mt-1">
                          {res.missing.length > 0 && (
                            <>
                              {t('teach.missing')}: {res.missing.map(([k, v]) => diffLabel(k, v, lang)).join(', ')}.{' '}
                            </>
                          )}
                          {res.wrong.length > 0 && (
                            <>
                              {t('teach.wrong')}: {res.wrong.map(([k, v]) => diffLabel(k, v, lang)).join(', ')}.
                            </>
                          )}
                        </p>
                      )}
                      <div className="mt-2">
                        <FactChips truth={res.sent} received={res.readback} lang={lang} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )
        }}
      </Await>

      <section aria-labelledby="rates">
        <h2 id="rates" className="display text-3xl">
          {t('teach.ratesTitle')}
        </h2>
        <p className="mt-2 max-w-3xl text-muted">{t('teach.ratesNote')}</p>
        <Await q={rates}>
          {(r) => (
            <div className="mt-6 grid gap-8 md:grid-cols-2">
              {(['catch', 'falseAlarm'] as const).map((kind) => (
                <div key={kind}>
                  <h3 className="text-lg font-semibold">{t(`teach.${kind}`)}</h3>
                  <RateBars
                    rows={LANGS.flatMap((l) =>
                      (['off', 'both'] as const).map((c) => {
                        const v = r[`${l}|${c}`]
                        return {
                          label: `${NAMES[l]} · ${t(c === 'off' ? 'teach.condOff' : 'teach.condBoth')}`,
                          value: kind === 'catch' ? v.catch_rate : v.false_alarm_rate,
                          ci: kind === 'catch' ? v.catch_ci : v.false_alarm_ci,
                          tone: kind === 'catch' ? ('ok' as const) : ('bad' as const),
                        }
                      }),
                    )}
                  />
                </div>
              ))}
            </div>
          )}
        </Await>
        <p className="mt-3 text-sm">
          <a href={`${import.meta.env.BASE_URL}data/teachback.json`}>{t('common.source')}: results/teachback.json</a>
        </p>
      </section>
    </div>
  )
}
