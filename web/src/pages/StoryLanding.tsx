import { m, useReducedMotion, useScroll } from 'motion/react'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { Facts, Lang, Tier } from '@/data/types'
import { factList } from '@/labels'
import { SignalChoreography } from '@/components/SignalChoreography'
import { compareFacts, extract } from '@/lib/facts'
import './story.css'

const base = import.meta.env.BASE_URL
const ease = [0.22, 1, 0.36, 1] as const
const LANGUAGES = [{ code: 'en' as const, label: 'English' }, { code: 'hi' as const, label: 'हिन्दी' }, { code: 'ml' as const, label: 'മലയാളം' }]
interface StoryExample { id: string; title: string; lang: Lang; text: string; heard: string; facts: Facts; audio: Record<string, string>; runs: Record<string, { tiers: { tier: Tier; payload_bytes: number; bytes_sent: number; delivered: boolean }[] }> }

function Arrow({ down = false }: { down?: boolean }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={down ? { transform: 'rotate(90deg)' } : undefined}><path d="M4 12h15m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.5" /></svg>
}

function Reveal({ children, className = '' }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion()
  return <m.div className={className} initial={reduce ? false : { opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ duration: 0.6, ease }}>{children}</m.div>
}

function Wave({ broken = false, active = false, progress = 0 }: { broken?: boolean; active?: boolean; progress?: number }) {
  return <div className={`aw-wave ${active ? 'is-playing' : ''}`} aria-hidden="true">{Array.from({ length: 64 }, (_, i) => {
    const height = 8 + Math.abs(Math.sin(i * 1.72) * Math.cos(i * 0.23)) * 42
    const missing = broken && ((i > 13 && i < 22) || (i > 35 && i < 44) || i > 57)
    return <span key={i} className={`${missing ? 'is-lost' : ''} ${i / 64 < progress ? 'is-heard' : ''}`} style={{ height: `${height}px`, animationDelay: `${i * -0.035}s` }} />
  })}</div>
}

function Player({ src, label, caption, broken = false, compact = false }: { src: string; label: string; caption: string; broken?: boolean; compact?: boolean }) {
  const audio = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(false)
  const toggle = async () => {
    if (!audio.current) return
    if (playing) audio.current.pause()
    else {
      document.querySelectorAll('audio').forEach((other) => { if (other !== audio.current) other.pause() })
      setError(false)
      try { await audio.current.play() } catch { setError(true) }
    }
  }
  return <div className={`aw-player ${compact ? 'aw-player-compact' : ''}`}>
    <audio ref={audio} src={src} preload="none" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => { setPlaying(false); setProgress(0) }} onError={() => setError(true)} onTimeUpdate={() => { const a = audio.current; if (a && Number.isFinite(a.duration)) setProgress(a.currentTime / a.duration) }} />
    <button className="aw-play" type="button" onClick={() => void toggle()} aria-label={`${playing ? 'Pause' : 'Play'} ${label}`} aria-pressed={playing}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">{playing ? <path d="M7 5h3v14H7zM14 5h3v14h-3z" /> : <path d="m9 5 11 7-11 7z" />}</svg>
    </button>
    <div className="aw-player-content"><span className="aw-player-label">{label}</span><Wave broken={broken} active={playing} progress={progress} /><span className="aw-caption">{error ? 'Audio unavailable. Try playing again, or explore the transcript below.' : caption}</span></div>
  </div>
}

