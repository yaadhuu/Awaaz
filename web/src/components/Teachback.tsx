import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { postTeachback } from '@/api'
import { Button } from '@/components/ui/button'

/** Receiver says the facts back; a changed number must be caught. Remount (key) on a new message. */
export function Teachback({ sent }: { sent: string }) {
  const { t } = useTranslation()
  const [readback, setReadback] = useState(sent)
  const check = useMutation({ mutationFn: postTeachback })

  const alter = () => setReadback((r) => r.replace(/\d+/, (m) => String(Number(m) + 1)))

  return (
    <section aria-label={t('teachback')} className="space-y-3">
      <h2 className="text-lg font-semibold">{t('teachback')}</h2>
      <label className="block text-sm">
        {t('readback')}
        <textarea
          value={readback}
          onChange={(e) => setReadback(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-md border border-neutral-300 bg-transparent p-2 dark:border-neutral-700"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={alter}>
          {t('alter')}
        </Button>
        <Button onClick={() => check.mutate({ sent, readback })} disabled={check.isPending}>
          {t('check')}
        </Button>
      </div>
      {check.isError && <p role="alert">{t('error')}</p>}
      {check.data && (
        <p
          data-testid="teachback-result"
          role="status"
          className={check.data.match ? 'font-medium text-green-700' : 'font-medium text-red-700'}
        >
          {check.data.match ? t('matches') : t('caught')}
        </p>
      )}
    </section>
  )
}
