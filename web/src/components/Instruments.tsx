import { m, useReducedMotion, useSpring } from 'motion/react'
import { useEffect, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'

export const RATES = [2, 5, 10]
export const LOSSES = [0, 10, 20, 30]

/** A spring-driven needle angle that jumps straight to the value when reduced motion is on. */
function useNeedle(target: number) {
  const reduced = useReducedMotion()
  const angle = useSpring(target, { stiffness: 170, damping: 17, mass: 0.8 })
  useEffect(() => {
    if (reduced) angle.jump(target)
    else angle.set(target)
  }, [target, reduced, angle])
  return angle
}

const polar = (cx: number, cy: number, r: number, deg: number) => {
  const a = ((deg - 90) * Math.PI) / 180
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const
}

const arc = (cx: number, cy: number, r: number, from: number, to: number) => {
  const [x1, y1] = polar(cx, cy, r, from)
  const [x2, y2] = polar(cx, cy, r, to)
  return `M ${x1} ${y1} A ${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x2} ${y2}`
}

/** Radio tuning dial for link speed: 2 to 10 kbps, needle on a brass pivot. Works as a slider. */
export function TuningDial({ value, onChange, size = 260 }: { value: number; onChange: (v: number) => void; size?: number }) {
  const { t } = useTranslation()
  const toDeg = (v: number) => -62 + ((v - 2) / 8) * 124
  const needle = useNeedle(toDeg(value))
  const cx = 130
  const cy = 132

  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    const i = RATES.indexOf(value)
    const step = ['ArrowRight', 'ArrowUp'].includes(e.key) ? 1 : ['ArrowLeft', 'ArrowDown'].includes(e.key) ? -1 : 0
    if (e.key === 'Home') onChange(RATES[0])
    else if (e.key === 'End') onChange(RATES[RATES.length - 1])
    else if (step) onChange(RATES[Math.min(RATES.length - 1, Math.max(0, i + step))])
    else return
    e.preventDefault()
  }

  return (
    <svg
      viewBox="0 0 260 160"
      width={size}
      className="h-auto max-w-full touch-manipulation select-none"
      role="slider"
      tabIndex={0}
      aria-label={t('dial.label')}
      aria-valuemin={2}
      aria-valuemax={10}
      aria-valuenow={value}
      aria-valuetext={`${value} kbps`}
      onKeyDown={onKey}
    >
      <path d={arc(cx, cy, 112, -66, 66)} fill="none" stroke="var(--gold)" strokeWidth="1" />
      <path d={arc(cx, cy, 104, -66, 66)} fill="none" stroke="var(--ink)" strokeWidth="1.5" />
      {Array.from({ length: 33 }, (_, k) => 2 + k * 0.25).map((v) => {
        const major = Number.isInteger(v)
        const [x1, y1] = polar(cx, cy, 104, toDeg(v))
        const [x2, y2] = polar(cx, cy, major ? 90 : 97, toDeg(v))
        return <line key={v} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--ink)" strokeWidth={major ? 1.4 : 0.6} />
      })}
      {Array.from({ length: 9 }, (_, k) => k + 2).map((v) => {
        const [x, y] = polar(cx, cy, 78, toDeg(v))
        const selectable = RATES.includes(v)
        return (
          <text
            key={v}
            x={x}
            y={y + 4}
            textAnchor="middle"
            className="num"
            fontSize={selectable ? 13 : 9}
            fontWeight={v === value ? 600 : 400}
            fill={v === value ? 'var(--vermilion)' : selectable ? 'var(--ink)' : 'var(--muted)'}
            style={{ cursor: selectable ? 'pointer' : 'default' }}
            onClick={() => selectable && onChange(v)}
          >
            {v}
          </text>
        )
      })}
      <text x={cx} y={150} textAnchor="middle" className="num" fontSize="10" fill="var(--muted)">
        kbps
      </text>
      <m.g style={{ rotate: needle, transformOrigin: `${cx}px ${cy}px`, transformBox: 'view-box' }}>
        <line x1={cx} y1={cy} x2={cx} y2={cy - 108} stroke="var(--vermilion)" strokeWidth="2" strokeLinecap="round" />
      </m.g>
      <circle cx={cx} cy={cy} r="9" fill="var(--gold)" stroke="var(--ink)" strokeWidth="1.2" />
      <circle cx={cx} cy={cy} r="2.5" fill="var(--ink)" />
    </svg>
  )
}

/** VU-style gauge for packet loss: 0 to 30 %, red zone where audio stops being trusted (above 10 %). */
export function LossGauge({ value, size = 220 }: { value: number; size?: number }) {
  const toDeg = (v: number) => -50 + (v / 30) * 100
  const needle = useNeedle(toDeg(value))
  const cx = 110
  const cy = 118
  return (
    <svg viewBox="0 0 220 140" width={size} className="h-auto max-w-full" aria-hidden>
      <rect x="4" y="4" width="212" height="132" fill="var(--card)" stroke="var(--ink)" strokeWidth="1.2" />
      <path d={arc(cx, cy, 92, toDeg(10), toDeg(30))} fill="none" stroke="var(--vermilion)" strokeWidth="6" />
      <path d={arc(cx, cy, 92, toDeg(0), toDeg(10))} fill="none" stroke="var(--teal)" strokeWidth="2" />
      {[0, 5, 10, 15, 20, 25, 30].map((v) => {
        const [x1, y1] = polar(cx, cy, 86, toDeg(v))
        const [x2, y2] = polar(cx, cy, v % 10 ? 80 : 74, toDeg(v))
        const [tx, ty] = polar(cx, cy, 64, toDeg(v))
        return (
          <g key={v}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--ink)" strokeWidth={v % 10 ? 0.8 : 1.4} />
            {v % 10 === 0 && (
              <text x={tx} y={ty + 4} textAnchor="middle" className="num" fontSize="11" fill="var(--ink)">
                {v}
              </text>
            )}
          </g>
        )
      })}
      <text x={cx} y={cy - 22} textAnchor="middle" className="num" fontSize="10" fill="var(--muted)">
        LOSS %
      </text>
      <m.g style={{ rotate: needle, transformOrigin: `${cx}px ${cy}px`, transformBox: 'view-box' }}>
        <line x1={cx} y1={cy} x2={cx} y2={cy - 96} stroke="var(--ink)" strokeWidth="1.6" />
      </m.g>
      <rect x="4" y={cy} width="212" height={136 - cy} fill="var(--ink)" />
    </svg>
  )
}
