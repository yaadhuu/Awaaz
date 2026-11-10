import { useReducedMotion, useScroll } from 'motion/react'
import { useRef, type RefObject } from 'react'

export interface ChapterProgress {
  ref: RefObject<HTMLDivElement | null>
  progress: number
}

/**
 * Hook to track scroll progress (0.0 -> 1.0) through a pinned or tall scene container.
 * When prefers-reduced-motion is active, returns static 1.0 (completed scene state).
 */
export function useChapterProgress(): { ref: RefObject<HTMLDivElement | null>; progress: number } {
  const ref = useRef<HTMLDivElement | null>(null)
  const shouldReduce = useReducedMotion()

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end end'],
  })

  // If reduced motion is requested, immediately present the final accessible state
  if (shouldReduce) {
    return { ref, progress: 1.0 }
  }

  return { ref, progress: scrollYProgress.get() }
}

