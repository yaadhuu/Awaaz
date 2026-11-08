import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AccessCode, CallReport, useLiveCall } from '@/components/LiveCall'
import { Segmented } from '@/components/Segmented'
import { PageHead } from '@/components/Shell'
import { Await } from '@/components/States'
import { source } from '@/data/source'
import type { Lang, SttResponse } from '@/data/types'
import { usePlayground, useUsage } from '@/lib/useData'

const base = import.meta.env.BASE_URL
const CODES = ['bn-IN', 'en-IN', 'gu-IN', 'hi-IN', 'kn-IN', 'ml-IN', 'mr-IN', 'pa-IN', 'ta-IN', 'te-IN']
const VOICES = ['Shivani', 'Lakshmi', 'Kalpana', 'Chetana', 'Vasudha', 'Riyaa', 'Tarika', 'Avinash', 'Shubham', 'Prakash', 'Devansh', 'Yashraj', 'Harshad']
const live = source.kind === 'api'

function Result({ r }: { r: SttResponse['result'] }) {
  const { t } = useTranslation()
  return (
    <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <dt className="text-sm text-muted">{t('play.transcript')}</dt>
        <dd className="text-lg">{r.transcript}</dd>
      </div>
      {[
        [t('play.detected'), r.detected_language_code ?? '—'],
        [t('play.processing'), r.processing_time !== undefined ? `${r.processing_time.toFixed(3)} s` : '—'],
        [t('play.latency'), r.end_to_end_latency !== undefined ? `${r.end_to_end_latency.toFixed(3)} s` : '—'],
        [t('play.request'), r.request_id ?? '—'],
      ].map(([k, v]) => (
        <div key={k}>
          <dt className="text-sm text-muted">{k}</dt>
          <dd className="num break-all">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

function Stt() {
  const { t } = useTranslation()
  const call = useLiveCall()
  const fileRef = useRef<HTMLInputElement>(null)
  const [langs, setLangs] = useState<string[]>([])
  const [format, setFormat] = useState('transcribe')
  const [keyterms, setKeyterms] = useState('')
  const [topic, setTopic] = useState('')
  const [out, setOut] = useState<SttResponse | null>(null)
  const [seconds, setSeconds] = useState(0)

  const onFile = async (f: File | undefined) => {
    if (!f) return
    try {
      const ctx = new AudioContext()
      const buf = await ctx.decodeAudioData(await f.arrayBuffer())
      setSeconds(Math.min(30, buf.duration))
      void ctx.close()
    } catch {
      setSeconds(30)
    }
  }
  const submit = async () => {
    const f = fileRef.current?.files?.[0]
    if (!f) return
    const res = await call.run('stt', seconds || 30, (confirm) => {
      const form = new FormData()
      form.append('audio_file', f)
      form.append('language_code', langs.length ? langs.join(',') : 'indic-auto')
      form.append('format', format)
      form.append('keyterms', keyterms)
      form.append('topic', topic)
      form.append('confirm', String(confirm))
      return source.stt(form)
    })
    if (res) setOut(res)
  }
  return (
    <fieldset disabled={!live} className="space-y-4 disabled:opacity-70">
      <label className="block text-sm font-semibold">
        {t('play.upload')}
        <input ref={fileRef} type="file" accept="audio/*" className="field mt-1" onChange={(e) => void onFile(e.target.files?.[0])} />
      </label>
      <fieldset>
        <legend className="text-sm font-semibold">{t('play.languages')}</legend>
        <p className="text-sm text-muted">{langs.length ? langs.join(', ') : t('play.auto')}</p>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {CODES.map((c) => (
            <label key={c} className="num inline-flex items-center gap-1 border border-rule px-2 py-1 text-sm">
              <input
                type="checkbox"
                checked={langs.includes(c)}
                onChange={(e) => setLangs((l) => (e.target.checked ? [...l, c].slice(0, 4) : l.filter((x) => x !== c)))}
              />
              {c}
            </label>
          ))}
        </div>
      </fieldset>
      <Segmented
        mono
        label={t('play.format')}
        value={format}
        options={['verbatim', 'transcribe', 'codemix', 'transliterate'].map((v) => ({ value: v, label: v }))}
        onChange={setFormat}
      />
      <label className="block text-sm font-semibold">
        {t('play.keyterms')}
        <input className="field mt-1" value={keyterms} onChange={(e) => setKeyterms(e.target.value)} />
      </label>
      <label className="block text-sm font-semibold">
        {t('play.topic')}
        <input className="field mt-1" maxLength={1600} value={topic} onChange={(e) => setTopic(e.target.value)} />
      </label>
      <button type="button" className="btn" onClick={() => void submit()} disabled={call.busy}>
        {t('play.transcribe')}
      </button>
      <CallReport call={call} />
      {out && <Result r={out.result} />}
    </fieldset>
  )
}

function Tts({ lang }: { lang: Lang }) {
  const { t } = useTranslation()
  const call = useLiveCall()
  const area = useRef<HTMLTextAreaElement>(null)
  const [text, setText] = useState('')
  const [language, setLanguage] = useState(`${lang}-IN`)
  const [voice, setVoice] = useState('Vasudha')
  const [speed, setSpeed] = useState(1)
  const [rate, setRate] = useState(16000)
  const [container, setContainer] = useState('wav')
  const [audio, setAudio] = useState('')
  const usage = useUsage()

  const insert = (tag: string) => {
    const el = area.current
    const at = el?.selectionStart ?? text.length
    setText(`${text.slice(0, at)} ${tag} ${text.slice(at)}`)
  }
  const speak = async () => {
    const res = await call.run('tts', text.length, (confirm) =>
      source.tts({ text, language, voice, speed, sample_rate: rate, container, confirm }),
    )
    if (res) setAudio(`data:${res.content_type};base64,${res.audio_b64}`)
  }
  return (
    <fieldset disabled={!live} className="space-y-4 disabled:opacity-70">
      <label className="block text-sm font-semibold">
        {t('play.text')}
        <textarea ref={area} className="field mt-1" rows={4} maxLength={1000} value={text} onChange={(e) => setText(e.target.value)} />
      </label>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {t('play.insert')}:
        {['<pauses>', '<slow>'].map((tag) => (
          <button key={tag} type="button" className="btn btn-ghost num min-h-9 px-3" onClick={() => insert(tag)}>
            {tag}
          </button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold">
          {t('lang')}
          <select className="field mt-1" value={language} onChange={(e) => setLanguage(e.target.value)}>
            {CODES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-semibold">
          {t('play.voice')}
          <select className="field mt-1" value={voice} onChange={(e) => setVoice(e.target.value)}>
            {VOICES.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-semibold">
          {t('play.speed')}: <span className="num">{speed.toFixed(2)}</span>
          <input type="range" min={0.85} max={1.15} step={0.05} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="mt-3 w-full accent-[var(--vermilion)]" />
        </label>
        <label className="block text-sm font-semibold">
          {t('play.sampleRate')}
          <select className="field mt-1" value={rate} onChange={(e) => setRate(Number(e.target.value))}>
            {[8000, 16000, 22050, 24000, 44100, 48000].map((r) => (
              <option key={r} value={r}>
                {r} Hz
              </option>
            ))}
          </select>
        </label>
      </div>
      <Segmented mono label={t('play.container')} value={container} options={['wav', 'mp3', 'ogg'].map((v) => ({ value: v, label: v }))} onChange={setContainer} />
      <p className="num text-sm text-muted" aria-live="polite">
        {usage.data?.queue ? t('play.queue', { n: usage.data.queue }) : t('play.queueEmpty')}
      </p>
      <button type="button" className="btn" onClick={() => void speak()} disabled={call.busy || !text.trim()}>
        {t('play.speakBtn')}
      </button>
      <CallReport call={call} />
      {audio && (
        <div className="space-y-2">
          <audio controls src={audio} className="w-full" />
          <a className="btn btn-ghost no-underline" href={audio} download={`tinytalk-tts.${container}`}>
            {t('common.download')}
          </a>
        </div>
      )}
    </fieldset>
  )
}

export default function Playground({ lang }: { lang: Lang }) {
  const { t } = useTranslation()
  const [tab, setTab] = useState<'stt' | 'tts'>('stt')
  const saved = usePlayground()
  return (
    <div className="space-y-12">
      <PageHead no="6" title={t('play.title')} lede={t('play.lede')} />
      {!live && <p className="border-l-4 border-turmeric bg-card px-4 py-3">{t('common.liveNeeded')}</p>}
      <AccessCode />
      <div>
        <div role="tablist" aria-label={t('play.title')} className="flex flex-wrap gap-0 border-b-[1.5px] border-ink">
          {(['stt', 'tts'] as const).map((k) => (
            <button
              key={k}
              role="tab"
              id={`tab-${k}`}
              aria-selected={tab === k}
              aria-controls={`panel-${k}`}
              tabIndex={tab === k ? 0 : -1}
              onClick={() => setTab(k)}
              onKeyDown={(e) => (e.key === 'ArrowRight' || e.key === 'ArrowLeft') && setTab(tab === 'stt' ? 'tts' : 'stt')}
              className={`min-h-11 cursor-pointer px-4 font-semibold ${tab === k ? 'bg-ink text-paper' : 'hover:bg-card'}`}
            >
              {t(k === 'stt' ? 'play.sttTab' : 'play.ttsTab')}
            </button>
          ))}
        </div>
        <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="pt-6">
          {tab === 'stt' ? <Stt /> : <Tts lang={lang} />}
        </div>
      </div>
      <section aria-labelledby="saved">
        <h2 id="saved" className="display text-3xl">
          {t('play.saved')}
        </h2>
        <p className="mt-1 text-muted">{t('play.savedNote')}</p>
        <Await q={saved}>
          {(runs) => (
            <div className="mt-4 grid gap-6 lg:grid-cols-3">
              {runs.map((r) => (
                <article key={r.label} className="kasavu space-y-3 p-5" lang={r.tts.language.slice(0, 2)}>
                  <p className="num text-xs text-muted" lang="en">
                    {r.label} · {r.tts.voice} · {r.tts.speed} · {r.stt.language_code} · {r.stt.format}
                  </p>
                  <p>{r.tts.text}</p>
                  <audio controls preload="none" src={`${base}${r.tts.audio}`} className="w-full" />
                  <Result r={r.stt.result} />
                </article>
              ))}
            </div>
          )}
        </Await>
      </section>
    </div>
  )
}
