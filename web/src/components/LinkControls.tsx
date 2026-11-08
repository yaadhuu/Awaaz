import { useTranslation } from 'react-i18next'
import { Segmented } from '@/components/Segmented'

const RATES = [2, 5, 10]
const LOSSES = [0, 10, 20, 30]

export function LinkControls({
  rate,
  loss,
  onRate,
  onLoss,
}: {
  rate: number
  loss: number
  onRate: (n: number) => void
  onLoss: (n: number) => void
}) {
  const { t } = useTranslation()
  return (
    <section aria-label={t('link.title')} className="rounded-xl border bg-card p-5 shadow-card">
      <h2 className="text-lg font-semibold">{t('link.title')}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t('link.hint')}</p>
      <div className="mt-4 space-y-4">
        <Segmented
          mono
          label={t('link.speed')}
          value={rate}
          options={RATES.map((r) => ({ value: r, label: `${r} kbps` }))}
          onChange={onRate}
        />
        <Segmented
          mono
          label={t('link.loss')}
          value={loss}
          options={LOSSES.map((l) => ({ value: l, label: `${l}%` }))}
          onChange={onLoss}
        />
      </div>
    </section>
  )
}
