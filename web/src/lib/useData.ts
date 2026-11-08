import { useQuery } from '@tanstack/react-query'
import { source } from '@/data/source'

const opts = { staleTime: Infinity, retry: 1 } as const

export const useCurve = () => useQuery({ queryKey: ['curve'], queryFn: () => source.curve(), ...opts })
export const useMainSummary = () => useQuery({ queryKey: ['main'], queryFn: () => source.mainSummary(), ...opts })
export const usePilot = () => useQuery({ queryKey: ['pilot'], queryFn: () => source.pilotSummary(), ...opts })
export const useSizes = () => useQuery({ queryKey: ['sizes'], queryFn: () => source.sizes(), ...opts })
export const useTeachbackRates = () => useQuery({ queryKey: ['tbrates'], queryFn: () => source.teachbackRates(), ...opts })
export const useTeachbackDemo = () => useQuery({ queryKey: ['tbdemo'], queryFn: () => source.teachbackDemo(), ...opts })
export const useExperiments = () => useQuery({ queryKey: ['exp'], queryFn: () => source.experiments(), ...opts })
export const useBeds = () => useQuery({ queryKey: ['beds'], queryFn: () => source.beds(), ...opts })
export const useStudio = () => useQuery({ queryKey: ['studio'], queryFn: () => source.studio(), ...opts })
export const usePlayground = () => useQuery({ queryKey: ['playground'], queryFn: () => source.playground(), ...opts })
export const useMeta = () => useQuery({ queryKey: ['meta'], queryFn: () => source.meta(), ...opts })
export const useUsage = () =>
  useQuery({
    queryKey: ['usage'],
    queryFn: () => source.usage(),
    refetchInterval: source.kind === 'api' ? 5000 : false,
    retry: 1,
  })
export const useUsageSummary = () =>
  useQuery({
    queryKey: ['usage-summary'],
    queryFn: () => source.usageSummary(),
    refetchInterval: source.kind === 'api' ? 5000 : false,
    retry: 1,
  })