function RadioDrawing() {
  return <svg className="aw-radio-drawing" viewBox="0 0 600 620" fill="none" aria-hidden="true">
    <g className="aw-radio-rings" stroke="currentColor" strokeWidth="0.7"><circle cx="300" cy="290" r="250" /><circle cx="300" cy="290" r="210" /><circle cx="300" cy="290" r="170" /><path d="M35 290h530M300 25v530" strokeDasharray="2 8" /></g>
    <g transform="rotate(-12 300 330)">
      <path d="M221 161v-112q0-8 6-8t6 8v112" fill="var(--aw-ink)" stroke="var(--aw-ink)" strokeWidth="4" />
      <rect x="255" y="141" width="35" height="23" rx="5" fill="var(--aw-ink)" /><rect x="315" y="143" width="24" height="20" rx="4" fill="var(--aw-ink)" />
      <path d="M197 187q0-29 28-29h127q28 0 28 29v276q0 30-28 30H225q-28 0-28-30z" fill="var(--aw-radio-side)" stroke="var(--aw-ink)" strokeWidth="2" />
      <rect x="187" y="167" width="179" height="319" rx="24" fill="var(--aw-radio)" stroke="var(--aw-ink)" strokeWidth="2" />
      <rect x="205" y="187" width="143" height="94" rx="12" fill="var(--aw-ink)" />
      {Array.from({ length: 7 }, (_, i) => <path key={i} d={`M222 ${202 + i * 10}h108`} stroke="var(--aw-radio-slot)" strokeWidth="3" strokeLinecap="round" />)}
      <rect x="208" y="306" width="138" height="64" rx="5" fill="var(--aw-radio-screen)" stroke="var(--aw-ink)" />
      <path d="M222 335h8l4-11 6 27 7-21 6 11h9l5-20 6 26 6-13h10l4 5 5-12 5 15 5-7h11" stroke="var(--aw-ink)" strokeWidth="2" />
      <circle cx="238" cy="407" r="13" stroke="var(--aw-ink)" strokeWidth="2" /><path d="M234 407h8m-4-4v8" stroke="var(--aw-ink)" strokeWidth="1.5" />
      <circle cx="281" cy="407" r="13" stroke="var(--aw-ink)" strokeWidth="2" /><path d="M277 407h8" stroke="var(--aw-ink)" strokeWidth="1.5" />
      <rect x="309" y="394" width="23" height="26" rx="8" fill="var(--aw-ink)" />
      <path d="M240 451h74" stroke="var(--aw-ink)" strokeWidth="1.5" strokeLinecap="round" /><circle cx="224" cy="450" r="3" fill="var(--aw-accent)" /><path d="M187 229h-8v63h8" fill="var(--aw-ink)" />
    </g>
    <path d="M389 187q32 16 34 49m-29-74q49 22 54 72m-47-94q67 27 74 94" stroke="var(--aw-accent)" strokeWidth="2" strokeLinecap="round" />
    <path d="M181 501q-15 31 21 42t12 30q-14 13-35 0" stroke="var(--aw-ink)" strokeWidth="2" strokeLinecap="round" /><circle cx="484" cy="290" r="5" fill="var(--aw-accent)" /><circle cx="300" cy="40" r="3" fill="var(--aw-accent)" />
  </svg>
}

const CHAPTERS = [
  { title: 'First, a voice.', sub: 'A few words. A world of difference.', body: 'A request for medical help. A supply dispatch. A rescue update. Someone on the other end needs the right place, quantity and time.', label: '01 / THE MESSAGE' },
  { title: 'Then, the signal fades.', sub: 'The connection gives way. Details go missing.', body: 'Listen to the same sample after simulated packet loss. A broken connection can turn a clear voice into fragments.', label: '02 / THE PROBLEM' },
  { title: 'Less to send. More to hold on to.', sub: 'Carry the information that matters.', body: 'Prisma transcribes speech. Awaaz packs the transcript, or just its recognised places, quantities and times, into a smaller payload.', label: '03 / THE POSSIBILITY' },
]

