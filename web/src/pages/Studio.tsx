import { useMutation, useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { FactChips } from '@/components/FactChips'
import { LinkPanel } from '@/components/LinkPanel'
import { AccessCode, CallReport, useLiveCall } from '@/components/LiveCall'
import { PacketStrip } from '@/components/PacketStrip'
import { PageHead } from '@/components/Shell'
import { StampCard } from '@/components/StampCard'
import { Await, Failure, Loading } from '@/components/States'
import { source } from '@/data/source'
import type { Facts, Lang, Sample, SendResponse, Studio as StudioData, Tier } from '@/data/types'
import { factList } from '@/labels'
import { useStudio } from '@/lib/useData'
import { cn } from '@/lib/utils'

const base = import.meta.env.BASE_URL

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <li className="grid gap-3 border-t border-rule py-5 sm:grid-cols-[3.5rem_1fr]">
      <span className="num text-2xl text-vermilion" aria-hidden>
        {String(n).padStart(2, '0')}
      </span>
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        <div className="mt-2">{children}</div>
      </div>
    </li>
  )
}

/** The transcript with the words that carry facts marked, so the reader sees what was extracted. */
function Highlighted({ text, facts, lang }: { text: string; facts: Facts; lang: Lang }) {
  const words = factList(facts, lang)
    .flatMap((f) => f.label.split(' '))
    .filter((w) => w.length > 1 || /\d/.test(w))
  if (!words.length) return <span>{text}</span>
  const re = new RegExp(`(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g')
  return (
    <span>
      {text.split(re).map((part, i) =>
        words.includes(part) ? (
          <mark key={i} className="bg-[#f0d9a8] px-0.5 text-ink">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </span>
  )
}

/** Recorder for the live edition: microphone to a WebM clip, stops itself at 30 seconds. */
function Recorder({ onClip }: { onClip: (blob: Blob) => void }) {
  const { t } = useTranslation()
  const [on, setOn] = useState(false)
  const [error, setError] = useState('')
  const rec = useRef<MediaRecorder | null>(null)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const start = async () => {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const r = new MediaRecorder(stream)
      const chunks: Blob[] = []
      r.ondataavailable = (e) => chunks.push(e.data)
      r.onstop = () => {
        stream.getTracks().forEach((tr) => tr.stop())
        setOn(false)
        onClip(new Blob(chunks, { type: r.mimeType.split(';')[0] || 'audio/webm' }))
      }
      r.start()
      rec.current = r
      setOn(true)
      timer.current = window.setTimeout(() => r.state === 'recording' && r.stop(), 30_000)
    } catch (e) {
      setError(String(e))
    }
  }
  return (
    <div>
      <button type="button" className={cn('btn', on && 'bg-vermilion')} onClick={() => (on ? rec.current?.stop() : void start())}>
        {on ? t('studio.stopRec') : t('studio.record')}
      </button>
      <p className="mt-1 text-sm text-muted" role="status">
        {on ? t('studio.recording') : t('studio.recordHint')}
      </p>
      {error && <p className="text-sm text-vermilion">{error}</p>}
    </div>
  )
}

function Flow({
  data,
  lang,
  sample,
  text,
  heard,
  rate,
  loss,
  run,
  isPending,
  error,
}: {
  data: StudioData
  lang: Lang
  sample?: Sample
  text: string
  heard: string | null
  rate: number
  loss: number
  run?: SendResponse
  isPending: boolean
  error: unknown
}) {
  const { t } = useTranslation()
  const speakCall = useLiveCall()
  const [spoken, setSpoken] = useState('')
  if (isPending) return <Loading />
  if (error || !run) return <Failure error={error} />
  const chosen = run.tiers.find((x) => x.tier === run.chosen)!
  const audio = sample ? data.audio[sample.id] : undefined
  const measured = sample ? data.measured[sample.id]?.find((m) => m.tier === run.chosen && m.loss === loss) : undefined
  const why = run.chosen === 'A' ? 'A' : run.chosen === 'C' ? 'C' : loss > 10 ? 'Bloss' : 'Brate'
  const factsText = factList(run.facts_sent, lang).map((f) => f.label).join(', ')

  const speak = async () => {
    const out = await speakCall.run('tts', factsText.length, (confirm) =>
      source.tts({ text: factsText, language: `${lang}-IN`, voice: 'Vasudha', speed: 0.85, confirm }),
    )
    if (out) setSpoken(`data:${out.content_type};base64,${out.audio_b64}`)
  }

  return (
    <ol>
      <Step n={1} title={t('studio.steps.record')}>
        {audio ? <audio controls preload="none" src={`${base}${audio.original}`} className="w-full max-w-md" /> : <p className="text-muted">—</p>}
      </Step>
      <Step n={2} title={t('studio.steps.transcribe')}>
        <p className="text-sm text-muted">{t('studio.heard')}</p>
        <p lang={lang} className="mt-1 text-lg">
          <Highlighted text={heard ?? text} facts={run.facts_sent} lang={lang} />
        </p>
      </Step>
      <Step n={3} title={t('studio.steps.facts')}>
        <FactChips truth={run.facts_sent} lang={lang} />
      </Step>
      <Step n={4} title={t('studio.steps.pick')}>
        <p>
          <strong className="display text-2xl">
            {run.chosen} · {t(`tier.${run.chosen}.name`)}
          </strong>
        </p>
        <p className="mt-1">{t(`why.${why}`)}</p>
      </Step>
      <Step n={5} title={t('studio.steps.pack')}>
        <table className="table-ruled num max-w-md">
          <tbody>
            {run.tiers.map((r) => (
              <tr key={r.tier} className={r.tier === run.chosen ? 'font-semibold' : ''}>
                <th scope="row">
                  {r.tier} · <span className="font-sans">{t(`tier.${r.tier}.name`)}</span>
                </th>
                <td>
                  {r.payload_bytes.toLocaleString()} {t('studio.bytes')}
                  {r.estimated && ' ~'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Step>
      <Step n={6} title={t('studio.steps.send')}>
        <div className="grid gap-4 md:grid-cols-3">
          {run.tiers.map((r) => (
            <StampCard key={r.tier} tier={r.tier as Tier} chosen={r.tier === run.chosen} testId={`studio-tier-${r.tier}`}>
              <p className="num">
                {r.bytes_sent.toLocaleString()} B · {r.airtime_s.toFixed(2)} s @ {rate} kbps
              </p>
              <PacketStrip states={r.packet_states} tier={r.tier as Tier} />
            </StampCard>
          ))}
        </div>
      </Step>
      <Step n={7} title={t('studio.steps.receive')}>
        {run.chosen === 'A' && (
          <>
            <p>{t('studio.receivedA')}</p>
            {audio?.[`A${loss}`] && <audio controls preload="none" src={`${base}${audio[`A${loss}`]}`} className="mt-2 w-full max-w-md" />}
          </>
        )}
        {run.chosen === 'B' && (
          <>
            <p>{t('studio.receivedB')}</p>
            <p lang={lang} className="mt-2 border-l-2 border-tier-b pl-3 text-lg">
              {chosen.delivered ? (heard ?? text) : '—'}
            </p>
          </>
        )}
        {run.chosen === 'C' && <p>{t('studio.receivedC')}</p>}
        {chosen.facts_received && (
          <div className="mt-3">
            <FactChips truth={run.facts_sent} received={chosen.facts_received} lang={lang} />
          </div>
        )}
        {measured && (
          <p className="num mt-3 text-sm text-muted">
            {t('studio.measured', { m: measured.matched, t: measured.total })}
          </p>
        )}
      </Step>
      <Step n={8} title={t('studio.steps.speak')}>
        <p lang={lang} className="text-lg">
          {factsText}
        </p>
        {source.kind === 'api' ? (
          <div className="mt-2 space-y-2">
            <button type="button" className="btn" onClick={() => void speak()} disabled={speakCall.busy}>
              {t('studio.speak')}
            </button>
            {spoken && <audio controls autoPlay src={spoken} className="w-full max-w-md" />}
            <CallReport call={speakCall} />
          </div>
        ) : (
          <p className="mt-1 text-sm text-muted">{t('studio.speakReplay')}</p>
        )}
      </Step>
    </ol>
  )
}

export default function Studio({ lang }: { lang: Lang }) {
  const { t } = useTranslation()
  const studio = useStudio()
  const [pickedId, setPickedId] = useState<string | null>(null)
  const [rate, setRate] = useState(5)
  const [loss, setLoss] = useState(0)
  const [typed, setTyped] = useState('')
  const [liveText, setLiveText] = useState<string | null>(null)
  const sttCall = useLiveCall()

  const samples = studio.data ? studio.data.samples[lang].filter((s) => studio.data!.audio[s.id]) : []
  const sample = samples.find((s) => s.id === pickedId) ?? samples[0]
  const text = liveText ?? sample?.text ?? ''

  const run = useQuery({
    queryKey: ['send', liveText ? 'live' : sample?.id, text, lang, rate, loss],
    queryFn: () => source.send({ id: liveText ? undefined : sample?.id, text, lang, rate_kbps: rate, loss_percent: loss }),
    enabled: !!text,
    placeholderData: (prev) => prev,
    retry: false,
  })

  const transcribe = useMutation({
    mutationFn: async (blob: Blob) => {
      const form = new FormData()
      form.append('audio_file', blob, 'clip.webm')
      form.append('language_code', `${lang}-IN`)
      form.append('format', 'transcribe')
      const out = await sttCall.run('stt', 30, (confirm) => {
        form.set('confirm', String(confirm))
        return source.stt(form)
      })
      if (out) setLiveText(out.result.transcript)
    },
  })

  return (
    <div>
      <PageHead no="2" title={t('studio.title')} lede={t('studio.lede')} />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,24rem)_1fr]">
        <aside className="space-y-6">
          <fieldset>
            <legend className="text-sm font-semibold">{t('studio.pick')}</legend>
            <Await q={studio}>
              {() => (
                <ul className="mt-2 space-y-2" lang={lang}>
                  {samples.map((s) => (
                    <li key={s.id}>
                      <label className={cn('block cursor-pointer border p-3 leading-snug', s.id === sample?.id && !liveText ? 'border-ink bg-card' : 'border-rule')}>
                        <input
                          type="radio"
                          name="msg"
                          className="sr-only"
                          checked={s.id === sample?.id && !liveText}
                          onChange={() => {
                            setPickedId(s.id)
                            setLiveText(null)
                          }}
                        />
                        <span className="num mr-2 text-xs text-muted">{s.category}</span>
                        {s.text}
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </Await>
          </fieldset>
          {source.kind === 'api' ? (
            <div className="space-y-3 border-t border-rule pt-4">
              <AccessCode />
              <Recorder onClip={(b) => transcribe.mutate(b)} />
              <CallReport call={sttCall} />
              <label className="block text-sm font-semibold">
                {t('studio.typeOwn')}
                <textarea className="field mt-1" rows={3} maxLength={600} value={typed} onChange={(e) => setTyped(e.target.value)} lang={lang} />
              </label>
              <button type="button" className="btn btn-ghost" disabled={!typed.trim()} onClick={() => setLiveText(typed)}>
                {t('studio.steps.send')}
              </button>
            </div>
          ) : (
            <p className="text-sm text-muted">{t('common.replayOnly')} {t('studio.record')} · {t('studio.typeOwn')}</p>
          )}
          <LinkPanel rate={rate} loss={loss} onRate={setRate} onLoss={setLoss} compact />
        </aside>
        <section aria-label={t('studio.title')} aria-busy={run.isFetching}>
          {studio.data && (
            <Flow
              data={studio.data}
              lang={lang}
              sample={liveText ? undefined : sample}
              text={text}
              heard={liveText ?? (sample ? studio.data.heard[sample.id] : null)}
              rate={rate}
              loss={loss}
              run={run.data}
              isPending={run.isPending}
              error={run.error}
            />
          )}
        </section>
      </div>
    </div>
  )
}
