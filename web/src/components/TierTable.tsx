import { AnimatePresence, motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import type { SendResponse, Tier } from '@/api'

const factsText = (f: SendResponse['facts_sent']) =>
  [
    ...f.places,
    ...f.numbers.map((n) => `${n.value} ${n.unit}`),
    ...f.times.map((t) => `${t.hour} ${t.period}`),
  ].join(' · ')

export function TierTable({ result }: { result: SendResponse }) {
  const { t } = useTranslation()
  const label: Record<Tier, string> = { A: t('tierA'), B: t('tierB'), C: t('tierC') }
  return (
    <section aria-label={t('chosen')} className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">{t('chosen')}</span>
        <AnimatePresence mode="wait">
          <motion.span
            key={result.chosen}
            data-testid="chosen-tier"
            initial={{ opacity: 0, scale: 0.7, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.7 }}
            className="rounded-full bg-neutral-900 px-4 py-1 text-sm font-semibold text-white dark:bg-white dark:text-neutral-900"
          >
            {label[result.chosen]}
          </motion.span>
        </AnimatePresence>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[32rem] text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-300 dark:border-neutral-700">
              <th className="py-2 pr-3">Tier</th>
              <th className="py-2 pr-3">{t('bytes')}</th>
              <th className="py-2 pr-3">{t('airtime')}</th>
              <th className="py-2 pr-3">{t('delivered')}</th>
              <th className="py-2">{t('facts')}</th>
            </tr>
          </thead>
          <tbody>
            {result.tiers.map((r) => (
              <tr
                key={r.tier}
                data-testid={`tier-${r.tier}`}
                className={
                  'border-b border-neutral-200 dark:border-neutral-800 ' +
                  (r.tier === result.chosen ? 'bg-neutral-100 font-medium dark:bg-neutral-800' : '')
                }
              >
                <td className="py-2 pr-3">{label[r.tier]}</td>
                <td className="py-2 pr-3">
                  {r.bytes_sent}
                  {r.estimated && <em className="ml-1 text-xs">({t('estimated')})</em>}
                </td>
                <td className="py-2 pr-3">{r.airtime_s.toFixed(2)} s</td>
                <td className="py-2 pr-3">
                  {r.delivered === null ? '–' : r.delivered ? t('yes') : t('no')}
                </td>
                <td className="py-2">
                  {r.facts_received ? factsText(r.facts_received) : (r.note ?? '–')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
