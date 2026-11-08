import { useTranslation } from 'react-i18next'

const STEPS = ['s1', 's2', 's3'] as const

export function HowItWorks() {
  const { t } = useTranslation()
  return (
    <section aria-label={t('how.title')}>
      <h2 className="text-lg font-semibold">{t('how.title')}</h2>
      <ol className="mt-3 grid gap-3 md:grid-cols-3">
        {STEPS.map((s, i) => (
          <li key={s} className="flex gap-3 rounded-xl border bg-card p-4">
            <span className="num grid size-7 shrink-0 place-items-center rounded-full bg-secondary text-sm font-semibold">
              {i + 1}
            </span>
            <div>
              <p className="font-medium">{t(`how.${s}.t`)}</p>
              <p className="text-sm text-muted-foreground">{t(`how.${s}.d`)}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
