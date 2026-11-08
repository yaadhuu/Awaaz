export type Lang = 'ml' | 'hi' | 'en'
export type Tier = 'A' | 'B' | 'C'
export type PacketState = 'ok' | 'resent' | 'lost'

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
  packet_states: PacketState[]
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
  category: 'flood' | 'boats' | 'supply' | 'medical'
  split: 'dev' | 'test'
  facts: Facts
}

export interface Measured {
  tier: Tier
  loss: number
  matched: number
  total: number
  bytes_sent: number
  delivered: boolean
}

export interface Studio {
  samples: Record<Lang, Sample[]>
  runs: Record<string, SendResponse>
  audio: Record<string, Record<string, string>>
  measured: Record<string, Measured[]>
  heard: Record<string, string | null>
}

export interface CurvePoint {
  tier: Tier
  lang: Lang
  loss: number
  messages: number
  fact_rate: number
  fact_rate_ci: [number, number]
  payload_bytes_per_min: number
  wire_bytes_per_min: number
  mean_airtime_s: Record<string, number>
  delivered_rate: number
}

export interface Summary {
  messages: number
  facts_matched: number
  facts_total: number
  facts_extra: number
  fact_rate: number
  fact_rate_ci: [number, number]
  message_exact: number
  message_exact_rate: number
  message_exact_ci: [number, number]
  wer: number
  wer_ci: [number, number]
  cer: number
  cer_ci: [number, number]
}

export interface TeachbackRate {
  lang: Lang
  condition: string
  altered: number
  caught: number
  catch_rate: number
  catch_ci: [number, number]
  unaltered: number
  false_alarms: number
  false_alarm_rate: number
  false_alarm_ci: [number, number]
}

export interface TeachbackCheck {
  match: boolean
  missing: [string, unknown][]
  wrong: [string, unknown][]
  sent: Facts
  readback: Facts
}

export interface TeachbackDemo {
  sent: string
  heard: string | null
  heard_check: TeachbackCheck
  altered: string
  altered_kind: string
  altered_check: TeachbackCheck
}

export interface Experiment {
  id: string
  title: string
  body: string
}

export type MeterLevel = 'ok' | 'warn50' | 'warn80' | 'warn95' | 'stop'

export interface LedgerRow {
  time: string | null
  kind: 'stt' | 'tts'
  language: string | null
  size: number | null
  size_unit: 's' | 'chars'
  attempts: number
  credits: number | null
  cache_hit: boolean
  status: number | string | null
}

export interface Usage {
  rate_configured: boolean
  unit: 'credits' | 'calls'
  used: number | null
  cap: number
  share: number
  level: MeterLevel
  remaining_credits: number | null
  starting_balance: number
  calibrated: boolean
  calls: number
  audio_seconds: number
  characters: number
  by_day: Record<string, { stt: number; tts: number; calls: number }>
  by_kind: { stt: number; tts: number }
  live: boolean
  queue: number
  ledger: LedgerRow[]
}

export interface Bed {
  title: string
  source: string
  source_url: string
  author: string
  licence: string
  licence_url: string
  description: string
  web_file: string
  accessed: string
  sha256: string
  duration_s: number
  voiced_share: number | null
  peaks: number[]
}

export interface PlaygroundRun {
  label: string
  tts: { text: string; language: string; voice: string; speed: number; audio: string }
  stt: {
    language_code: string
    format: string
    result: {
      transcript: string
      request_id?: string
      detected_language_code?: string
      processing_time?: number
      end_to_end_latency?: number
      model?: string
    }
  }
}

export interface Meta {
  built: string
  commit: string
  repo: string
  sources: Record<string, string>
}

export interface Estimate {
  credits: number | null
  rate_configured: boolean
  units: { audio_seconds?: number; characters?: number }
  confirm_needed: boolean
  meter: Usage
}

export interface Spend {
  calls: number
  cache_hits: number
  credits: number | null
}

export interface SttResponse {
  result: PlaygroundRun['stt']['result']
  audio_seconds: number
  estimate: number | null
  actual: Spend
  usage: Usage
}

export interface TtsResponse {
  audio_b64: string
  content_type: string
  estimate: number | null
  actual: Spend
  usage: Usage
}
