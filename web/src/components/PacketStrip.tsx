import { useTranslation } from 'react-i18next'
import type { Tier } from '@/api'
import { cn } from '@/lib/utils'

const COLOR: Record<Tier, string> = { A: 'bg-tier-a', B: 'bg-tier-b', C: 'bg-tier-c' }
const RING: Record<Tier, string> = { A: 'border-tier-a', B: 'border-tier-b', C: 'border-tier-c' }
const MAX = 240

/** One cell per packet: solid = arrived, outlined = arrived after a resend, red = never arrived. */
export function PacketStrip({ states, tier }: { states: string[]; tier: Tier }) {
  const { t } = useTranslation()
  const lost = states.filter((s) => s === 'lost').length
  const resent = states.filter((s) => s === 'resent').length
  const summary = t('packets', { count: states.length, lost, resent })
  const shown = states.slice(0, MAX)

  return (
    <div>
      <div role="img" aria-label={summary} className="flex flex-wrap gap-[3px]">
        {shown.map((s, i) => (
          <span
            key={i}
            className={cn(
              'h-5 w-2.5 rounded-[3px] border',
              s === 'ok' && cn(COLOR[tier], 'border-transparent'),
              s === 'resent' && cn(RING[tier], 'bg-transparent'),
              s === 'lost' && 'border-bad bg-bad/25',
            )}
          />
        ))}
        {states.length > MAX && <span className="num ml-1 text-xs text-muted-foreground">+{states.length - MAX}</span>}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{summary}</p>
    </div>
  )
}
