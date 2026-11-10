import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ChapterScaffoldProps {
  id: string
  chapterIndex: number
  theme: 'ink' | 'paper'
  title?: string
  subtitle?: string
  heightSvh?: number
  children: ReactNode
  className?: string
}

export function ChapterScaffold({
  id,
  chapterIndex,
  theme,
  title,
  subtitle,
  heightSvh = 200,
  children,
  className,
}: ChapterScaffoldProps) {
  const isInk = theme === 'ink'

  return (
    <section
      id={id}
      aria-label={title || `Chapter ${chapterIndex}`}
      style={{ minHeight: `${heightSvh}svh` }}
      className={cn(
        'relative w-full transition-colors duration-500',
        isInk
          ? 'bg-stage-ink text-stage-ink-text selection:bg-phosphor selection:text-stage-ink'
          : 'bg-paper text-ink selection:bg-turmeric selection:text-paper',
        className,
      )}
    >
      <div className="sticky top-0 h-svh w-full overflow-hidden flex flex-col justify-between p-6 md:p-12 max-w-[1200px] mx-auto">
        {(title || subtitle) && (
          <header className="z-10 mb-4">
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  'font-mono text-xs uppercase tracking-wider px-2 py-0.5 border',
                  isInk
                    ? 'border-stage-ink-rule text-phosphor bg-stage-ink-card'
                    : 'border-rule text-ink bg-card',
                )}
              >
                Chapter {chapterIndex.toString().padStart(2, '0')}
              </span>
              {isInk && (
                <span className="flex items-center gap-1.5 font-mono text-xs text-phosphor">
                  <span className="inline-block w-2 h-2 rounded-full bg-phosphor animate-pulse" />
                  LIVE SIGNAL MONITOR
                </span>
              )}
            </div>
            {title && (
              <h2 className="display mt-3 text-[clamp(2rem,5vw,3.8rem)] leading-[0.98] tracking-tight">
                {title}
              </h2>
            )}
            {subtitle && (
              <p
                className={cn(
                  'mt-2 text-base md:text-lg max-w-xl',
                  isInk ? 'text-stage-ink-muted' : 'text-muted',
                )}
              >
                {subtitle}
              </p>
            )}
          </header>
        )}

        <div className="flex-1 relative flex items-center justify-center">
          {children}
        </div>
      </div>
    </section>
  )
}

