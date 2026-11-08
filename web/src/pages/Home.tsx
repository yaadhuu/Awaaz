import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { pct } from '@/components/Charts'
import { LinkPanel } from '@/components/LinkPanel'
import { PacketStrip } from '@/components/PacketStrip'
import { StampCard } from '@/components/StampCard'
import { Await } from '@/components/States'
import type { Lang, Tier } from '@/data/types'
import { resources } from '@/i18n'
import { useCurve, useStudio } from '@/lib/useData'

const LANG_ORDER: Lang[] = ['ml', 'hi', 'en']

export default function Home({ lang }: { lang: Lang }) {
  const { t } = useTranslation()
  const [rate, setRate] = useState(5)
  const [loss, setLoss] = useState(0)
  const studio = useStudio()
  const curve = useCurve()

  return (
    <div className="space-y-16">
      <section>
        <p className="eyebrow-num">{t('home.kicker')}</p>
        <h1 className="display mt-2 max-w-4xl text-[clamp(2.6rem,8vw,5.6rem)]">{t('home.title')}</h1>
        <div className="mt-4 h-[3px] w-32 border-y border-gold" aria-hidden />
        <p className="mt-6 max-w-2xl text-lg">{t('home.lede')}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/studio" className="btn no-underline">
            {t('home.studio')}
          </Link>
          <Link to="/results" className="btn btn-ghost no-underline">
            {t('home.open')}
          </Link>
        </div>
      </section>

      <section aria-labelledby="problem">
        <h2 id="problem" className="eyebrow-num">
          {t('home.problemTitle')}
        </h2>
        <ol className="mt-3 grid gap-0 border-y border-ink md:grid-cols-3">
          {LANG_ORDER.map((l, i) => (
            <li key={l} lang={l} className={`py-5 md:px-5 ${i ? 'border-t border-rule md:border-l md:border-t-0' : ''}`}>
              <p className="num text-xs text-muted">{l}</p>
              <p className="display mt-1 text-[clamp(1.6rem,3vw,2.2rem)]">{resources[l].home.title}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="dial" className="grid gap-8 lg:grid-cols-[minmax(0,26rem)_1fr]">
        <div>
          <h2 id="dial" className="display text-3xl">
            {t('home.tryIt')}
          </h2>
          <div className="mt-4">
            <LinkPanel rate={rate} loss={loss} onRate={setRate} onLoss={setLoss} compact />
          </div>
        </div>
        <Await q={studio}>
          {(s) => {
            const sample = s.samples[lang].find((x) => s.runs[`${x.id}|5|0`])
            const run = sample ? s.runs[`${sample.id}|${rate}|${loss}`] : undefined
            if (!sample || !run) return null
            const why = run.chosen === 'A' ? 'A' : run.chosen === 'C' ? 'C' : loss > 10 ? 'Bloss' : 'Brate'
            return (
              <div>
                <h2 className="display text-3xl">{t('home.tiersTitle')}</h2>
                <blockquote lang={lang} className="mt-4 border-l-2 border-gold pl-4 text-lg italic">
                  {sample.text}
                </blockquote>
                <p className="mt-3" aria-live="polite">
                  <strong>{t(`tier.${run.chosen}.name`)}.</strong> {t(`why.${why}`)}
                </p>
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  {run.tiers.map((r) => (
                    <StampCard key={r.tier} tier={r.tier as Tier} chosen={r.tier === run.chosen} testId={`home-tier-${r.tier}`}>
                      <p className="num text-2xl">
                        {r.bytes_sent.toLocaleString()} <span className="text-sm text-muted">B</span>
                      </p>
                      <PacketStrip states={r.packet_states} tier={r.tier as Tier} />
                    </StampCard>
                  ))}
                </div>
              </div>
            )
          }}
        </Await>
      </section>

      <section aria-labelledby="result" className="kasavu p-6 sm:p-8">
        <h2 id="result" className="display text-3xl">
          {t('home.resultTitle')}
        </h2>
        <Await q={curve}>
          {(c) => {
            const at = (tier: Tier, l: number) => c.find((p) => p.lang === 'en' && p.tier === tier && p.loss === l)
            const a0 = at('A', 0)
            const a30 = at('A', 30)
            const c30 = at('C', 30)
            const c0 = at('C', 0)
            if (!a0 || !a30 || !c30 || !c0) return null
            const ci = (p: { fact_rate_ci: [number, number] }) => `${pct(p.fact_rate_ci[0])}–${pct(p.fact_rate_ci[1])}`
            return (
              <>
                <p className="mt-4 max-w-3xl text-xl">
                  {t('home.resultLine', {
                    a: pct(a0.fact_rate),
                    a30: pct(a30.fact_rate),
                    c30: pct(c30.fact_rate),
                    ratio: Math.round(a0.wire_bytes_per_min / c0.wire_bytes_per_min),
                  })}
                </p>
                <dl className="num mt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                  {[
                    ['A 0%', a0],
                    ['A 30%', a30],
                    ['C 30%', c30],
                    ['C 0%', c0],
                  ].map(([k, p]) => {
                    const pt = p as typeof a0
                    return (
                      <div key={k as string} className="border-t border-ink pt-2">
                        <dt className="text-muted">{k as string}</dt>
                        <dd className="text-2xl">{pct(pt.fact_rate)}</dd>
                        <dd className="text-muted">{ci(pt)}</dd>
                      </div>
                    )
                  })}
                </dl>
                <p className="mt-4 text-sm text-muted">
                  {t('home.resultNote')}{' '}
                  <a href={`${import.meta.env.BASE_URL}data/curve.json`}>{t('common.source')}: results/curve.json</a>
                </p>
              </>
            )
          }}
        </Await>
      </section>
    </div>
  )
}
