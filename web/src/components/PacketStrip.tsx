import { useTranslation } from 'react-i18next'
import type { PacketState, Tier } from '@/data/types'
import { cn } from '@/lib/utils'

const FILL: Record<Tier, string> = { A: 'bg-tier-a', B: 'bg-tier-b', C: 'bg-tier-c' }
const EDGE: Record<Tier, string> = { A: 'border-tier-a', B: 'border-tier-b', C: 'border-tier-c' }
const MAX = 200

/** One tick per packet, like a paper tape: solid arrived, hollow arrived after a resend, a gap was lost. */
export function PacketStrip({ states, tier }: { states: PacketState[]; tier: Tier }) {
  const { t } = useTranslation()
  const lost = states.filter((s) => s === 'lost').length
  const resent = states.filter((s) => s === 'resent').length
  const summary = t('packets', { count: states.length, lost, resent })
  return (
    <div>
      <div role="img" aria-label={summary} className="flex flex-wrap gap-[2px]">
        {states.slice(0, MAX).map((s, i) => (
          <span
            key={i}
            className={cn(
              'h-4 w-[6px] border',
              s === 'ok' && cn(FILL[tier], 'border-transparent'),
              s === 'resent' && cn(EDGE[tier], 'bg-transparent'),
              s === 'lost' && 'border-dotted border-muted/60 bg-transparent',
            )}
          />
        ))}
        {states.length > MAX && <span className="num ml-1 text-xs text-muted">+{states.length - MAX}</span>}
      </div>
      <p className="num mt-1.5 text-xs text-muted">{summary}</p>
    </div>
  )
}
