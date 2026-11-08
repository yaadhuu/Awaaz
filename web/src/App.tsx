import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useReducedMotion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getSamples, postSend, type Lang } from '@/api'
import { Composer } from '@/components/Composer'
import { Evidence } from '@/components/Evidence'
import { Header } from '@/components/Header'
import { HowItWorks } from '@/components/HowItWorks'
import { LinkControls } from '@/components/LinkControls'
import { Teachback } from '@/components/Teachback'
import { Verdict } from '@/components/Verdict'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/lib/useTheme'

function App() {
  const { t, i18n } = useTranslation()
  const { theme, toggle } = useTheme()
  const reduceMotion = useReducedMotion() ?? false

  const [lang, setLang] = useState<Lang>('en')
  // null = untouched: the first example of the language is shown and sent, so the page is never empty.
  const [typed, setTyped] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState<string | null>(null)
  const [rate, setRate] = useState(5)
  const [loss, setLoss] = useState(0)

  const samples = useQuery({ queryKey: ['samples', lang], queryFn: () => getSamples(lang) })

  const first = samples.data?.[0]?.text ?? ''
  const text = typed ?? first
  const sent = submitted ?? first

  const pick = (next: Lang) => {
    setLang(next)
    void i18n.changeLanguage(next)
    setTyped(null)
    setSubmitted(null)
  }

  // The link settings re-send the same message at once, so the effect of the link is visible.
  const result = useQuery({
    queryKey: ['send', sent, lang, rate, loss],
    queryFn: () => postSend({ text: sent, lang, rate_kbps: rate, loss_percent: loss }),
    enabled: sent.trim() !== '',
    placeholderData: keepPreviousData,
    retry: false,
  })

  const data = result.data

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 pt-6 pb-24 sm:px-6 sm:pt-8 lg:pb-8">
      <Header lang={lang} onLang={pick} dark={theme === 'dark'} onTheme={toggle} />

      <main className="space-y-8">
        <h1 className="max-w-3xl text-balance text-3xl font-semibold tracking-tight sm:text-4xl">{t('tagline')}</h1>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
          <div className="space-y-4 lg:sticky lg:top-6">
            <Composer
              text={text}
              onText={setTyped}
              onSend={() => setSubmitted(text)}
              samples={samples.data ?? []}
              busy={result.isFetching}
            />
            <LinkControls rate={rate} loss={loss} onRate={setRate} onLoss={setLoss} />
          </div>

          <div id="results" className="scroll-mt-4 space-y-6" aria-busy={result.isFetching}>
            {result.isError && (
              <div role="alert" className="flex items-center justify-between gap-4 rounded-xl border border-bad/40 bg-bad-soft p-4">
                <p>{t('state.error')}</p>
                <Button variant="outline" className="cursor-pointer" onClick={() => void result.refetch()}>
                  {t('state.retry')}
                </Button>
              </div>
            )}
            {!data && result.isFetching && (
              <p className="flex items-center gap-2 text-muted-foreground" role="status">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                {t('state.loading')}
              </p>
            )}
            {data && (
              <div className={result.isPlaceholderData ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
                <Verdict result={data} lang={lang} rate={rate} loss={loss} reduceMotion={reduceMotion} />
              </div>
            )}
            {data && <Teachback key={sent} sent={sent} facts={data.facts_sent} lang={lang} />}
          </div>
        </div>

        <Evidence lang={lang} />
        <HowItWorks />
      </main>

      {data && (
        <a
          href="#results"
          className="fixed inset-x-3 bottom-3 z-10 flex items-center justify-between gap-3 rounded-xl border bg-card p-3 shadow-card lg:hidden"
        >
          <span className="font-semibold">
            {data.chosen} · {t(`tier.${data.chosen}.name`)}
          </span>
          <span className="num text-sm text-muted-foreground">
            {data.tiers.find((x) => x.tier === data.chosen)?.bytes_sent.toLocaleString()} B · {t('verdict.jump')}
          </span>
        </a>
      )}

      <footer className="border-t pt-4 text-sm text-muted-foreground">{t('footer')}</footer>
    </div>
  )
}

export default App
