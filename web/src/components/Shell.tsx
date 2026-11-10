import { AnimatePresence, m, useReducedMotion } from 'motion/react'
import { useEffect, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Segmented } from '@/components/Segmented'
import { source } from '@/data/source'
import type { Lang } from '@/data/types'
import { tone } from '@/lib/credits'
import { useUsageSummary } from '@/lib/useData'
import { cn } from '@/lib/utils'
import '@/pages/story.css'
import { useSmoothScroll } from '@/lib/useSmoothScroll'

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
  const q = useUsageSummary()
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
  const reduce = useReducedMotion()
  const isLanding = loc.pathname === '/'
  useSmoothScroll(isLanding)
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [loc.pathname])
  return (
    <div lang={lang} className="min-h-screen">
      <a href="#main" onClick={(event) => { event.preventDefault(); const main = document.getElementById('main'); main?.focus({ preventScroll: true }); main?.scrollIntoView({ behavior: 'instant' }) }} className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:bg-ink focus:p-2 focus:text-paper">{t('skip')}</a>
      <header className="aw-site-header" lang="en">
        <div className="aw-header-inner aw-wrap">
          <Link to="/" className="aw-brand" aria-label="Awaaz home">
            <svg className="aw-brand-symbol" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M3 18h4l3-10 5 17 5-20 4 17 3-9h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span className="aw-wordmark">awaaz</span><span className="aw-brand-language" lang="hi">आवाज़</span>
          </Link>
          <nav aria-label="Main" className="aw-main-nav">
            <NavLink to="/" end>The story</NavLink>
            <NavLink to="/inspect">Behind the signal</NavLink>
            <NavLink to="/try" className="aw-nav-cta">Try Awaaz <span aria-hidden="true">↗</span></NavLink>
          </nav>
        </div>
        {!isLanding && <div className="aw-tool-bar aw-wrap">
          <span>{loc.pathname === '/try' ? 'Voice workspace · 10 speech languages · live availability shown below' : source.kind === 'api' ? 'Live edition · Gnani-powered speech' : 'Saved research examples · no model calls on this page'}</span>
          {loc.pathname !== '/try' && <Segmented label={t('lang')} value={lang} options={LANGS} onChange={onLang} className="[&_button]:font-[system-ui]" />}
          <details><summary>Explore the tools</summary><nav className="aw-tool-menu" aria-label="Tools">{PAGES.map((p) => <NavLink key={p} to={`/${p}`}>{t(`nav.${p}`)}</NavLink>)}</nav></details>
        </div>}
      </header>
      <main id="main" tabIndex={-1} className={isLanding ? '' : 'aw-page-main'}>
        <AnimatePresence mode="wait" initial={false}>
          <m.div key={loc.pathname} initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={reduce ? undefined : { opacity: 0 }} transition={{ duration: reduce ? 0 : 0.18 }}>{children}</m.div>
        </AnimatePresence>
      </main>
      <footer className="aw-site-footer" lang="en"><div className="aw-wrap">
        <div className="aw-footer-top"><Link to="/" className="aw-brand" aria-label="Awaaz home"><span className="aw-wordmark">awaaz</span></Link><p>Every voice deserves to reach.</p><a href="https://github.com/yaadhuu/Gnani_Hackathon" target="_blank" rel="noreferrer" className="aw-text-link">Made with care, in India <span aria-hidden="true">↗</span></a></div>
        <div className="aw-footer-bottom"><p>An experimental prototype powered by Gnani Prisma & Timbre. Link conditions are simulated. Benchmark speech is synthetic; no real-radio validation is claimed.</p><Link to="/how">The method & the limits</Link><span>© 2026 Awaaz</span></div>
      </div></footer>
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
