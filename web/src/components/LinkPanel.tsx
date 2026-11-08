import { useTranslation } from 'react-i18next'
import { LOSSES, LossGauge, TuningDial } from '@/components/Instruments'
import { Segmented } from '@/components/Segmented'

/** The two link controls together: tuning dial for speed, VU gauge plus buttons for loss. */
export function LinkPanel({
  rate,
  loss,
  onRate,
  onLoss,
  compact = false,
}: {
  rate: number
  loss: number
  onRate: (n: number) => void
  onLoss: (n: number) => void
  compact?: boolean
}) {
  const { t } = useTranslation()
  return (
    <div className={`kasavu grid gap-4 p-5 ${compact ? "" : "sm:grid-cols-2"}`}>
      <div>
        <p className="text-sm font-semibold">{t('dial.label')}</p>
        <TuningDial value={rate} onChange={onRate} size={compact ? 220 : 260} />

      </div>
      <div>
        <p className="text-sm font-semibold">{t('dial.loss')}</p>
        <LossGauge value={loss} size={compact ? 190 : 220} />
        <Segmented
          mono
          label={t('dial.loss')}
          value={loss}
          options={LOSSES.map((l) => ({ value: l, label: `${l}%` }))}
          onChange={onLoss}
          hideLabel
          className="mt-2"
        />
      </div>
    </div>
  )
}
