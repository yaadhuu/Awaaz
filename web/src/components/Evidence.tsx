import { useQuery } from '@tanstack/react-query'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CartesianGrid,
  ErrorBar,
  LabelList,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { getCurve, type CurvePoint, type Lang, type Tier } from '@/api'

const TIERS: Tier[] = ['A', 'B', 'C']
const COLOR: Record<Tier, string> = { A: 'var(--tier-a)', B: 'var(--tier-b)', C: 'var(--tier-c)' }
const pct = (x: number) => `${Math.round(x * 100)}%`

function series(points: CurvePoint[], tier: Tier) {
  return points
    .filter((p) => p.tier === tier)
    .sort((a, b) => a.loss - b.loss)
    .map((p) => ({
      x: p.wire_bytes_per_min,
      y: p.fact_rate,
      loss: p.loss,
      lo: p.fact_rate_ci[0],
      hi: p.fact_rate_ci[1],
      err: [p.fact_rate - p.fact_rate_ci[0], p.fact_rate_ci[1] - p.fact_rate],
    }))
}

function Tip({ active, payload }: { active?: boolean; payload?: { payload: ReturnType<typeof series>[number] & { tier: Tier } }[] }) {
  const { t } = useTranslation()
  const d = payload?.[0]?.payload
  if (!active || !d) return null
  return (
    <div className="rounded-lg border bg-popover p-3 text-sm shadow-card">
      <p className="font-semibold">
        {d.tier} · {t(`tier.${d.tier}.name`)}
      </p>
      <p className="num">{pct(d.y)} ({pct(d.lo)}–{pct(d.hi)})</p>
      <p className="num text-muted-foreground">{Math.round(d.x).toLocaleString()} B/min</p>
      <p className="text-muted-foreground">{t('evidence.loss', { n: d.loss })}</p>
    </div>
  )
}

export function Evidence({ lang }: { lang: Lang }) {
  const { t } = useTranslation()
  const id = useId()
  const { data, isPending, isError } = useQuery({ queryKey: ['curve'], queryFn: getCurve, retry: false })
  const points = data?.filter((p) => p.lang === lang) ?? []

  const at = (tier: Tier, loss: number) => points.find((p) => p.tier === tier && p.loss === loss)

  return (
    <section aria-labelledby={`${id}-h`} className="rounded-xl border bg-card p-5 shadow-card sm:p-6">
      <h2 id={`${id}-h`} className="text-lg font-semibold">
        {t('evidence.title')}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{t('evidence.desc')}</p>

      {isPending && <p className="mt-6">{t('evidence.loading')}</p>}
      {isError && <p className="mt-6 text-muted-foreground">{t('evidence.unavailable')}</p>}

      {data && (
        <>
          <div className="mt-4 h-[320px] w-full" role="img" aria-label={t('evidence.title')}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ left: 8, right: 16, top: 12, bottom: 28 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  dataKey="x"
                  scale="log"
                  domain={[50, 40000]}
                  ticks={[100, 1000, 10000]}
                  tickFormatter={(v: number) => (v >= 1000 ? `${v / 1000}k` : String(v))}
                  stroke="var(--muted-foreground)"
                  label={{ value: t('evidence.x'), position: 'insideBottom', offset: -16, fill: 'var(--muted-foreground)', fontSize: 12 }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  domain={[0, 1]}
                  tickFormatter={pct}
                  stroke="var(--muted-foreground)"
                  width={52}
                />
                <Tooltip content={<Tip />} cursor={{ strokeDasharray: '3 3' }} />
                {TIERS.map((tier) => (
                  <Scatter
                    key={tier}
                    name={tier}
                    data={series(points, tier).map((d) => ({ ...d, tier }))}
                    fill={COLOR[tier]}
                    line={{ stroke: COLOR[tier], strokeWidth: 2 }}
                    isAnimationActive={false}
                  >
                    <ErrorBar dataKey="err" direction="y" stroke={COLOR[tier]} strokeWidth={1.5} />
                    {tier === 'A' && (
                      <LabelList dataKey="loss" position="right" formatter={(v: unknown) => `${String(v)}%`} fontSize={11} fill="var(--muted-foreground)" />
                    )}
                  </Scatter>
                ))}
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {TIERS.map((tier) => (
              <li key={tier} className="inline-flex items-center gap-2">
                <span className="h-0.5 w-5 rounded" style={{ background: COLOR[tier] }} aria-hidden />
                {tier} · {t(`tier.${tier}.name`)}
              </li>
            ))}
          </ul>
          <p className="mt-1 text-xs text-muted-foreground">{t('evidence.note')}</p>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[26rem] text-left text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th scope="col" className="py-2 pr-3 font-medium">{t('evidence.tier')}</th>
                  <th scope="col" className="py-2 pr-3 font-medium">{t('evidence.perMin')}</th>
                  <th scope="col" className="py-2 pr-3 font-medium">{t('evidence.y')} · 0%</th>
                  <th scope="col" className="py-2 font-medium">{t('evidence.y')} · 30%</th>
                </tr>
              </thead>
              <tbody>
                {TIERS.map((tier) => (
                  <tr key={tier} className="border-b last:border-0">
                    <th scope="row" className="py-2 pr-3 font-medium">
                      {tier} · {t(`tier.${tier}.name`)}
                    </th>
                    <td className="num py-2 pr-3">{Math.round(at(tier, 0)?.wire_bytes_per_min ?? 0).toLocaleString()}</td>
                    <td className="num py-2 pr-3">{at(tier, 0) ? pct(at(tier, 0)!.fact_rate) : '–'}</td>
                    <td className="num py-2">{at(tier, 30) ? pct(at(tier, 30)!.fact_rate) : '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  )
}
