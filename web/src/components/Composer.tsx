import { Send } from 'lucide-react'
import { useId, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { Sample } from '@/api'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const CATEGORIES = ['all', 'flood', 'boats', 'supply', 'medical'] as const

export function Composer({
  text,
  onText,
  onSend,
  samples,
  busy,
}: {
  text: string
  onText: (t: string) => void
  onSend: () => void
  samples: Sample[]
  busy: boolean
}) {
  const { t } = useTranslation()
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>('all')
  const id = useId()
  const shown = samples.filter((s) => cat === 'all' || s.category === cat).slice(0, 4)

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && text.trim()) onSend()
  }

  return (
    <section aria-labelledby={`${id}-h`} className="rounded-xl border bg-card p-5 shadow-card">
      <h2 id={`${id}-h`} className="text-lg font-semibold">
        {t('composer.title')}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{t('composer.hint')}</p>

      <div className="mt-4">
        <p className="mb-2 text-sm font-medium">{t('composer.examples')}</p>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('composer.examples')}>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={cat === c}
              onClick={() => setCat(c)}
              className={cn(
                'min-h-9 cursor-pointer rounded-full border px-3 text-sm transition-colors',
                cat === c ? 'border-foreground bg-foreground text-background' : 'hover:bg-muted',
              )}
            >
              {t(`composer.${c}`)}
            </button>
          ))}
        </div>
        <ul className="mt-2 space-y-1.5">
          {shown.map((s, i) => (
            <li key={s.id} className={i >= 2 ? 'hidden sm:block' : undefined}>
              <button
                type="button"
                onClick={() => onText(s.text)}
                className={cn(
                  'w-full cursor-pointer rounded-lg border px-3 py-2 text-left text-sm leading-snug transition-colors hover:bg-muted',
                  s.text === text && 'border-foreground bg-muted',
                )}
              >
                {s.text}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <label htmlFor={`${id}-t`} className="sr-only">
        {t('composer.title')}
      </label>
      <textarea
        id={`${id}-t`}
        aria-describedby={`${id}-hint`}
        value={text}
        onChange={(e) => onText(e.target.value)}
        onKeyDown={onKey}
        rows={4}
        maxLength={600}
        placeholder={t('composer.placeholder')}
        className="mt-4 w-full resize-y rounded-lg border bg-background p-3 leading-relaxed"
      />
      <div id={`${id}-hint`} className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
        <span className="num">{t('composer.chars', { n: text.length })}</span>
        <kbd className="num rounded border px-1.5 py-0.5">Ctrl + Enter</kbd>
      </div>
      <Button className="mt-4 h-11 w-full cursor-pointer text-base" onClick={onSend} disabled={!text.trim() || busy}>
        <Send className="size-4" aria-hidden />
        {t('composer.send')}
      </Button>
    </section>
  )
}
