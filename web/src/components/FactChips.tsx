import { useTranslation } from 'react-i18next'
import type { Facts, Lang } from '@/data/types'
import { factList, type FactKind } from '@/labels'
import { cn } from '@/lib/utils'

/** Small typographic marks instead of stock icons: place ◉, number №, time ◷. */
const MARK: Record<FactKind, string> = { place: '◉', number: '№', time: '◷' }

/** The facts of a message as tags. With `received`, each tag shows whether it arrived intact. */
export function FactChips({ truth, received, lang }: { truth: Facts; received?: Facts | null; lang: Lang }) {
  const { t } = useTranslation()
  const sent = factList(truth, lang)
  const got = received ? factList(received, lang) : null
  const gotKeys = new Set(got?.map((f) => f.key))
  const sentKeys = new Set(sent.map((f) => f.key))
  const chips = [
    ...sent.map((f) => ({ ...f, state: got ? (gotKeys.has(f.key) ? 'ok' : 'missing') : 'plain' })),
    ...(got ?? []).filter((f) => !sentKeys.has(f.key)).map((f) => ({ ...f, state: 'wrong' })),
  ]
  return (
    <ul className="flex flex-wrap gap-1.5" lang={lang}>
      {chips.map((c) => (
        <li
          key={`${c.state}-${c.key}`}
          className={cn(
            'inline-flex items-baseline gap-1.5 border px-2 py-0.5 text-[0.95rem]',
            c.state === 'plain' && 'border-ink/30 bg-card',
            c.state === 'ok' && 'border-teal bg-card text-ink',
            c.state === 'missing' && 'border-dashed border-muted text-muted line-through decoration-1',
            c.state === 'wrong' && 'border-vermilion bg-card text-vermilion',
          )}
        >
          <span aria-hidden className="text-xs opacity-70">
            {MARK[c.kind]}
          </span>
          <span>{c.label}</span>
          {c.state === 'ok' && <span className="num text-xs text-teal">✓</span>}
          {c.state === 'missing' && <span className="text-xs no-underline">{t('facts.missing')}</span>}
          {c.state === 'wrong' && <span className="text-xs">{t('facts.wrong')}</span>}
        </li>
      ))}
    </ul>
  )
}
