import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LinkPanel } from '@/components/LinkPanel'
import { PageHead } from '@/components/Shell'
import { Await } from '@/components/States'
import type { Lang, Tier } from '@/data/types'
import { playMix, stopMix } from '@/lib/mixer'
import { useBeds, useStudio } from '@/lib/useData'
import { cn } from '@/lib/utils'

const base = import.meta.env.BASE_URL
const BAR: Record<Tier, string> = { A: 'bg-tier-a', B: 'bg-tier-b', C: 'bg-tier-c' }

export default function LinkLab({ lang }: { lang: Lang }) {
  const { t } = useTranslation()
  const studio = useStudio()
  const beds = useBeds()
  const [rate, setRate] = useState(5)
  const [loss, setLoss] = useState(10)
  const [pick, setPick] = useState<string | null>(null)
  const [bed, setBed] = useState<string>('')
  const [snr, setSnr] = useState(10)
  const [playing, setPlaying] = useState<'orig' | 'after' | null>(null)
  useEffect(() => () => stopMix(), [])

  const play = (which: 'orig' | 'after', url: string) => {
    if (playing === which) {
      stopMix()
      setPlaying(null)
      return
    }
    setPlaying(which)
    void playMix(url, bed ? `${base}${bed}` : null, snr, () => setPlaying(null)).catch(() => setPlaying(null))
  }

  return (
    <div>
      <PageHead no="3" title={t('link.title')} lede={t('link.lede')} />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,28rem)_1fr]">
        <div className="space-y-4">
          <LinkPanel rate={rate} loss={loss} onRate={setRate} onLoss={setLoss} />
          <p className="text-sm text-muted">{t('link.model')}</p>
        </div>
        <Await q={studio}>
          {(s) => {
            const options = s.samples[lang].filter((x) => s.audio[x.id])
            const msg = options.find((x) => x.id === pick) ?? options[0]
            if (!msg) return null
            const run = s.runs[`${msg.id}|${rate}|${loss}`]
            const max = Math.max(...run.tiers.map((r) => r.airtime_s))
            const audio = s.audio[msg.id]
            return (
              <div className="space-y-8">
                <label className="block text-sm font-semibold">
                  {t('studio.pick')}
                  <select className="field mt-1" value={msg.id} onChange={(e) => setPick(e.target.value)} lang={lang}>
                    {options.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.text}
                      </option>
                    ))}
                  </select>
                </label>

                <section aria-labelledby="air">
                  <h2 id="air" className="display text-2xl">
                    {t('link.airtime')}
                  </h2>
                  <p className="text-sm text-muted">{t('link.perTier')}</p>
                  <ul className="mt-3 space-y-3">
                    {run.tiers.map((r) => (
                      <li key={r.tier} className="grid grid-cols-[7rem_1fr_5.5rem] items-center gap-3">
                        <span className="text-sm">
                          {r.tier} · {t(`tier.${r.tier}.name`)}
                        </span>
                        <span className="h-3 bg-rule" aria-hidden>
                          <span className={cn('block h-full', BAR[r.tier as Tier])} style={{ width: `${Math.max(0.6, (r.airtime_s / max) * 100)}%` }} />
                        </span>
                        <span className="num text-right text-sm">{r.airtime_s.toFixed(2)} s</span>
                      </li>
                    ))}
                  </ul>
                </section>

                <section aria-labelledby="ab" className="kasavu space-y-4 p-5">
                  <h2 id="ab" className="display text-2xl">
                    {t('link.ab')}
                  </h2>
                  <div className="flex flex-wrap gap-3">
                    <button type="button" className={cn('btn', playing === 'orig' && 'bg-vermilion')} onClick={() => play('orig', `${base}${audio.original}`)}>
                      {playing === 'orig' ? t('common.stop') : `${t('common.play')}: ${t('link.original')}`}
                    </button>
                    {audio[`A${loss}`] && (
                      <button
                        type="button"
                        className={cn('btn btn-ghost', playing === 'after' && 'bg-vermilion text-paper')}
                        onClick={() => play('after', `${base}${audio[`A${loss}`]}`)}
                      >
                        {playing === 'after' ? t('common.stop') : `${t('common.play')}: ${t('link.after')} · ${loss}%`}
                      </button>
                    )}
                  </div>
                  <Await q={beds}>
                    {(b) => (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="block text-sm font-semibold">
                          {t('link.bed')}
                          <select className="field mt-1" value={bed} onChange={(e) => setBed(e.target.value)}>
                            <option value="">{t('link.noBed')}</option>
                            {b.map((x) => (
                              <option key={x.web_file} value={x.web_file}>
                                {x.title}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="block text-sm font-semibold">
                          {t('link.snr')}: <span className="num">{snr} dB</span>
                          <input type="range" min={0} max={30} step={5} value={snr} disabled={!bed} onChange={(e) => setSnr(Number(e.target.value))} className="mt-3 w-full accent-[var(--vermilion)]" />
                        </label>
                      </div>
                    )}
                  </Await>
                  <p className="text-sm text-muted">{t('link.snrHint')}</p>
                </section>
              </div>
            )
          }}
        </Await>
      </div>
    </div>
  )
}