function MessageJourney({ lang }: { lang: Lang }) {
  const reduce = useReducedMotion()
  const sectionRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end end'] })
  const data = useQuery<StoryExample[]>({ queryKey: ['story-examples'], queryFn: async () => { const r = await fetch(`${base}data/story-examples.json`); if (!r.ok) throw new Error('Saved examples unavailable'); return r.json() }, staleTime: Infinity, retry: 1 })
  const [stage, setStage] = useState(0)
  const [selectedLang, setSelectedLang] = useState<Lang>(lang)
  const [selectedId, setSelectedId] = useState('workspace-medical-en')
  const [format, setFormat] = useState<Tier>('C')
  const stepRefs = useRef<(HTMLDivElement | null)[]>([])
  const [loss, setLoss] = useState(30)
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting) setStage(Number((entry.target as HTMLElement).dataset.step))
    }, { rootMargin: '-25% 0px -35% 0px', threshold: 0 })
    stepRefs.current.forEach((el) => { if (el) observer.observe(el) })
    return () => observer.disconnect()
  }, [])
  const sample = data.data?.find((s) => s.id === selectedId && s.lang === selectedLang) ?? data.data?.find((s) => s.lang === selectedLang)
  const id = sample?.id ?? `workspace-medical-${selectedLang}`
  const run = sample?.runs[String(loss)]
  const audio = sample?.audio
  const selectedTier = run?.tiers.find((t) => t.tier === format)
  const facts = sample ? factList(sample.facts, selectedLang).map((f) => f.label) : []
  return <section ref={sectionRef} className="aw-journey" id="the-story" aria-label="How Awaaz works">
    <div className="aw-wrap aw-journey-grid">
      <div className="aw-story-copy">{CHAPTERS.map((chapter, i) => <div className="aw-story-step" key={chapter.label} ref={(el) => { stepRefs.current[i] = el }} data-step={i}>
        <Reveal><p className="aw-eyebrow">{chapter.label}</p><h2>{chapter.title}</h2><p className="aw-step-sub">{chapter.sub}</p><p className="aw-body">{chapter.body}</p>{i === 2 && <Link to="/how" className="aw-text-link">Meet the system <Arrow /></Link>}</Reveal>
      </div>)}</div>
      <div className="aw-sticky-stage"><SignalChoreography progress={scrollYProgress} message={sample?.text ?? 'A voice from the field.'} facts={facts} /><div className="aw-console" data-stage={stage}>
        <div className="aw-console-top"><span><i className="aw-status-dot" /> FIELD NOTES / RESPONSE DRILL</span><span>Saved example</span></div>
        <fieldset className="aw-language-picker"><legend className="sr-only">Example language</legend>{LANGUAGES.map((l) => <button key={l.code} type="button" lang={l.code} aria-pressed={selectedLang === l.code} onClick={() => setSelectedLang(l.code)}>{l.label}</button>)}</fieldset>
        <label className="aw-scenario-picker">Saved situation<select aria-label="Saved situation" value={sample?.id ?? ''} onChange={(e) => setSelectedId(e.target.value)}>{data.data?.filter((s) => s.lang === selectedLang).map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}</select></label>
        <div className="aw-console-message">
          <span className="aw-caption">{stage === 0 ? 'A message from the field' : stage === 1 ? 'Same voice. A weaker connection.' : 'The information, carried forward.'}</span>
          <blockquote lang={selectedLang}>{sample?.text ?? (data.isError ? 'The saved example could not load.' : 'Loading a voice from the field…')}</blockquote>
          {data.isError && <button type="button" className="aw-text-link" onClick={() => void data.refetch()}>Retry example <Arrow /></button>}
          {audio && <Player key={`${id}-${stage > 0 ? loss : 'original'}`} src={`${base}${audio[stage > 0 ? `A${loss}` : 'original']}`} label={stage > 0 ? 'simulated radio audio' : 'original voice'} caption={stage > 0 ? `${loss}% simulated packet loss · Codec2 audio` : 'Synthetic speech · Gnani Timbre'} broken={stage > 0 && loss > 0} compact />}
        </div>
        <div className="aw-connection-control"><div><label htmlFor="aw-loss">Simulated packet loss</label><output htmlFor="aw-loss">{loss}%</output></div><input id="aw-loss" type="range" min="0" max="30" step="10" value={loss} onChange={(e) => { setLoss(Number(e.target.value)); setStage(1) }} /><div className="aw-scale-labels"><span>Clearer connection</span><span>More disruption</span></div></div>
        <details className="aw-payload-details"><summary>Inspect the saved payloads <span aria-hidden="true">↗</span></summary><div className="aw-payload">
          <div className="aw-payload-heading"><span className="aw-caption">Compare what travels</span><span className="aw-caption">Payload only</span></div>
          <div className="aw-format-picker" role="group" aria-label="Message format">{(['A', 'B', 'C'] as const).map((tier) => <button key={tier} type="button" aria-pressed={format === tier} onClick={() => { setFormat(tier); setStage(2) }}><span>{tier === 'A' ? 'Voice' : tier === 'B' ? 'Transcript' : 'Key facts'}</span><strong>{run?.tiers.find((t) => t.tier === tier)?.payload_bytes ?? '—'} <small>B</small></strong></button>)}</div>
          <div className="aw-fact-result" lang={selectedLang} aria-live="polite">{format === 'C' ? facts.map((f) => <span key={f}>{f}</span>) : <p>{format === 'B' ? (sample?.heard ?? 'Transcript loading…') : 'Compressed speech retains the sound of the message.'}</p>}</div>
          <p className="aw-console-note">{selectedTier ? `${selectedTier.bytes_sent} B on the simulated link, including headers and retries. ${format !== 'A' ? (selectedTier.delivered ? 'Delivered in this saved run.' : 'Not delivered in this saved run.') : 'Listen above to hear the channel effect.'}` : 'Loading measured payloads from the saved run.'}</p>
        </div></details>
        <div className="aw-console-bottom"><Link to="/try">Try your voice · all 10 languages ↗</Link><span>SIMULATED LINK</span></div>
      </div><div className="aw-stage-index" aria-label="Story chapter">{CHAPTERS.map((c, i) => <button key={c.label} type="button" aria-label={`Read chapter ${i + 1}`} aria-current={stage === i ? 'step' : undefined} onClick={() => { setStage(i); stepRefs.current[i]?.scrollIntoView({ behavior: reduce ? 'instant' : 'smooth', block: 'center' }) }}>{String(i + 1).padStart(2, '0')}</button>)}<span>A smaller message. The same essential facts.</span></div></div>
    </div>
  </section>
}

