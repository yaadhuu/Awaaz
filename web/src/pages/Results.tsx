import { useTranslation } from 'react-i18next'
import { CurveChart, pct } from '@/components/Charts'
import { PageHead } from '@/components/Shell'
import { Await } from '@/components/States'
import type { CurvePoint, Lang, Tier } from '@/data/types'
import { toCsv } from '@/lib/credits'
import { useCurve, useExperiments, useMainSummary, useMeta } from '@/lib/useData'

const base = import.meta.env.BASE_URL
const LANGS: Lang[] = ['ml', 'hi', 'en']
const NAMES: Record<Lang, string> = { ml: 'മലയാളം', hi: 'हिन्दी', en: 'English' }

function Src({ file, repoPath }: { file: string; repoPath: string }) {
  const { t } = useTranslation()
  const meta = useMeta()
  return (
    <p className="num mt-2 text-xs text-muted">
      {t('common.source')}: <a href={`${base}data/${file}`}>{repoPath}</a>
      {meta.data && (
        <>
          {' · '}
          <a href={`${meta.data.repo}${repoPath}`}>GitHub</a>
        </>
      )}
    </p>
  )
}

/** Small markdown subset for the experiment log: paragraphs, bullets and inline code. */
function Md({ text }: { text: string }) {
  const inline = (s: string) =>
    s.split(/(`[^`]+`)/).map((p, i) => (p.startsWith('`') ? <code key={i} className="num text-[0.9em]">{p.slice(1, -1)}</code> : p))
  const blocks = text.split(/\n(?=- )/)
  return (
    <div className="space-y-2 text-[0.95rem]">
      {blocks.map((b, i) =>
        b.startsWith('- ') ? (
          <p key={i} className="border-l-2 border-rule pl-3">
            {inline(b.slice(2))}
          </p>
        ) : (
          <p key={i}>{inline(b)}</p>
        ),
      )}
    </div>
  )
}

function download(name: string, text: string, type: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([text], { type }))
  a.download = name
  a.click()
  URL.revokeObjectURL(a.href)
}

const LIMITS = [
  'Simulated link; no radio test.',
  'Synthetic speech from one Timbre voice (Vasudha, speed 1.0).',
  'Templated corpus: 40 messages per language, 4 types, 12 places. Tier B compression benefits from this.',
  'Prisma on decoded audio stands in for a human listener in Tier A.',
  'Place-name hints are a closed list, so their gain is optimistic.',
  'Hindi and Malayalam texts are machine-written and await native review.',
  'Credits used are not known exactly: Gnani publishes no prices.',
]

