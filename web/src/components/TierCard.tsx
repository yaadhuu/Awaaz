import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import type { Facts, Lang, Tier, TierReport } from '@/api'
import { FactChips } from '@/components/FactChips'
import { PacketStrip } from '@/components/PacketStrip'
import { cn } from '@/lib/utils'

const BADGE: Record<Tier, string> = {
  A: 'bg-tier-a-soft text-tier-a',
  B: 'bg-tier-b-soft text-tier-b',
  C: 'bg-tier-c-soft text-tier-c',
}

export function TierCard({
  report,
  chosen,
  truth,
  lang,
  reduceMotion,
}: {
  report: TierReport
  chosen: boolean
  truth: Facts
  lang: Lang
  reduceMotion: boolean
}) {
  const { t } = useTranslation()
  const tier = report.tier
  const lost = report.packet_states.filter((s) => s === 'lost').length

  return (
    <article
      data-testid={`tier-${tier}`}
      aria-current={chosen}
      className="relative flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-card"
    >
      {chosen && (
        <motion.span
          layoutId="chosen-ring"
          aria-hidden
          transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 34 }}
          className="pointer-events-none absolute -inset-px rounded-xl border-2 border-foreground"
        />
      )}
      <header className="flex items-start gap-3">
        <span className={cn('grid size-9 shrink-0 place-items-center rounded-lg text-base font-semibold', BADGE[tier])}>
          {tier}
        </span>
        <div className="min-w-0">
          <h3 className="font-semibold leading-tight">{t(`tier.${tier}.name`)}</h3>
          <p className="text-sm text-muted-foreground">{t(`tier.${tier}.desc`)}</p>
        </div>
      </header>

      <dl className="grid grid-cols-[repeat(auto-fit,minmax(6.5rem,1fr))] gap-3">
        <div>
          <dt className="text-xs text-muted-foreground">{t('verdict.bytes')}</dt>
          <dd className="num text-xl font-semibold">
            {report.bytes_sent.toLocaleString()}
            {report.estimated && <span className="ml-1 text-xs font-normal">~</span>}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">{t('verdict.airtime')}</dt>
          <dd className="num text-xl font-semibold">{report.airtime_s.toFixed(2)} s</dd>
        </div>
      </dl>

      {report.packet_states.length > 0 && <PacketStrip states={report.packet_states} tier={tier} />}

      <div className="mt-auto space-y-2 border-t pt-3">
        <p className="text-sm font-medium">
          {report.delivered === null
            ? '–'
            : report.delivered
              ? t('verdict.delivered')
              : `${t('verdict.partial')}: ${lost}`}
        </p>
        {report.facts_received ? (
          <FactChips truth={truth} received={report.facts_received} lang={lang} />
        ) : (
          <p className="text-sm text-muted-foreground">
            {report.estimated ? t('facts.estimated') : t('facts.needsStt')}
          </p>
        )}
      </div>
    </article>
  )
}