function TeachBack() {
  const [changed, setChanged] = useState(false)
  const differences = compareFacts(extract('35 people need medical help at Aluva by 8 pm.'), extract(`${changed ? 53 : 35} people need medical help at Aluva by 8 pm.`))
  const mismatch = differences.length > 0
  return <section className="aw-verification aw-wrap" aria-labelledby="verify-title"><Reveal className="aw-verification-copy"><p className="aw-eyebrow">04 / UNDERSTANDING GOES BOTH WAYS</p><h2 id="verify-title">Heard is good.<br /><em>Understood</em> is better.</h2><p className="aw-body">A number misheard is a different message. Awaaz compares the facts in a read-back with the facts that were sent, so a difference can be caught.</p><p className="aw-small-note">Try changing the number. This illustrative check runs locally; the full teach-back demonstration uses saved Prisma transcripts.</p><Link to="/teachback" className="aw-text-link">Explore teach-back <Arrow /></Link></Reveal><Reveal className="aw-readback">
      <div className="aw-readback-row"><span className="aw-caption">SENT FROM THE FIELD</span><p>Medical assistance: <strong>35 people</strong><br /><span>Aluva · 8 pm</span></p></div>
      <div className="aw-readback-connector"><span /> <span>Read it back</span> <Arrow down /></div>
      <div className={`aw-readback-row ${changed ? 'has-mismatch' : ''}`}><span className="aw-caption">HEARD AT THE CONTROL ROOM</span><p>Medical assistance: <strong>{changed ? '53' : '35'} people</strong><br /><span>Aluva · 8 pm</span></p></div>
      <div className="aw-check-result" role="status"><span>{mismatch ? '↗' : '✓'}</span><div><strong>{mismatch ? 'One number changed. Ask again.' : 'The key facts match.'}</strong><p>{mismatch ? 'Sent: 35 people. Read back: 53 people.' : 'Aluva, 35 people, 8 pm.'}</p></div></div>
      <button type="button" className="aw-text-link" onClick={() => setChanged((v) => !v)}>{changed ? 'Restore the original number' : 'What if a number changes?'} <Arrow /></button>
    </Reveal></section>
}