export default function Results(_props: { lang: Lang }) {
  const { t } = useTranslation()
  const curve = useCurve()
  const main = useMainSummary()
  const exps = useExperiments()
  const names: Record<Tier, string> = { A: t('tier.A.name'), B: t('tier.B.name'), C: t('tier.C.name') }
  return (
    <div className="space-y-14">
      <PageHead no="5" title={t('results.title')} lede={t('results.lede')} />

      <section aria-labelledby="curve">
        <h2 id="curve" className="display text-3xl">
          {t('results.curve')}
        </h2>
        <Await q={curve}>
          {(c) => (
            <div className="mt-4 grid gap-10 xl:grid-cols-3">
              {LANGS.map((l) => (
                <figure key={l}>
                  <figcaption className="mb-2 font-semibold" lang={l}>
                    {NAMES[l]}
                  </figcaption>
                  <CurveChart points={c} lang={l} xLabel={t('results.curveX')} yLabel={t('results.curveY')} names={names} />
                  <table className="table-ruled num mt-3 text-sm">
                    <thead>
                      <tr>
                        <th scope="col">Tier</th>
                        <th scope="col">0%</th>
                        <th scope="col">30%</th>
                        <th scope="col">B/min</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(['A', 'B', 'C'] as Tier[]).map((tier) => {
                        const at = (loss: number) => c.find((p) => p.lang === l && p.tier === tier && p.loss === loss) as CurvePoint
                        return (
                          <tr key={tier}>
                            <th scope="row">{tier}</th>
                            <td>
                              {pct(at(0).fact_rate)} <span className="text-muted">({pct(at(0).fact_rate_ci[0])}–{pct(at(0).fact_rate_ci[1])})</span>
                            </td>
                            <td>
                              {pct(at(30).fact_rate)} <span className="text-muted">({pct(at(30).fact_rate_ci[0])}–{pct(at(30).fact_rate_ci[1])})</span>
                            </td>
                            <td>{Math.round(at(0).wire_bytes_per_min).toLocaleString()}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </figure>
              ))}
            </div>
          )}
        </Await>
        <Src file="curve.json" repoPath="results/curve.json" />
      </section>

      <section aria-labelledby="lang">
        <h2 id="lang" className="display text-3xl">
          {t('results.byLang')}
        </h2>
        <Await q={main}>
          {(s) => (
            <div className="mt-4 overflow-x-auto">
              <table className="table-ruled min-w-[40rem]">
                <thead>
                  <tr>
                    <th scope="col">{t('results.lang')}</th>
                    <th scope="col">{t('results.cond')}</th>
                    <th scope="col">{t('results.facts')}</th>
                    <th scope="col">{t('results.exact')}</th>
                    <th scope="col">{t('results.wer')}</th>
                    <th scope="col">{t('results.cer')}</th>
                  </tr>
                </thead>
                <tbody className="num">
                  {Object.entries(s).map(([k, v]) => {
                    const [l, , , cond] = k.split('|')
                    return (
                      <tr key={k}>
                        <th scope="row" className="font-sans" lang={l}>
                          {NAMES[l as Lang]}
                        </th>
                        <td className="font-sans">{cond === 'off' ? t('teach.condOff') : t('teach.condBoth')}</td>
                        <td>
                          {v.facts_matched}/{v.facts_total} · {pct(v.fact_rate)} <span className="text-muted">({pct(v.fact_rate_ci[0])}–{pct(v.fact_rate_ci[1])})</span>
                        </td>
                        <td>
                          {v.message_exact}/{v.messages}
                        </td>
                        <td>{v.wer.toFixed(3)}</td>
                        <td>{v.cer.toFixed(3)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Await>
        <Src file="main_summary.json" repoPath="results/main/summary.json" />
      </section>

      <section aria-labelledby="voice" className="grid gap-8 md:grid-cols-2">
        <div>
          <h2 id="voice" className="display text-2xl">
            {t('results.byVoice')}
          </h2>
          <p className="mt-2">{t('results.voiceNote')}</p>
        </div>
        <div>
          <h2 className="display text-2xl">{t('results.estimator')}</h2>
          <p className="mt-2">{t('results.estimatorNote')}</p>
        </div>
      </section>

      <section aria-labelledby="limits">
        <h2 id="limits" className="display text-3xl">
          {t('results.limits')}
        </h2>
        <ul className="mt-3 max-w-3xl list-disc space-y-1 pl-5" lang="en">
          {LIMITS.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="dl">
        <h2 id="dl" className="display text-3xl">
          {t('results.downloads')}
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => curve.data && download('tinytalk-curve.csv', toCsv(curve.data.map(({ fact_rate_ci, mean_airtime_s, ...r }) => ({ ...r, ci_low: fact_rate_ci[0], ci_high: fact_rate_ci[1], airtime_5kbps: mean_airtime_s['5'] }))), 'text/csv')}
            disabled={!curve.data}
          >
            curve.csv
          </button>
          {['curve.json', 'main_summary.json', 'pilot_summary.json', 'teachback.json', 'sizes.json'].map((f) => (
            <a key={f} className="btn btn-ghost no-underline" href={`${base}data/${f}`} download>
              {f}
            </a>
          ))}
        </div>
      </section>

      <section aria-labelledby="exp">
        <h2 id="exp" className="display text-3xl">
          {t('results.experiments')}
        </h2>
        <Await q={exps}>
          {(e) => (
            <div className="mt-4 space-y-3" lang="en">
              {e.filter((x) => x.id).map((x) => (
                <details key={x.id} className="border-t border-rule pt-3">
                  <summary className="cursor-pointer text-lg font-semibold">
                    <span className="num mr-2 text-vermilion">{x.id}</span>
                    {x.title}
                  </summary>
                  <div className="mt-3 max-w-3xl">
                    <Md text={x.body} />
                  </div>
                </details>
              ))}
            </div>
          )}
        </Await>
        <Src file="experiments.json" repoPath="docs/EXPERIMENTS.md" />
      </section>
    </div>
  )
}
