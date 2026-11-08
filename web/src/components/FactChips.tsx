import { Check, Clock, Hash, MapPin, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Facts, Lang } from '@/api'
import { factList, type FactKind } from '@/labels'
import { cn } from '@/lib/utils'

const ICON: Record<FactKind, typeof MapPin> = { place: MapPin, number: Hash, time: Clock }

/** The facts of a message as chips. With `received`, each chip shows whether it arrived correctly. */
export function FactChips({
  truth,
  received,
  lang,
}: {
  truth: Facts
  received?: Facts | null
  lang: Lang
}) {
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
    <ul className="flex flex-wrap gap-1.5">
      {chips.map((c) => {
        const Icon = ICON[c.kind]
        return (
          <li
            key={`${c.state}-${c.key}`}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm',
              c.state === 'plain' && 'bg-secondary',
              c.state === 'ok' && 'border-tier-c/40 bg-tier-c-soft',
              c.state === 'missing' && 'border-dashed border-border text-muted-foreground',
              c.state === 'wrong' && 'border-bad/40 bg-bad-soft text-bad',
            )}
          >
            <Icon className="size-3.5 opacity-70" aria-hidden />
            <span>{c.label}</span>
            {c.state === 'ok' && <Check className="size-3.5 text-ok" aria-label="ok" />}
            {c.state === 'missing' && <span className="text-xs">{t('facts.missing')}</span>}
            {c.state === 'wrong' && (
              <>
                <X className="size-3.5" aria-hidden />
                <span className="text-xs">{t('facts.wrong')}</span>
              </>
            )}
          </li>
        )
      })}
    </ul>
  )
}
