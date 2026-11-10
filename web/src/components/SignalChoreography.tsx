import { m, useReducedMotion, useTransform, type MotionValue } from 'motion/react'

function SignalPacket({ progress, index }: { progress: MotionValue<number>; index: number }) {
  const x = useTransform(progress, [0, 1], [index * 11, index * 11 + 60])
  const opacity = useTransform(progress, [0, .25, .55, 1], [1, 1, index % 5 < 2 ? .08 : .65, .12])
  const scaleY = useTransform(progress, [0, .4, .8, 1], [1, 1, index % 5 < 2 ? .08 : .45, .1])
  const height = 8 + Math.abs(Math.sin(index * 1.72) * Math.cos(index * .23)) * 42
  return <m.rect x="0" y={45 - height / 2} width="3" height={height} style={{ x, opacity, scaleY, transformOrigin: 'center' }} fill="currentColor" />
}

export function SignalChoreography({ progress, message, facts }: { progress: MotionValue<number>; message: string; facts: string[] }) {
  const reduce = useReducedMotion()
  const opacity = useTransform(progress, [0, .3, .7, 1], [1, 1, .1, 0])
  const y = useTransform(progress, [0, 1], [0, -24])
  const factOpacity = useTransform(progress, [0, .4, .7, 1], [0, 0, 1, 1])
  const factY = useTransform(progress, [0, .5, 1], [24, 24, 0])
  const scaleX = useTransform(progress, [0, 1], [.03, 1])
  return <div className="aw-signal-choreography" aria-hidden="true">
    <div className="aw-scroll-cue">SCROLL TO FOLLOW THE MESSAGE <span>↓</span></div>
    <svg viewBox="0 0 560 90" className="aw-travelling-signal">{Array.from({ length: 44 }, (_, i) => <SignalPacket key={i} index={i} progress={progress} />)}</svg>
    <div className="aw-message-morph"><m.p style={reduce ? undefined : { opacity, y }}>{message}</m.p><m.div className="aw-morph-facts" style={reduce ? { display: 'none' } : { opacity: factOpacity, y: factY }}>{facts.map((fact) => <span key={fact}>{fact}</span>)}</m.div></div>
    <m.div className="aw-story-progress" style={{ scaleX: reduce ? 1 : scaleX }} />
  </div>
}