export default function StoryLanding({ lang }: { lang: Lang }) {
  const [radioOpen, setRadioOpen] = useState(false)
  const reduce = useReducedMotion()
  return <div className="aw-landing" lang="en">
    <section className="aw-hero aw-wrap" aria-labelledby="aw-hero-title">
      <m.div className="aw-hero-copy" initial={reduce ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease }}>
        <p className="aw-eyebrow"><span className="aw-little-star">✳</span> BUILT FOR THE WORDS THAT MATTER</p>
        <h1 id="aw-hero-title">Every voice<br />deserves to<br /><em>reach.</em><span className="aw-headline-dot" aria-hidden="true">↗</span></h1>
        <p className="aw-hero-description">When connections struggle, Awaaz helps critical information travel. From a voice, to a few words, to what matters most.</p>
        <div className="aw-hero-actions"><Link to="/try" className="aw-button">Try Awaaz <Arrow /></Link><button type="button" className="aw-text-link" onClick={() => document.getElementById('the-story')?.scrollIntoView({ behavior: reduce ? 'instant' : 'smooth' })}>Follow a message <Arrow down /></button></div>
        <div className="aw-powered"><span>VOICE INTELLIGENCE BY</span><strong>gnani<span>.ai</span></strong><span>Prisma STT <i>×</i> Timbre TTS</span></div>
      </m.div>
      <m.div className="aw-hero-art" initial={reduce ? false : { opacity: 0, rotate: 3, y: 16 }} animate={{ opacity: 1, rotate: 0, y: 0 }} transition={{ duration: 0.9, delay: 0.12, ease }}>
        <div className="aw-art-corner aw-art-corner-top"><span className="aw-caption">01 — A VOICE FROM THE FIELD</span><span lang="hi" className="aw-hindi-note">आवाज़</span></div>
        <RadioDrawing />
        <div className="aw-paper-message"><div className="aw-paper-message-top"><span className="aw-status-dot" /> FIELD → CONTROL ROOM <span>↗</span></div><p>“35 people need<br /><em>medical help at Aluva.</em>”</p><div className="aw-paper-message-bottom"><span>Every detail has a destination.</span><svg width="28" height="18" viewBox="0 0 28 18" fill="none" aria-hidden="true"><path d="M1 10h4l2-7 4 13 4-14 4 11 3-6 2 3h3" stroke="currentColor" strokeWidth="1.5" /></svg></div></div>
        <div className="aw-hero-listen"><Player src={`${base}data/audio/workspace-medical-en.mp3`} label="a call for medical help" caption="Hear the example · Gnani Timbre" compact /></div>
      </m.div>
      <div className="aw-hero-bottom"><span>DESIGNED FOR CONNECTION. ROOTED IN INDIA.</span><span>Scroll to hear the difference <Arrow down /></span><span>AN INTERACTIVE PROTOTYPE</span></div>
    </section>
    <section className="aw-intro aw-wrap"><Reveal><p className="aw-eyebrow">DISTANCE SHOULDN’T DECIDE WHO GETS HEARD.</p><h2>A voice from the field.<br />A person <em>waiting on the other side.</em></h2></Reveal><Reveal><p className="aw-body">A medical team waiting for a location. A station controller hearing a broken update. A guard calling for support. When the line struggles, the details still matter.</p><p className="aw-small-note">Follow the saved response drills below, or record your own voice in any of Prisma’s ten supported languages.</p><Link to="/try" className="aw-text-link">Record, upload & experiment <Arrow /></Link></Reveal></section>
    <MessageJourney lang={lang} />
    <TeachBack />
    <section className="aw-radio-section"><div className="aw-wrap aw-radio-layout"><Reveal><p className="aw-eyebrow">A SOUND YOU MAY RECOGNISE</p><h2>The crackle.<br />The pause.<br /><em>“Can you hear me?”</em></h2><p className="aw-body">Hear a real amateur-radio exchange. Then explore how smaller messages behave in our separate simulated-link demo.</p><button type="button" className="aw-text-link" aria-expanded={radioOpen} aria-controls="aw-radio-reference" onClick={() => setRadioOpen((v) => !v)}>{radioOpen ? 'Close the recording' : 'Listen to a real radio exchange'} <Arrow /></button></Reveal><div className="aw-radio-reference" id="aw-radio-reference">
      <span className="aw-radio-reference-glyph" aria-hidden="true">“</span>
      {radioOpen ? <><Player src={`${base}assets/radio/ham-contest-exchange.mp3`} label="amateur-radio exchange" caption="26 seconds · Real recording · CC0" /><p className="aw-small-note">Recorded by Meisam, 2017. An amateur-radio contest exchange, not an emergency call or an Awaaz test. An exact transcript is unavailable; use the saved examples above for paired speech and text.</p><a className="aw-source-link" href="https://commons.wikimedia.org/wiki/File:Ham_Contest_Exchange.ogg" target="_blank" rel="noreferrer">Source & licence ↗</a></> : <p className="aw-radio-quote">Behind every transmission,<br />there’s someone<br /><em>trying to be heard.</em></p>}
    </div></div></section>
    <section className="aw-languages aw-wrap"><Reveal><p className="aw-eyebrow">MANY LANGUAGES. THE SAME NEED TO CONNECT.</p><h2>A familiar voice.<br /><em>In your own words.</em></h2></Reveal><div className="aw-language-script" aria-label="Voice in Hindi, Malayalam and Tamil"><span lang="hi">आवाज़</span><span lang="ml">ശബ്ദം</span><span lang="ta">குரல்</span></div><p className="aw-body">Gnani speech services support ten Indian language options. Our measured examples cover English, Hindi and Malayalam. Speech recognition and read-aloud, without translation.</p><Link to="/how" className="aw-text-link">What’s supported, what’s measured <Arrow /></Link></section>
    <section className="aw-final"><div className="aw-wrap"><Reveal><p className="aw-eyebrow">05 / NOW, YOUR VOICE</p><h2>Some words<br />can’t afford to<br /><em>get lost.</em></h2><div className="aw-final-bottom"><p>Hear the examples. Change the connection.<br />See what makes it through.</p><Link to="/try" className="aw-button aw-button-light">Step inside Awaaz <Arrow /></Link></div></Reveal></div></section>
    <section className="aw-evidence aw-wrap"><div><p className="aw-eyebrow">FOR THE CURIOUS. AND THE CRITICAL.</p><h2>Look behind the signal.</h2><p>Explore saved results, the architecture, and the limits of what we’ve tested.</p></div><Link to="/inspect" className="aw-text-link">Explore the evidence <Arrow /></Link></section>
  </div>
}
