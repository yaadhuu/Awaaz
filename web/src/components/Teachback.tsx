import { useMutation } from '@tanstack/react-query'
import { CheckCircle2, RotateCcw, ShieldAlert } from 'lucide-react'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { postTeachback, type Facts, type Lang } from '@/api'
import { FactChips } from '@/components/FactChips'
import { Button } from '@/components/ui/button'
import { diffLabel } from '@/labels'
import { cn } from '@/lib/utils'

/** The receiver says the facts back; a changed number must be caught. Remount (key) on a new message. */
export function Teachback({ sent, facts, lang }: { sent: string; facts: Facts; lang: Lang }) {
  const { t } = useTranslation()
  const id = useId()
  const [readback, setReadback] = useState(sent)
  const check = useMutation({ mutationFn: postTeachback })

  const alter = () => {
    setReadback((r) => r.replace(/\d+/, (m) => String(Number(m) + 1)))
    check.reset()
  }
  const reset = () => {
    setReadback(sent)
    check.reset()
  }
  const res = check.data

  return (
    <section aria-labelledby={`${id}-h`} className="rounded-xl border bg-card p-5 shadow-card">
      <h2 id={`${id}-h`} className="text-lg font-semibold">
        {t('teach.title')}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{t('teach.desc')}</p>

      <div className="mt-4 grid gap-5 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-sm font-medium">{t('teach.sent')}</p>
          <FactChips truth={facts} lang={lang} />
        </div>
        <div>
          <label htmlFor={`${id}-r`} className="mb-1.5 block text-sm font-medium">
            {t('teach.readback')}
          </label>
          <textarea
            id={`${id}-r`}
            value={readback}
            onChange={(e) => {
              setReadback(e.target.value)
              check.reset()
            }}
            rows={3}
            className="w-full resize-y rounded-lg border bg-background p-3 leading-relaxed"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <Button variant="outline" className="h-10 cursor-pointer" onClick={alter}>
              {t('teach.alter')}
            </Button>
            <Button variant="ghost" className="h-10 cursor-pointer" onClick={reset}>
              <RotateCcw className="size-4" aria-hidden />
              {t('teach.reset')}
            </Button>
            <Button
              className="h-10 cursor-pointer"
              onClick={() => check.mutate({ sent, readback })}
              disabled={check.isPending || !readback.trim()}
            >
              {t('teach.check')}
            </Button>
          </div>
        </div>
      </div>

      <div aria-live="polite" className="mt-4">
        {check.isError && <p role="alert">{t('state.error')}</p>}
        {res && (
          <div
            data-testid="teachback-result"
            className={cn(
              'flex gap-3 rounded-lg border p-4',
              res.match ? 'border-tier-c/40 bg-tier-c-soft' : 'border-bad/40 bg-bad-soft',
            )}
          >
            {res.match ? (
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-ok" aria-hidden />
            ) : (
              <ShieldAlert className="mt-0.5 size-5 shrink-0 text-bad" aria-hidden />
            )}
            <div className="space-y-1">
              <p className="font-semibold">{res.match ? t('teach.match') : t('teach.caught')}</p>
              {!res.match && (
                <p className="text-sm">
                  {res.missing.length > 0 && (
                    <span>
                      {t('teach.missing')}: {res.missing.map(([k, v]) => diffLabel(k, v, lang)).join(', ')}.{' '}
                    </span>
                  )}
                  {res.wrong.length > 0 && (
                    <span>
                      {t('teach.wrong')}: {res.wrong.map(([k, v]) => diffLabel(k, v, lang)).join(', ')}.
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
