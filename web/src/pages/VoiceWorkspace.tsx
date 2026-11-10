import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { LANGUAGES } from '@/lib/languages'
import './workspace.css'

interface VoiceSample { id: string; title: string; audio: string; language: string; duration: number; text: string | null; kind: string; category: string; source_url: string; license: string }
interface ServiceStatus { available: boolean; processing_available: boolean; live: boolean; remaining: number; limit: number; max_seconds: number }
interface Settings { codec: 'pcm' | 'codec2' | 'opus'; sample_rate: number; bit_depth: number; bitrate_kbps: number; loss_percent: number }
interface Processed { clip_id: string; audio_b64: string; content_type: string; meta: { codec: string; sample_rate: number; bit_depth: number | null; bitrate_bps: number; duration_seconds: number; encoded_bytes: number; preview_wav_bytes: number; chunks: number; lost_chunks: number; loss_percent: number; loss_model: string; audio_sha256: string } }
interface Transcript { transcript: string; detected_language: string; model: string; format: string; elapsed_seconds: number; remaining: number; clip_id: string; audio_sha256: string; reused: boolean; source: string }
interface HistoryEntry { result: Transcript; meta: Processed['meta'] }
const base = import.meta.env.BASE_URL
const initial: Settings = { codec: 'pcm', sample_rate: 16000, bit_depth: 16, bitrate_kbps: 12, loss_percent: 0 }

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/audio/${path}`, { ...init, credentials: 'same-origin' })
  if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('The voice server is unavailable. Saved audio still plays. Start the Awaaz backend to process your voice.')
  const body = await response.json()
  if (!response.ok) throw new Error(typeof body.detail === 'string' ? body.detail : 'The audio request could not be completed. Check the file and try again.')
  return body as T
}

function audioUrl(data: string, contentType: string): string {
  const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0))
  return URL.createObjectURL(new Blob([bytes], { type: contentType }))
}

export default function VoiceWorkspace() {
  const [samples, setSamples] = useState<VoiceSample[]>([])
  const [status, setStatus] = useState<ServiceStatus | null>(null)
  const [tab, setTab] = useState<'sample' | 'record' | 'upload'>('sample')
  const [sampleId, setSampleId] = useState('workspace-dispatch-en')
  const [file, setFile] = useState<File | null>(null)
  const [fileUrl, setFileUrl] = useState('')
  const [settings, setSettings] = useState<Settings>(initial)
  const [language, setLanguage] = useState('indic-auto')
  const [format, setFormat] = useState('transcribe')
  const [keyterms, setKeyterms] = useState('')
  const [readLanguage, setReadLanguage] = useState('')
  const [processed, setProcessed] = useState<Processed | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [speechUrl, setSpeechUrl] = useState('')
  const [processing, setProcessing] = useState(false)
  const [modelBusy, setModelBusy] = useState(false)
  const [result, setResult] = useState<Transcript | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [error, setError] = useState('')
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [inputRevision, setInputRevision] = useState(0)
  const recorder = useRef<MediaRecorder | null>(null)
  const stream = useRef<MediaStream | null>(null)
  const tick = useRef<ReturnType<typeof setInterval> | null>(null)
  const generation = useRef(0)
  const [retry, setRetry] = useState(0)
  const selected = samples.find((s) => s.id === sampleId)

  useEffect(() => {
    let active = true
    void fetch(`${base}data/voice-samples.json`).then((r) => { if (!r.ok) throw new Error('Saved samples could not load. You can still record or upload your voice.'); return r.json() }).then((d: VoiceSample[]) => { if (active) setSamples(d) }).catch((e: Error) => { if (active) setError(e.message) })
    void api<ServiceStatus>('status').then((s) => { if (active) setStatus(s) }).catch((e: Error) => { if (active) setError(e.message) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!file) { setFileUrl(''); return }
    const url = URL.createObjectURL(file); setFileUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])
  useEffect(() => { if (!processed) { setPreviewUrl(''); return }; const url = audioUrl(processed.audio_b64, processed.content_type); setPreviewUrl(url); return () => URL.revokeObjectURL(url) }, [processed])
  useEffect(() => () => { if (tick.current) clearInterval(tick.current); if (recorder.current?.state === 'recording') { recorder.current.onstop = null; recorder.current.stop() }; stream.current?.getTracks().forEach((t) => t.stop()) }, [])
  useEffect(() => () => { if (speechUrl) URL.revokeObjectURL(speechUrl) }, [speechUrl])

  useEffect(() => {
    const id = ++generation.current
    setResult(null); setProcessed(null); setSpeechUrl('')
    if (!status?.processing_available || (tab !== 'sample' && !file) || recording) { setProcessing(false); return }
    const controller = new AbortController()
    setProcessing(true)
    const timer = setTimeout(() => {
      const form = new FormData()
      if (tab === 'sample') form.append('sample_id', sampleId)
      else if (file) form.append('audio_file', file)
      form.append('codec_name', settings.codec)
      Object.entries(settings).filter(([key]) => key !== 'codec').forEach(([key, value]) => form.append(key, String(value)))
      void api<Processed>('process', { method: 'POST', body: form, signal: controller.signal }).then((d) => { if (id === generation.current) { setProcessed(d); setError('') } }).catch((e: Error) => { if (e.name !== 'AbortError' && id === generation.current) setError(e.message) }).finally(() => { if (id === generation.current) setProcessing(false) })
    }, 400)
    return () => { clearTimeout(timer); controller.abort() }
  }, [settings, sampleId, file, tab, status?.processing_available, recording, retry])

  const stopRecording = () => { if (recorder.current?.state === 'recording') recorder.current.stop() }
  const startRecording = async () => {
    setError(''); setFile(null); setElapsed(0)
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') { setError('Recording needs HTTPS or localhost and a browser with microphone support. You can upload an audio file instead.'); return }
    try {
      const input = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: true } })
      stream.current = input
      const mime = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg;codecs=opus'].find((m) => MediaRecorder.isTypeSupported(m))
      const rec = new MediaRecorder(input, mime ? { mimeType: mime } : undefined)
      recorder.current = rec
      const chunks: Blob[] = []
      rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }
      rec.onstop = () => {
        if (tick.current) clearInterval(tick.current)
        input.getTracks().forEach((t) => t.stop())
        const type = rec.mimeType.split(';')[0] || 'audio/webm'
        setFile(new File(chunks, `my-voice.${type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm'}`, { type }))
        setRecording(false); setInputRevision((v) => v + 1)
      }
      rec.onerror = () => { setError('The microphone recording was interrupted. Try again or upload a file.'); stopRecording(); input.getTracks().forEach((t) => t.stop()) }
      rec.start(250); setRecording(true)
      const started = Date.now()
      tick.current = setInterval(() => { const seconds = Math.floor((Date.now() - started) / 1000); setElapsed(seconds); if (seconds >= 30) rec.stop() }, 200)
    } catch (e) { stream.current?.getTracks().forEach((t) => t.stop()); setError(e instanceof DOMException && e.name === 'NotAllowedError' ? 'Microphone permission was declined. Allow it in your browser settings, or upload a file.' : 'The microphone could not start. Try uploading your audio instead.') }
  }

  const transcribe = async () => {
    if (!processed || modelBusy) return
    const current = processed; const revision = generation.current
    setModelBusy(true); setError('')
    try {
      const d = await api<Transcript>('transcribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clip_id: current.clip_id, language, format, keyterms }) })
      setStatus((s) => s ? { ...s, remaining: d.remaining } : s)
      setHistory((previous) => [{ result: d, meta: current.meta }, ...previous.filter((h) => h.result.clip_id !== d.clip_id || h.result.format !== d.format)].slice(0, 4))
      if (revision === generation.current) setResult(d)
    } catch (e) { setError((e as Error).message); void api<ServiceStatus>('status').then(setStatus).catch(() => {}) }
    finally { setModelBusy(false) }
  }
  const speak = async () => {
    if (!result || modelBusy) return
    const code = readLanguage || (LANGUAGES.some((l) => l.code === result.detected_language) ? result.detected_language : language === 'indic-auto' ? '' : language)
    if (!code) { setError('Choose the transcript language for Timbre. Prisma did not identify it for this output mode.'); return }
    setModelBusy(true); setError('')
    try {
      const d = await api<{ audio_b64: string; content_type: string; remaining: number }>('speak', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clip_id: result.clip_id, text: result.transcript, language: code }) })
      setSpeechUrl(audioUrl(d.audio_b64, d.content_type)); setStatus((s) => s ? { ...s, remaining: d.remaining } : s)
    } catch (e) { setError((e as Error).message); void api<ServiceStatus>('status').then(setStatus).catch(() => {}) } finally { setModelBusy(false) }
  }
  const changeTab = (next: typeof tab) => { if (recording) stopRecording(); setTab(next); setError(''); setInputRevision((v) => v + 1) }
  const setOption = (key: keyof Settings, value: string) => setSettings((s) => ({ ...s, [key]: key === 'codec' ? value : Number(value) }))

  return <div className="voice-workspace" lang="en" onPlayCapture={(event) => { const current = event.target; document.querySelectorAll('audio').forEach((audio) => { if (audio !== current) audio.pause() }) }}>
    <header className="vw-heading"><div><p className="aw-eyebrow">THE VOICE WORKSPACE / POWERED BY GNANI</p><h1>Your voice,<br /><em>under pressure.</em></h1><p>Speak in your language. Change the sound that travels.<br />See what Prisma actually hears.</p></div><div className="vw-budget" role="status"><span className={`vw-server-dot ${status?.live ? 'is-live' : ''}`} /><strong>{status ? status.live ? 'Live speech is ready' : 'Audio processing only' : 'Connecting to the voice server…'}</strong><p>{status ? `${status.remaining} of ${status.limit} live tries left today` : 'Checking availability'}</p><small>Audio previews are free. Transcribing and read-aloud each use a try.</small></div></header>
    <div className="vw-flow" aria-label="Audio pipeline"><span>01 Capture</span><i>→</i><span>02 Shape the signal</span><i>→</i><span>03 Hear & understand</span></div>
    {error && <div className="vw-error" role="alert"><p>{error}</p><button type="button" onClick={() => { setError(''); setRetry((v) => v + 1); void api<ServiceStatus>('status').then(setStatus).catch((e: Error) => setError(e.message)) }}>Try again</button></div>}
    <div className="vw-grid">
      <section className="vw-source" aria-label="Input audio">
        <div className="vw-section-title"><span>01</span><h2>Start with a voice.</h2></div>
        <div className="vw-tabs" role="tablist" aria-label="Audio source">{(['sample', 'record', 'upload'] as const).map((v) => <button key={v} type="button" role="tab" aria-selected={tab === v} aria-controls="vw-source-panel" onClick={() => changeTab(v)} disabled={modelBusy}>{v === 'sample' ? 'Try a sample' : v === 'record' ? 'Record my voice' : 'Upload audio'}</button>)}</div>
        <div id="vw-source-panel" role="tabpanel" className="vw-source-panel">
          {tab === 'sample' && <><label htmlFor="vw-sample">Choose a situation</label><select id="vw-sample" value={sampleId} onChange={(e) => { setSampleId(e.target.value); const s = samples.find((a) => a.id === e.target.value); if (s) setLanguage(s.language); setInputRevision((v) => v + 1) }} disabled={modelBusy}>{samples.map((s) => <option value={s.id} key={s.id}>{s.title} · {s.language.split('-')[0].toUpperCase()} · {s.duration}s</option>)}</select>{selected && <><p className="vw-sample-kind">{selected.kind}</p><audio aria-label="Source audio" controls preload="metadata" src={`${base}${selected.audio}`} /><details className="vw-reference"><summary>About this sample</summary><p lang={selected.language.split('-')[0]}>{selected.text ?? 'No verified reference transcript. Transcribe the recording with Prisma to inspect its actual output.'}</p><a href={selected.source_url} target="_blank" rel="noreferrer">Source · {selected.license} ↗</a></details></>}</>}
          {tab === 'record' && <div className="vw-recorder"><div className={`vw-record-orbit ${recording ? 'is-recording' : ''}`} aria-hidden="true"><span /></div><p>{recording ? `Listening · ${String(elapsed).padStart(2, '0')} / 30s` : file ? 'Your recording is ready.' : 'A message, in your own words.'}</p><button type="button" className="aw-button" onClick={() => recording ? stopRecording() : void startRecording()} disabled={modelBusy}>{recording ? 'Stop recording' : file ? 'Record again' : 'Start recording'} <span aria-hidden="true">{recording ? '■' : '●'}</span></button><small>Up to 30 seconds. Transcription runs after you stop; this is not streaming captions.</small></div>}
          {tab === 'upload' && <label className="vw-upload"><span className="vw-upload-arrow" aria-hidden="true">↥</span><strong>{file?.name ?? 'Choose an audio recording'}</strong><span>WAV, MP3, WebM, OGG, FLAC or M4A<br />Up to 30 seconds · 5 MB</span><input type="file" accept="audio/*,.m4a,.webm" aria-label="Upload your audio" disabled={modelBusy} onChange={(e) => { const next = e.target.files?.[0]; if (next) { if (next.size > 5000000) { setError('Choose an audio file smaller than 5 MB.'); return }; setFile(next); setInputRevision((v) => v + 1); setLanguage('indic-auto') } }} /></label>}
          {tab !== 'sample' && fileUrl && <audio key={inputRevision} aria-label="Your original recording" controls src={fileUrl} />}
        </div>
        <div className="vw-section-title"><span>02</span><h2>Change what travels.</h2></div>
        <div className="vw-controls"><label>Audio codec<select aria-label="Audio codec" value={settings.codec} onChange={(e) => setOption('codec', e.target.value)} disabled={modelBusy}><option value="pcm">PCM · uncompressed</option><option value="codec2">Codec2 · 2.4 kbps radio voice</option><option value="opus">Opus · compressed voice</option></select></label><label>Sample rate<select aria-label="Sample rate" value={settings.codec === 'codec2' ? 8000 : settings.sample_rate} onChange={(e) => setOption('sample_rate', e.target.value)} disabled={settings.codec === 'codec2' || modelBusy}>{[8000, 16000, 24000, 48000].map((r) => <option key={r} value={r}>{r / 1000} kHz</option>)}</select></label><label>{settings.codec === 'opus' ? 'Opus bitrate' : 'PCM bit depth'}<select aria-label={settings.codec === 'opus' ? 'Opus bitrate' : 'PCM bit depth'} value={settings.codec === 'opus' ? settings.bitrate_kbps : settings.codec === 'codec2' ? 16 : settings.bit_depth} disabled={settings.codec === 'codec2' || modelBusy} onChange={(e) => setOption(settings.codec === 'opus' ? 'bitrate_kbps' : 'bit_depth', e.target.value)}>{settings.codec === 'opus' ? [6, 12, 24, 48].map((r) => <option key={r} value={r}>{r} kbps</option>) : [8, 16].map((r) => <option key={r} value={r}>{r}-bit</option>)}</select></label></div>
        {settings.codec === 'codec2' && <p className="vw-hint">Codec2 is fixed at 8 kHz / 2.4 kbps. Its codec rate is not a PCM bit depth.</p>}
        <div className="vw-loss"><label htmlFor="vw-loss">Simulated loss <output>{settings.loss_percent}%</output></label><input id="vw-loss" type="range" min="0" max="60" step="10" value={settings.loss_percent} onChange={(e) => setOption('loss_percent', e.target.value)} disabled={modelBusy} /><div><span>Clear</span><span>Disrupted</span><span>Severe</span></div></div>
        <button type="button" className="vw-reset" onClick={() => setSettings(initial)} disabled={modelBusy}>Reset to clear PCM ↺</button>
      </section>
      <section className="vw-receiver" aria-label="Received audio and transcript">
        <div className="vw-section-title"><span>03</span><h2>Hear what arrives.</h2></div>
        <div className="vw-preview" aria-busy={processing}>
          <div className="vw-preview-label"><span>{processing ? 'Updating the actual audio…' : processed ? 'RECEIVED AUDIO / REAL PROCESSING' : 'YOUR RECEIVER'}</span><span aria-hidden="true">↙</span></div>
          {previewUrl ? <audio aria-label="Processed received audio" controls src={previewUrl} /> : <p className="vw-empty">{processing ? 'Resampling, encoding and applying the selected loss…' : 'Choose a sample, record, or upload a voice. Its processed sound will appear here.'}</p>}
          {processed && <><dl className="vw-audio-metrics"><div><dt>Encoded size</dt><dd>{(processed.meta.encoded_bytes / 1024).toFixed(1)} <small>KB</small></dd></div><div><dt>Audio rate</dt><dd>{processed.meta.bitrate_bps / 1000} <small>kbps</small></dd></div><div><dt>Lost chunks</dt><dd>{processed.meta.lost_chunks} <small>/ {processed.meta.chunks}</small></dd></div></dl><p className="vw-hint">{processed.meta.loss_model}</p><a href={previewUrl} download={`awaaz-${processed.meta.codec}-${processed.meta.sample_rate}hz-${processed.meta.loss_percent}loss.wav`} className="vw-download">Download received audio ↗</a></>}
        </div>
        <div className="vw-recognition-options"><label>Spoken language<select aria-label="Spoken language" value={language} disabled={modelBusy} onChange={(e) => { setLanguage(e.target.value); setResult(null) }}><option value="indic-auto">Detect automatically · all 10 languages</option>{LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.nameNative} · {l.nameEn}</option>)}</select></label><label>Prisma output<select aria-label="Prisma output" value={format} disabled={modelBusy} onChange={(e) => { setFormat(e.target.value); setResult(null) }}><option value="transcribe">Clean transcript</option><option value="verbatim">Verbatim · include fillers</option><option value="codemix">Code-mix · mixed-language scripts</option><option value="transliterate">Transliterate · Latin script</option></select></label></div>
        <details className="vw-keyterms"><summary>Help Prisma with specific names</summary><label>Place names, terminology, call signs<input type="text" maxLength={500} value={keyterms} disabled={modelBusy} onChange={(e) => { setKeyterms(e.target.value); setResult(null) }} placeholder="e.g. Bengaluru, platform three, dispatch" /></label><p>Optional comma-separated keyterms bias recognition. They do not train the model.</p></details>
        <button type="button" className="aw-button vw-transcribe" disabled={!processed || processing || modelBusy || !status?.live || status.remaining < 1} onClick={() => void transcribe()}>{modelBusy ? 'Gnani is working…' : 'Transcribe received audio'} <span aria-hidden="true">↗</span></button>
        {!status?.live && <p className="vw-hint">{status ? 'Live Prisma is disabled on this server. You can still hear every audio transformation. No saved transcript will be passed off as yours.' : 'Waiting for the voice server. The microphone and saved audio remain available.'}</p>}
        <div className="vw-transcript" aria-live="polite" aria-busy={modelBusy}>
          <div className="vw-preview-label"><span>{result ? `${result.model} / ${result.reused ? 'REUSED LIVE RESULT' : 'LIVE RESULT'}` : 'THE WORDS THAT MADE IT'}</span>{result && <span>{result.elapsed_seconds}s</span>}</div>
          {result ? <><p className="vw-result-text" lang={result.detected_language.split('-')[0]}>{result.transcript || 'Prisma returned no speech. Try less loss or clearer audio.'}</p><div className="vw-result-meta"><span>{LANGUAGES.find((l) => l.code === result.detected_language)?.nameEn ?? result.detected_language}</span><span>{result.format}</span><span>Audio #{result.audio_sha256.slice(0, 8)}</span></div><label className="vw-speak-language">Read-aloud language<select aria-label="Read-aloud language" value={readLanguage || (LANGUAGES.some((l) => l.code === result.detected_language) ? result.detected_language : language === 'indic-auto' ? '' : language)} onChange={(e) => setReadLanguage(e.target.value)} disabled={modelBusy}><option value="">Choose the transcript language</option>{LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.nameNative} - {l.nameEn}</option>)}</select></label><button className="aw-text-link" type="button" disabled={modelBusy || !result.transcript || !status?.remaining} onClick={() => void speak()}>Read aloud with Timbre ↗</button>{speechUrl && <audio aria-label="Timbre read-aloud" controls src={speechUrl} />}</> : <p className="vw-empty">{modelBusy ? 'Sending the processed waveform to Prisma. Waiting for its actual response…' : 'Your transcript will appear after you run Prisma. Changing audio settings clears the current result, so an old transcript cannot look like a new one.'}</p>}
        </div>
        <p className="vw-hint">Different audio can produce the same correct words. Awaaz never forces a transcript to change just because a frequency or bitrate changed.</p>
      </section>
    </div>
    {history.length > 0 && <section className="vw-history"><div className="vw-section-title"><span>↳</span><h2>Compare your actual results.</h2></div><div className="vw-history-grid">{history.map((entry, i) => <article key={`${entry.result.clip_id}-${entry.result.format}`}><p className="aw-eyebrow">{i === 0 ? 'LATEST' : 'PREVIOUS'} / {entry.meta.codec.toUpperCase()} · {entry.meta.sample_rate / 1000} KHZ · {entry.meta.loss_percent}% LOSS</p><p lang={entry.result.detected_language.split('-')[0]}>{entry.result.transcript || 'No speech recognised.'}</p><small>{entry.result.model} · {entry.result.format} · #{entry.result.audio_sha256.slice(0, 8)}</small></article>)}</div></section>}
    <aside className="vw-method"><p>Real codec processing. Simulated link loss. Actual Gnani transcripts.</p><p>Audio and transcripts stay in expiring server memory. All ten speech languages are selectable; the older closed-list fact benchmark covers three and is separate from this workspace.</p><Link to="/inspect">See the measured research ↗</Link></aside>
  </div>
}
