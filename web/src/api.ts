export type Lang = 'ml' | 'hi' | 'en'
export type Tier = 'A' | 'B' | 'C'

export interface Facts {
  places: string[]
  numbers: { value: number; unit: string }[]
  times: { hour: number; period: string }[]
}

export interface TierReport {
  tier: Tier
  available: boolean
  estimated: boolean
  payload_bytes: number
  bytes_sent: number
  airtime_s: number
  delivered: boolean | null
  resends: number
  facts_received: Facts | null
  packet_states: ('ok' | 'resent' | 'lost')[]
  note: string | null
}

export interface SendResponse {
  chosen: Tier
  facts_sent: Facts
  tiers: TierReport[]
}

export interface Sample {
  id: string
  text: string
  category: string
  split: string
}

export interface CurvePoint {
  tier: Tier
  lang: Lang
  loss: number
  messages: number
  fact_rate: number
  fact_rate_ci: [number, number]
  wire_bytes_per_min: number
}

export interface Teachback {
  match: boolean
  missing: [string, unknown][]
  wrong: [string, unknown][]
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init)
  if (!res.ok) throw new Error(`${res.status}`)
  return res.json() as Promise<T>
}

const post = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

export const getSamples = (lang: Lang) => call<Sample[]>(`/api/samples?lang=${lang}`)
export const getCurve = () => call<CurvePoint[]>('/api/curve')
export const postSend = (b: { text: string; lang: Lang; rate_kbps: number; loss_percent: number }) =>
  call<SendResponse>('/api/send', post({ ...b, tier: 'auto' }))
export const postTeachback = (b: { sent: string; readback: string }) =>
  call<Teachback>('/api/teachback', post(b))
