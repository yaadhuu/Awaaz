import type {
  Bed,
  CurvePoint,
  Estimate,
  Experiment,
  Lang,
  Meta,
  PlaygroundRun,
  SendResponse,
  Studio,
  SttResponse,
  Summary,
  TeachbackCheck,
  TeachbackDemo,
  TeachbackRate,
  TtsResponse,
  Usage,
} from './types'

/** Error with an HTTP status, so pages can explain refusals (cap reached, access code, replay). */
export class SourceError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

/** One interface for every page. `static` reads the real saved results exported to /data;
 *  `api` reads the same files and adds the live server endpoints. */
export interface DataSource {
  readonly kind: 'static' | 'api'
  meta(): Promise<Meta>
  curve(): Promise<CurvePoint[]>
  mainSummary(): Promise<Record<string, Summary>>
  pilotSummary(): Promise<Record<string, Summary>>
  sizes(): Promise<Record<Lang, { raw_utf8_bytes: number; tier_b_bytes: number; tier_c_bytes: number }>>
  teachbackRates(): Promise<Record<string, TeachbackRate>>
  teachbackDemo(): Promise<Record<string, TeachbackDemo>>
  experiments(): Promise<Experiment[]>
  beds(): Promise<Bed[]>
  studio(): Promise<Studio>
  playground(): Promise<PlaygroundRun[]>
  usage(): Promise<Usage>
  send(req: { text: string; lang: Lang; rate_kbps: number; loss_percent: number; id?: string }): Promise<SendResponse>
  teachback(sent: string, readback: string): Promise<TeachbackCheck>
  estimate(kind: 'stt' | 'tts', amount: number): Promise<Estimate>
  stt(form: FormData): Promise<SttResponse>
  tts(body: Record<string, unknown>): Promise<TtsResponse>
  calibrate(remaining: number): Promise<Usage>
}

const base = import.meta.env.BASE_URL

async function json<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(url, init)
  } catch {
    throw new SourceError(0, 'offline')
  }
  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = (await res.json()) as { detail?: unknown }
      if (typeof body.detail === 'string') detail = body.detail
    } catch {
      // keep the status text
    }
    throw new SourceError(res.status, detail)
  }
  return res.json() as Promise<T>
}

const file = <T,>(name: string) => () => json<T>(`${base}data/${name}`)

let accessCode = ''
export function setAccessCode(code: string) {
  accessCode = code
}

function live(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers)
  if (accessCode) headers.set('X-Access-Code', accessCode)
  return json<never>(path, { ...init, headers })
}

const post = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

const replayOnly = () => Promise.reject(new SourceError(403, 'replay'))

export class StaticSource implements DataSource {
  readonly kind: 'static' | 'api' = 'static'
  meta = file<Meta>('meta.json')
  curve = file<CurvePoint[]>('curve.json')
  mainSummary = file<Record<string, Summary>>('main_summary.json')
  pilotSummary = file<Record<string, Summary>>('pilot_summary.json')
  sizes = file<Record<Lang, { raw_utf8_bytes: number; tier_b_bytes: number; tier_c_bytes: number }>>('sizes.json')
  teachbackRates = file<Record<string, TeachbackRate>>('teachback.json')
  teachbackDemo = file<Record<string, TeachbackDemo>>('teachback_demo.json')
  experiments = file<Experiment[]>('experiments.json')
  beds = file<Bed[]>('beds.json')
  studio = file<Studio>('studio.json')
  playground = file<PlaygroundRun[]>('playground.json')
  usage = file<Usage>('usage.json')

  async send(req: { lang: Lang; rate_kbps: number; loss_percent: number; id?: string }) {
    const s = await this.studio()
    const run = req.id ? s.runs[`${req.id}|${req.rate_kbps}|${req.loss_percent}`] : undefined
    if (!run) throw new SourceError(403, 'replay')
    return run
  }

  async teachback(sent: string, readback: string) {
    const demo = Object.values(await this.teachbackDemo()).find((d) => d.sent === sent)
    if (demo && readback === demo.heard) return demo.heard_check
    if (demo && readback === demo.altered) return demo.altered_check
    throw new SourceError(403, 'replay')
  }

  estimate: DataSource['estimate'] = replayOnly
  stt: DataSource['stt'] = replayOnly
  tts: DataSource['tts'] = replayOnly
  calibrate: DataSource['calibrate'] = replayOnly
}

export class ApiSource extends StaticSource {
  readonly kind = 'api' as const
  usage = () => json<Usage>('/api/usage')
  send = (req: { text: string; lang: Lang; rate_kbps: number; loss_percent: number; id?: string }) =>
    live('/api/send', post({ text: req.text, lang: req.lang, rate_kbps: req.rate_kbps, loss_percent: req.loss_percent })) as Promise<SendResponse>
  teachback = (sent: string, readback: string) =>
    json<TeachbackCheck>('/api/teachback', post({ sent, readback }))
  estimate = (kind: 'stt' | 'tts', amount: number) =>
    json<Estimate>('/api/estimate', post(kind === 'stt' ? { kind, audio_seconds: amount } : { kind, characters: amount }))
  stt = (form: FormData) => live('/api/stt', { method: 'POST', body: form }) as Promise<SttResponse>
  tts = (body: Record<string, unknown>) => live('/api/tts', post(body)) as Promise<TtsResponse>
  calibrate = (remaining: number) => live('/api/usage/calibrate', post({ remaining })) as Promise<Usage>
}

export const source: DataSource =
  import.meta.env.VITE_DATA_SOURCE === 'api' ? new ApiSource() : new StaticSource()
