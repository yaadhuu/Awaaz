import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { CartesianGrid, ErrorBar, Legend, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts'
import { getCurve, type Lang, type Tier } from '@/api'

const COLORS: Record<Tier, string> = { A: '#dc2626', B: '#2563eb', C: '#16a34a' }

export function CurveChart({ lang }: { lang: Lang }) {
  const { t } = useTranslation()
  const { data, isPending, isError } = useQuery({ queryKey: ['curve'], queryFn: getCurve, retry: false })

  if (isPending) return <p>{t('loading')}</p>
  if (isError) return <p>{t('curveMissing')}</p>

  const points = data.filter((p) => p.lang === lang)
  return (
    <section aria-label={t('curveTitle')} className="space-y-2">
      <h2 className="text-lg font-semibold">{t('curveTitle')}</h2>
      <ScatterChart width={640} height={320} margin={{ left: 8, right: 16, top: 8, bottom: 24 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          type="number"
          dataKey="x"
          scale="log"
          domain={['auto', 'auto']}
          name="bytes/min"
          label={{ value: 'bytes on the air per minute', position: 'insideBottom', offset: -12 }}
        />
        <YAxis type="number" dataKey="y" domain={[0, 1]} name="facts correct" />
        <Tooltip />
        <Legend verticalAlign="top" />
        {(['A', 'B', 'C'] as Tier[]).map((tier) => (
          <Scatter
            key={tier}
            name={tier}
            fill={COLORS[tier]}
            data={points
              .filter((p) => p.tier === tier)
              .map((p) => ({
                x: p.wire_bytes_per_min,
                y: p.fact_rate,
                err: [p.fact_rate - p.fact_rate_ci[0], p.fact_rate_ci[1] - p.fact_rate],
              }))}
          >
            <ErrorBar dataKey="err" direction="y" stroke={COLORS[tier]} />
          </Scatter>
        ))}
      </ScatterChart>
    </section>
  )
}
