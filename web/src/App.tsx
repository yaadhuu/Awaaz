import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getSamples, postSend, type Lang } from '@/api'
import { CurveChart } from '@/components/CurveChart'
import { Teachback } from '@/components/Teachback'
import { TierTable } from '@/components/TierTable'
import { Button } from '@/components/ui/button'

const LANGS: { code: Lang; name: string }[] = [
  { code: 'ml', name: 'മലയാളം' },
  { code: 'hi', name: 'हिन्दी' },
  { code: 'en', name: 'English' },
]

function App() {
  const { t, i18n } = useTranslation()
  const [lang, setLang] = useState<Lang>('en')
  const [text, setText] = useState('')
  const [rate, setRate] = useState(5)
  const [loss, setLoss] = useState(0)

  const samples = useQuery({ queryKey: ['samples', lang], queryFn: () => getSamples(lang) })
  const send = useMutation({ mutationFn: postSend })

  const run = (over: { rate?: number; loss?: number } = {}) => {
    if (text.trim())
      send.mutate({ text, lang, rate_kbps: over.rate ?? rate, loss_percent: over.loss ?? loss })
  }

  const pickLang = (code: Lang) => {
    setLang(code)
    setText('')
    send.reset()
    void i18n.changeLanguage(code)
  }

  return (
    <main className="mx-auto max-w-4xl space-y-8 p-4 text-neutral-900 sm:p-8 dark:text-neutral-100">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">TinyTalk</h1>
        <p>{t('subtitle')}</p>
        <div className="flex gap-2" role="group" aria-label="Language">
          {LANGS.map((l) => (
            <Button
              key={l.code}
              variant={l.code === lang ? 'default' : 'outline'}
              onClick={() => pickLang(l.code)}
              aria-pressed={l.code === lang}
            >
              {l.name}
            </Button>
          ))}
        </div>
      </header>

      <section className="space-y-3">
        <label className="block text-sm font-medium">
          {t('sample')}
          <select
            className="mt-1 block w-full rounded-md border border-neutral-300 bg-transparent p-2 dark:border-neutral-700 dark:bg-neutral-900"
            value=""
            onChange={(e) => {
              setText(e.target.value)
              send.reset()
            }}
            disabled={!samples.data}
          >
            <option value="">{samples.isError ? t('error') : '…'}</option>
            {samples.data?.slice(0, 12).map((s) => (
              <option key={s.id} value={s.text}>
                {s.text}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium">
          {t('message')}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-md border border-neutral-300 bg-transparent p-2 dark:border-neutral-700"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium">
            {t('rate')}: {rate} kbps
            <input
              type="range" min={2} max={10} step={1} value={rate} className="block w-full"
              onChange={(e) => { setRate(Number(e.target.value)); run({ rate: Number(e.target.value) }) }}
            />
          </label>
          <label className="block text-sm font-medium">
            {t('loss')}: {loss}%
            <input
              type="range" min={0} max={30} step={10} value={loss} className="block w-full"
              onChange={(e) => { setLoss(Number(e.target.value)); run({ loss: Number(e.target.value) }) }}
            />
          </label>
        </div>
        <Button onClick={() => run()} disabled={!text.trim() || send.isPending}>
          {t('send')}
        </Button>
        <p className="text-xs">{t('note')}</p>
      </section>

      {send.isPending && <p role="status">{t('loading')}</p>}
      {send.isError && <p role="alert">{t('error')}</p>}
      {!send.data && !send.isPending && !send.isError && <p>{t('empty')}</p>}
      {send.data && (
        <>
          <TierTable result={send.data} />
          <Teachback key={text} sent={text} />
        </>
      )}
      <CurveChart lang={lang} />
    </main>
  )
}

export default App
