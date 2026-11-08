import { Moon, Radio, Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Lang } from '@/api'
import { Segmented } from '@/components/Segmented'

const LANGS: { value: Lang; label: string }[] = [
  { value: 'ml', label: 'മലയാളം' },
  { value: 'hi', label: 'हिन्दी' },
  { value: 'en', label: 'English' },
]

function Mark() {
  // Three bars, long to short: audio, transcript, facts.
  return (
    <svg viewBox="0 0 24 24" className="size-7" aria-hidden>
      <rect x="2" y="4" width="20" height="4" rx="2" style={{ fill: 'var(--tier-a)' }} />
      <rect x="2" y="10" width="12" height="4" rx="2" style={{ fill: 'var(--tier-b)' }} />
      <rect x="2" y="16" width="5" height="4" rx="2" style={{ fill: 'var(--tier-c)' }} />
    </svg>
  )
}

export function Header({
  lang,
  onLang,
  dark,
  onTheme,
}: {
  lang: Lang
  onLang: (l: Lang) => void
  dark: boolean
  onTheme: () => void
}) {
  const { t } = useTranslation()
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
      <div className="flex items-center gap-2.5">
        <Mark />
        <span className="text-lg font-semibold tracking-tight">TinyTalk</span>
        <span className="ml-1 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs text-muted-foreground">
          <Radio className="size-3.5" aria-hidden />
          {t('simulated')}
        </span>
      </div>
      <div className="flex items-end gap-3">
        <Segmented label={t('language')} value={lang} options={LANGS} onChange={onLang} />
        <button
          type="button"
          onClick={onTheme}
          aria-label={dark ? t('theme.light') : t('theme.dark')}
          className="grid size-12 cursor-pointer place-items-center rounded-lg border bg-card text-foreground transition-colors hover:bg-muted"
        >
          {dark ? <Sun className="size-5" aria-hidden /> : <Moon className="size-5" aria-hidden />}
        </button>
      </div>
    </header>
  )
}
