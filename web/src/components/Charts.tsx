import { scaleBand, scaleLinear, scaleLog } from 'd3-scale'
import { line } from 'd3-shape'
import { useEffect, useRef, useState } from 'react'
import type { CurvePoint, Lang, Tier } from '@/data/types'

const COLOR: Record<Tier, string> = { A: 'var(--tier-a)', B: 'var(--tier-b)', C: 'var(--tier-c)' }
export const pct = (x: number) => `${Math.round(x * 100)}%`

/** Width of a container, for charts that must fit 360 px phones and 1440 px screens. */
export function useWidth<T extends HTMLElement>(fallback = 300) {
  const ref = useRef<T>(null)
  const [w, setW] = useState(fallback)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, w] as const
}

function Mark({ tier, x, y }: { tier: Tier; x: number; y: number }) {
  const c = COLOR[tier]
  if (tier === 'A') return <circle cx={x} cy={y} r={4.5} fill={c} />
  if (tier === 'B') return <rect x={x - 4} y={y - 4} width={8} height={8} fill={c} />
  return <path d={`M ${x} ${y - 5.5} L ${x + 5.5} ${y} L ${x} ${y + 5.5} L ${x - 5.5} ${y} Z`} fill={c} />
}

/** Facts correct against bytes per minute, one ruled line per tier, interval bars at each loss level. */
export function CurveChart({
  points,
  lang,
  xLabel,
  yLabel,
  names,
}: {
  points: CurvePoint[]
  lang: Lang
  xLabel: string
  yLabel: string
  names: Record<Tier, string>
}) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const h = 320
  const m = { l: 48, r: 34, t: 14, b: 46 }
  const x = scaleLog().domain([50, 40000]).range([m.l, width - m.r])
  const y = scaleLinear().domain([0, 1]).range([h - m.b, m.t])
  const mine = points.filter((p) => p.lang === lang)
  const path = line<CurvePoint>()
    .x((p) => x(p.wire_bytes_per_min))
    .y((p) => y(p.fact_rate))
  const summary = mine.map((p) => `${p.tier} ${p.loss}%: ${pct(p.fact_rate)}`).join('; ')
  return (
    <div ref={ref} className="w-full">
      <svg width={width} height={h} role="img" aria-label={`${yLabel}. ${summary}`} className="block">
        {[0, 0.25, 0.5, 0.75, 1].map((v) => (
          <g key={v}>
            <line x1={m.l} x2={width - m.r} y1={y(v)} y2={y(v)} stroke="var(--rule)" strokeWidth={v === 0 ? 1.2 : 0.8} />
            <text x={m.l - 8} y={y(v) + 4} textAnchor="end" className="num" fontSize="11" fill="var(--muted)">
              {pct(v)}
            </text>
          </g>
        ))}
        {[100, 1000, 10000].map((v) => (
          <g key={v}>
            <line x1={x(v)} x2={x(v)} y1={m.t} y2={h - m.b} stroke="var(--rule)" strokeDasharray="2 4" />
            <text x={x(v)} y={h - m.b + 16} textAnchor="middle" className="num" fontSize="11" fill="var(--muted)">
              {v >= 1000 ? `${v / 1000}k` : v}
            </text>
          </g>
        ))}
        <text x={(m.l + width - m.r) / 2} y={h - 6} textAnchor="middle" fontSize="12" fill="var(--muted)">
          {xLabel}
        </text>
        {(['A', 'B', 'C'] as Tier[]).map((tier) => {
          const s = mine.filter((p) => p.tier === tier).sort((a, b) => a.loss - b.loss)
          return (
            <g key={tier}>
              <path d={path(s) ?? ''} fill="none" stroke={COLOR[tier]} strokeWidth="1.5" />
              {s.map((p) => (
                <g key={p.loss}>
                  <line
                    x1={x(p.wire_bytes_per_min)}
                    x2={x(p.wire_bytes_per_min)}
                    y1={y(p.fact_rate_ci[0])}
                    y2={y(p.fact_rate_ci[1])}
                    stroke={COLOR[tier]}
                    strokeWidth="5"
                    strokeOpacity="0.22"
                  />
                  <Mark tier={tier} x={x(p.wire_bytes_per_min)} y={y(p.fact_rate)} />
                  {tier === 'A' && (
                    <text x={x(p.wire_bytes_per_min) + 9} y={y(p.fact_rate) + 4} className="num" fontSize="10" fill="var(--muted)">
                      {p.loss}%
                    </text>
                  )}
                </g>
              ))}
            </g>
          )
        })}
      </svg>
      <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
        {(['A', 'B', 'C'] as Tier[]).map((tier) => (
          <li key={tier} className="inline-flex items-center gap-2">
            <svg width="14" height="14" aria-hidden>
              <Mark tier={tier} x={7} y={7} />
            </svg>
            {tier} · {names[tier]}
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Horizontal rate bars with 95 % interval whiskers. */
export function RateBars({ rows }: { rows: { label: string; value: number; ci: [number, number]; tone: 'ok' | 'bad' }[] }) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const rowH = 30
  const labelW = Math.min(170, width * 0.38)
  const x = scaleLinear().domain([0, 1]).range([labelW, width - 48])
  return (
    <div ref={ref}>
      <svg width={width} height={rows.length * rowH + 24} className="block" role="img" aria-label={rows.map((r) => `${r.label} ${pct(r.value)}`).join('; ')}>
        {[0, 0.5, 1].map((v) => (
          <text key={v} x={x(v)} y={rows.length * rowH + 18} textAnchor="middle" className="num" fontSize="10" fill="var(--muted)">
            {pct(v)}
          </text>
        ))}
        {rows.map((r, i) => {
          const cy = i * rowH + rowH / 2
          const c = r.tone === 'ok' ? 'var(--teal)' : 'var(--vermilion)'
          return (
            <g key={r.label}>
              <text x={0} y={cy + 4} fontSize="13" fill="var(--ink)">
                {r.label}
              </text>
              <line x1={x(0)} x2={x(1)} y1={cy} y2={cy} stroke="var(--rule)" />
              <rect x={x(0)} y={cy - 5} width={Math.max(1, x(r.value) - x(0))} height={10} fill={c} />
              <line x1={x(r.ci[0])} x2={x(r.ci[1])} y1={cy} y2={cy} stroke="var(--ink)" strokeWidth="1.2" />
              <line x1={x(r.ci[0])} x2={x(r.ci[0])} y1={cy - 6} y2={cy + 6} stroke="var(--ink)" />
              <line x1={x(r.ci[1])} x2={x(r.ci[1])} y1={cy - 6} y2={cy + 6} stroke="var(--ink)" />
              <text x={width - 4} y={cy + 4} textAnchor="end" className="num" fontSize="12" fill="var(--ink)">
                {pct(r.value)}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

/** Stacked bars by day (speech to text and text to speech). */
export function DayBars({ days }: { days: { day: string; stt: number; tts: number }[] }) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const h = 180
  const x = scaleBand<string>().domain(days.map((d) => d.day)).range([40, width - 8]).padding(0.35)
  const max = Math.max(1, ...days.map((d) => d.stt + d.tts))
  const y = scaleLinear().domain([0, max]).range([h - 26, 8]).nice()
  return (
    <div ref={ref}>
      <svg width={width} height={h} className="block" role="img" aria-label={days.map((d) => `${d.day}: ${d.stt} STT, ${d.tts} TTS`).join('; ')}>
        {y.ticks(4).map((v) => (
          <g key={v}>
            <line x1={40} x2={width - 8} y1={y(v)} y2={y(v)} stroke="var(--rule)" />
            <text x={34} y={y(v) + 4} textAnchor="end" className="num" fontSize="10" fill="var(--muted)">
              {v}
            </text>
          </g>
        ))}
        {days.map((d) => (
          <g key={d.day}>
            <rect x={x(d.day)} width={x.bandwidth()} y={y(d.stt)} height={y(0) - y(d.stt)} fill="var(--teal)" />
            <rect x={x(d.day)} width={x.bandwidth()} y={y(d.stt + d.tts)} height={y(d.stt) - y(d.stt + d.tts)} fill="var(--turmeric)" />
            <text x={(x(d.day) ?? 0) + x.bandwidth() / 2} y={h - 8} textAnchor="middle" className="num" fontSize="10" fill="var(--muted)">
              {d.day.slice(5)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}

/** Peak waveform as a row of thin bars. */
export function Waveform({ peaks, label }: { peaks: number[]; label: string }) {
  const w = 240
  const h = 40
  const bw = w / peaks.length
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-10 w-full" role="img" aria-label={label} preserveAspectRatio="none">
      {peaks.map((p, i) => {
        const bh = Math.max(1, p * (h - 4))
        return <rect key={i} x={i * bw} y={(h - bh) / 2} width={Math.max(0.6, bw - 0.6)} height={bh} fill="var(--ink)" />
      })}
    </svg>
  )
}
