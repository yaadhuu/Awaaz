import { AnimatePresence, m } from 'motion/react'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Segmented } from '@/components/Segmented'
import { source } from '@/data/source'
import type { Lang } from '@/data/types'
import { tone } from '@/lib/credits'
import { useUsage } from '@/lib/useData'
import { cn } from '@/lib/utils'

const LANGS: { value: Lang; label: string }[] = [
  { value: 'ml', label: 'മലയാളം' },
  { value: 'hi', label: 'हिन्दी' },
  { value: 'en', label: 'English' },
]
const PAGES = ['studio', 'link', 'teachback', 'results', 'playground', 'usage', 'library', 'about'] as const

export function Mark({ className }: { className?: string }) {
  // Three rules, long to short: audio, transcript, facts. Gold underline as the kasavu edge.
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect x="3" y="7" width="26" height="3.4" fill="var(--tier-a)" />
      <rect x="3" y="13.5" width="16" height="3.4" fill="var(--tier-b)" />
      <rect x="3" y="20" width="7" height="3.4" fill="var(--tier-c)" />
      <rect x="3" y="26" width="26" height="1" fill="var(--gold)" />
    </svg>
  )
}

export function CreditMeter() {
  const { t } = useTranslation()
  const q = useUsage()
  if (!q.data) return <span className="num text-xs text-muted">{q.isError ? '—' : '…'}</span>
  const u = q.data
  const share = Math.min(1, u.share)
  const level = tone(u.level)
  const label = u.unit === 'calls' ? t('meter.calls', { used: u.used ?? 0, cap: u.cap }) : t('meter.credits', { used: Math.round(u.used ?? 0), cap: u.cap })
  return (
    <Link to="/usage" className="group block min-w-44 no-underline" aria-label={`${t('meter.title')}: ${label}`}>
      <span className="flex items-baseline justify-between gap-3 text-xs">
        <span className="font-semibold">
          {t('meter.title')} <span className="text-muted">· {u.live ? t('meter.live') : t('meter.snapshot')}</span>
        </span>
        <span className="num">{label}</span>
      </span>
      <span className="mt-1 block h-1.5 w-full bg-rule" aria-hidden>
        <span
          className={cn('block h-full', level === 'ok' ? 'bg-teal' : level === 'warn' ? 'bg-turmeric' : 'bg-vermilion')}
          style={{ width: `${share * 100}%` }}
        />
      </span>
      <span className="num mt-0.5 block text-[0.7rem] text-muted">
        {u.remaining_credits !== null ? t('meter.remaining', { n: Math.round(u.remaining_credits) }) : t('meter.noRate')}
        {u.level !== 'ok' && <span className={level === 'stop' ? 'text-vermilion' : 'text-turmeric-ink'}> · {t(`meter.${u.level}`)}</span>}
      </span>
    </Link>
  )
}

export function Shell({ lang, onLang, children }: { lang: Lang; onLang: (l: Lang) => void; children: ReactNode }) {
  const { t } = useTranslation()
  const loc = useLocation()
  const [open, setOpen] = useState(false)
  const nav = (
    <ul className="flex flex-col gap-1 lg:flex-row lg:flex-wrap lg:gap-x-5">
      {PAGES.map((p) => (
        <li key={p}>
          <NavLink
            to={`/${p}`}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              cn('inline-block py-1.5 no-underline lg:py-0.5', isActive ? 'border-b-2 border-vermilion font-semibold' : 'hover:underline')
            }
          >
            {t(`nav.${p}`)}
          </NavLink>
        </li>
      ))}
    </ul>
  )
  return (
    <div lang={lang} className="min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:bg-ink focus:p-2 focus:text-paper">
        {t('skip')}
      </a>
      <p className="border-b border-gold bg-ink px-4 py-1.5 text-center text-[0.8rem] text-paper">
        {source.kind === 'api' ? t('mode.live') : t('mode.replay')}
      </p>
      <header className="mx-auto max-w-6xl px-4 pt-5 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 border-b-[1.5px] border-ink pb-4">
          <Link to="/" className="flex items-center gap-2 no-underline" aria-label="TinyTalk">
            <Mark className="size-9" />
            <span className="display text-[1.7rem]" lang="en">
              TinyTalk
            </span>
          </Link>
          <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
            <Segmented label={t('lang')} value={lang} options={LANGS} onChange={onLang} />
            <CreditMeter />
          </div>
        </div>
        <nav aria-label="Main" className="border-b border-rule py-2 text-[0.95rem]">
          <button
            type="button"
            className="btn btn-ghost min-h-10 lg:hidden"
            aria-expanded={open}
            aria-controls="nav-list"
            onClick={() => setOpen((o) => !o)}
          >
            {t('nav.menu')}
          </button>
          <div id="nav-list" className={cn(open ? 'block' : 'hidden', 'pt-2 lg:block lg:pt-0')}>
            {nav}
          </div>
        </nav>
      </header>
      <main id="main" className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
        <AnimatePresence mode="wait" initial={false}>
          <m.div
            key={loc.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </m.div>
        </AnimatePresence>
      </main>
      <footer className="mx-auto max-w-6xl border-t-[1.5px] border-ink px-4 py-6 text-sm text-muted sm:px-6">
        <p>{t('footer.simulated')}</p>
        <p className="mt-1">{t('footer.licence')}</p>
      </footer>
    </div>
  )
}

/** Page title block: a numbered manual section with a kasavu rule underneath. */
export function PageHead({ no, title, lede }: { no: string; title: string; lede?: string }) {
  return (
    <header className="mb-8 max-w-3xl">
      <p className="eyebrow-num">§ {no}</p>
      <h1 className="display mt-1 text-[clamp(2.2rem,6vw,3.6rem)]">{title}</h1>
      <div className="mt-3 h-[3px] w-24 border-y border-gold" aria-hidden />
      {lede && <p className="mt-4 text-lg">{lede}</p>}
    </header>
  )
}
