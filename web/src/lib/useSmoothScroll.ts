import { useEffect } from 'react'
import { useReducedMotion } from 'motion/react'
import 'lenis/dist/lenis.css'

export function useSmoothScroll(enabled: boolean) {
  const reduce = useReducedMotion()
  useEffect(() => {
    if (!enabled || reduce) return
    let disposed = false
    let destroy: (() => void) | undefined
    void import('lenis').then(({ default: Lenis }) => {
      if (disposed) return
      const lenis = new Lenis({ autoRaf: true, lerp: .1, smoothWheel: true, syncTouch: false, anchors: false })
      destroy = () => lenis.destroy()
    })
    return () => { disposed = true; destroy?.() }
  }, [enabled, reduce])
}
