import { m } from 'motion/react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { Tier } from '@/data/types'
import { cn } from '@/lib/utils'

const INK: Record<Tier, string> = { A: 'text-tier-a', B: 'text-tier-b', C: 'text-tier-c' }

/** A tier as a perforated postage stamp. The chosen stamp gets a cancellation ring (layoutId). */
export function StampCard({
  tier,
  chosen,
  children,
  testId,
}: {
  tier: Tier
  chosen?: boolean
  children?: ReactNode
  testId?: string
}) {
  const { t } = useTranslation()
  return (
    <article data-testid={testId} aria-current={chosen || undefined} className="relative">
      <div className="stamp h-full shadow-[0_1px_0_var(--rule)]">
        <div className="flex h-full flex-col gap-3 border border-ink/70 p-4">
          <header className="flex items-start justify-between gap-3">
            <div>
              <p className={cn('display text-4xl', INK[tier])}>{tier}</p>
              <h3 className="mt-1 text-lg font-semibold leading-snug">{t(`tier.${tier}.name`)}</h3>
            </div>
            {chosen && (
              <m.span
                layoutId="cancel-ring"
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                className="num grid size-16 shrink-0 rotate-[-12deg] place-items-center rounded-full border-2 border-vermilion text-center text-[0.6rem] leading-tight text-vermilion"
              >
                SENT
                <br />
                TINYTALK
              </m.span>
            )}
          </header>
          <p className="text-[0.95rem] text-muted">{t(`tier.${tier}.desc`)}</p>
          {children}
        </div>
      </div>
    </article>
  )
}
