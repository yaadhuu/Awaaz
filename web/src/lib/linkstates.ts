/**
 * linkstates.ts — L0 to L3 link state definitions.
 *
 * Python twin: tinytalk/linkstates.py
 *
 * The delivery mode and tier mapping come from the tier-picker rule in
 * tinytalk/tiers.py (pick_tier).  Demo presets are illustrative defaults;
 * the actual tier is computed at runtime.
 *
 * Labels EVERYWHERE: "demo preset, not a field measurement"
 * We do NOT model or return dBm, RSSI or SNR.
 */

export type LinkStateId = 'L0' | 'L1' | 'L2' | 'L3'
export type DeliveryMode = 'full_audio' | 'transcript' | 'facts_only' | 'store_and_forward'
export type Tier = 'A' | 'B' | 'C' | null

export interface LinkState {
  id: LinkStateId
  level: 0 | 1 | 2 | 3
  name: string
  deliveryMode: DeliveryMode
  /** Tier A/B/C for L0-L2; null for L3 (no transmission). */
  tier: Tier
  subtitle: string
  /** kbps for the demo preset; null = link down. */
  demoRateKbps: number | null
  /** packet loss % for the demo preset. */
  demoLossPercent: number | null
  /** Always shown next to preset values. */
  demoNote: 'demo preset, not a field measurement'
}

export const LINK_STATES: readonly LinkState[] = [
  {
    id: 'L0',
    level: 0,
    name: 'Nominal',
    deliveryMode: 'full_audio',
    tier: 'A',
    subtitle: 'Audio and captions — full quality',
    demoRateKbps: 10,
    demoLossPercent: 0,
    demoNote: 'demo preset, not a field measurement',
  },
  {
    id: 'L1',
    level: 1,
    name: 'Degraded',
    deliveryMode: 'transcript',
    tier: 'B',
    subtitle: 'Key words and text — compressed transcript',
    demoRateKbps: 5,
    demoLossPercent: 10,
    demoNote: 'demo preset, not a field measurement',
  },
  {
    id: 'L2',
    level: 2,
    name: 'Critical',
    deliveryMode: 'facts_only',
    tier: 'C',
    subtitle: 'Key facts only — about 7 bytes',
    demoRateKbps: 2,
    demoLossPercent: 30,
    demoNote: 'demo preset, not a field measurement',
  },
  {
    id: 'L3',
    level: 3,
    name: 'Outage',
    deliveryMode: 'store_and_forward',
    tier: null,
    subtitle: 'Held and retried — no Gnani call',
    demoRateKbps: null,
    demoLossPercent: null,
    demoNote: 'demo preset, not a field measurement',
  },
]

export const LINK_STATE_MAP: Readonly<Record<LinkStateId, LinkState>> = Object.fromEntries(
  LINK_STATES.map((s) => [s.id, s]),
) as Readonly<Record<LinkStateId, LinkState>>

/** Look up by id ('L0'..'L3') or numeric level (0..3). */
export function getLinkState(idOrLevel: LinkStateId | number): LinkState | undefined {
  if (typeof idOrLevel === 'number') return LINK_STATES[idOrLevel]
  return LINK_STATE_MAP[idOrLevel]
}

