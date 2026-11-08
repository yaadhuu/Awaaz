import { LayoutGroup, motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import type { Lang, SendResponse, Tier } from '@/api'
import { TierCard } from '@/components/TierCard'
import { cn } from '@/lib/utils'

const TEXT: Record<Tier, string> = { A: 'text-tier-a', B: 'text-tier-b', C: 'text-tier-c' }

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'bad' | 'muted' }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          'num mt-0.5 text-base font-semibold',
          tone === 'good' && 'text-ok',
          tone === 'bad' && 'text-bad',
          tone === 'muted' && 'font-normal text-muted-foreground',
        )}
      >
        {value}
      </dd>
    </div>
  )
}

/** The headline answer (which tier, why, how much smaller) and the three tiers side by side. */
export function Verdict({
  result,
  lang,
  rate,
  loss,
  reduceMotion,
}: {
  result: SendResponse
  lang: Lang
  rate: number
  loss: number
  reduceMotion: boolean
}) {
  const { t } = useTranslation()
  const chosen = result.tiers.find((x) => x.tier === result.chosen)
  const audio = result.tiers.find((x) => x.tier === 'A')
  if (!chosen) return null

  const why =
    result.chosen === 'A' ? 'A' : result.chosen === 'C' ? 'C' : loss > 10 ? 'Bloss' : 'Brate'
  const smaller =
    result.chosen !== 'A' && audio && chosen.bytes_sent > 0
      ? Math.round(audio.bytes_sent / chosen.bytes_sent)
      : null
  const received = chosen.facts_received
  const arrived = chosen.packet_states.filter((x) => x !== 'lost').length
  const total = result.facts_sent.places.length + result.facts_sent.numbers.length + result.facts_sent.times.length
  const ok = received
    ? [
        ...received.places.filter((p) => result.facts_sent.places.includes(p)),
        ...received.numbers.filter((n) =>
          result.facts_sent.numbers.some((m) => m.value === n.value && m.unit === n.unit),
        ),
        ...received.times.filter((x) =>
          result.facts_sent.times.some((m) => m.hour === x.hour && m.period === x.period),
        ),
      ].length
    : null

  return (
    <section aria-label={t('verdict.chosen')} className="space-y-4" data-rate={rate}>
      <div className="rounded-xl border bg-card p-5 shadow-card sm:p-6">
        <p className="text-sm font-medium text-muted-foreground">{t('verdict.chosen')}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-2">
          <AnimatePresence mode="wait" initial={false}>
            <motion.h2
              key={result.chosen}
              data-testid="chosen-tier"
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className={cn('text-3xl font-semibold tracking-tight', TEXT[result.chosen])}
            >
              {result.chosen} · {t(`tier.${result.chosen}.name`)}
            </motion.h2>
          </AnimatePresence>
          {smaller !== null && smaller > 1 && (
            <span className="num rounded-full bg-secondary px-3 py-1 text-sm font-medium">
              {t('verdict.smaller', { x: smaller })}
            </span>
          )}
        </div>
        <p className="mt-2 max-w-2xl text-muted-foreground" aria-live="polite">
          {t(`verdict.why.${why}`)}
        </p>
        <dl className="mt-5 grid grid-cols-2 gap-3 border-t pt-4 lg:grid-cols-4">
          <Stat label={t('verdict.bytes')} value={chosen.bytes_sent.toLocaleString()} />
          <Stat label={t('verdict.airtime')} value={`${chosen.airtime_s.toFixed(2)} s @ ${rate} kbps`} />
          <Stat
            label={t('verdict.delivery')}
            value={t('verdict.arrived', { ok: arrived, count: chosen.packet_states.length })}
          />
          <Stat
            label={t('verdict.factsCorrect')}
            value={ok === null ? t('verdict.notMeasured') : `${ok} / ${total}`}
            tone={ok === null ? 'muted' : ok === total ? 'good' : 'bad'}
          />
        </dl>
      </div>

      <LayoutGroup>
        <div className="grid gap-4 md:grid-cols-3">
          {result.tiers.map((r) => (
            <TierCard
              key={r.tier}
              report={r}
              chosen={r.tier === result.chosen}
              truth={result.facts_sent}
              lang={lang}
              reduceMotion={reduceMotion}
            />
          ))}
        </div>
      </LayoutGroup>
    </section>
  )
}
