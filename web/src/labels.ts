import type { Facts, Lang } from '@/data/types'

/** Display names for places and units; the ids come from the API (same as tinytalk/lexicon.py). */
const PLACES: Record<string, Record<Lang, string>> = {
  aluva: { en: 'Aluva', hi: 'आलुवा', ml: 'ആലുവ' },
  chalakudy: { en: 'Chalakudy', hi: 'चालाकुडी', ml: 'ചാലക്കുടി' },
  kuttanad: { en: 'Kuttanad', hi: 'कुट्टनाड', ml: 'കുട്ടനാട്' },
  pathanamthitta: { en: 'Pathanamthitta', hi: 'पत्तनमतिट्टा', ml: 'പത്തനംതിട്ട' },
  thrissur: { en: 'Thrissur', hi: 'त्रिशूर', ml: 'തൃശ്ശൂർ' },
  kochi: { en: 'Kochi', hi: 'कोच्चि', ml: 'കൊച്ചി' },
  alappuzha: { en: 'Alappuzha', hi: 'अलप्पुझा', ml: 'ആലപ്പുഴ' },
  kottayam: { en: 'Kottayam', hi: 'कोट्टयम', ml: 'കോട്ടയം' },
  ernakulam: { en: 'Ernakulam', hi: 'एर्नाकुलम', ml: 'എറണാകുളം' },
  idukki: { en: 'Idukki', hi: 'इडुक्की', ml: 'ഇടുക്കി' },
  wayanad: { en: 'Wayanad', hi: 'वायनाड', ml: 'വയനാട്' },
  kozhikode: { en: 'Kozhikode', hi: 'कोझिकोड', ml: 'കോഴിക്കോട്' },
}

const UNITS: Record<string, Record<Lang, string>> = {
  people: { en: 'people', hi: 'लोग', ml: 'ആളുകൾ' },
  boats: { en: 'boats', hi: 'नावें', ml: 'ബോട്ടുകൾ' },
  km: { en: 'km', hi: 'किमी', ml: 'കി.മീ' },
  metres: { en: 'metres', hi: 'मीटर', ml: 'മീറ്റർ' },
  litres: { en: 'litres', hi: 'लीटर', ml: 'ലിറ്റർ' },
  food_packets: { en: 'food packets', hi: 'खाने के पैकेट', ml: 'ഭക്ഷണപ്പൊതികൾ' },
}

const PERIODS: Record<Lang, { am: string; pm: string }> = {
  en: { am: 'am', pm: 'pm' },
  hi: { am: 'सुबह', pm: 'शाम' },
  ml: { am: 'രാവിലെ', pm: 'വൈകുന്നേരം' },
}

export type FactKind = 'place' | 'number' | 'time'
export interface Fact {
  kind: FactKind
  key: string
  label: string
}

export function factList(f: Facts, lang: Lang): Fact[] {
  return [
    ...f.places.map((p) => ({ kind: 'place' as const, key: `place:${p}`, label: PLACES[p]?.[lang] ?? p })),
    ...f.numbers.map((n) => ({
      kind: 'number' as const,
      key: `number:${n.value}:${n.unit}`,
      label: `${n.value} ${UNITS[n.unit]?.[lang] ?? n.unit}`,
    })),
    ...f.times.map((t) => ({
      kind: 'time' as const,
      key: `time:${t.hour}:${t.period}`,
      label:
        lang === 'en'
          ? `${t.hour} ${t.period}`
          : `${PERIODS[lang][t.period as 'am' | 'pm'] ?? t.period} ${t.hour}`,
    })),
  ]
}

/** Facts from a teach-back diff entry such as ['numbers', [5, 'metres']]. */
export function diffLabel(kind: string, value: unknown, lang: Lang): string {
  if (kind === 'places') return PLACES[String(value)]?.[lang] ?? String(value)
  if (kind === 'numbers' && Array.isArray(value))
    return `${value[0]} ${UNITS[String(value[1])]?.[lang] ?? value[1]}`
  if (kind === 'times' && Array.isArray(value))
    return lang === 'en' ? `${value[0]} ${value[1]}` : `${PERIODS[lang][value[1] as 'am' | 'pm']} ${value[0]}`
  return String(value)
}
