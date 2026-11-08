import { useId, type KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'

interface Option<T extends string | number> {
  value: T
  label: string
}

/** A single-choice control (radio group) with arrow-key support. */
export function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
  className,
  mono = false,
  hideLabel = false,
}: {
  label: string
  value: T
  options: Option<T>[]
  onChange: (v: T) => void
  className?: string
  mono?: boolean
  hideLabel?: boolean
}) {
  const id = useId()

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = options.findIndex((o) => o.value === value)
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const next = options[(i + step + options.length) % options.length]
    onChange(next.value)
    const el = e.currentTarget.querySelector<HTMLElement>(`[data-value="${String(next.value)}"]`)
    el?.focus()
  }

  return (
    <div className={className}>
      <span id={id} className={cn('mb-1.5 block text-sm font-semibold', hideLabel && 'sr-only')}>
        {label}
      </span>
      <div
        role="radiogroup"
        aria-labelledby={id}
        onKeyDown={onKey}
        className="inline-flex w-full border-[1.5px] border-ink"
      >
        {options.map((o) => {
          const active = o.value === value
          return (
            <button
              key={String(o.value)}
              type="button"
              role="radio"
              aria-checked={active}
              data-value={String(o.value)}
              tabIndex={active ? 0 : -1}
              onClick={() => onChange(o.value)}
              className={cn(
                'min-h-10 flex-1 cursor-pointer whitespace-nowrap px-3 text-sm transition-colors [&+&]:border-l [&+&]:border-ink/40',
                mono && 'num',
                active
                  ? 'bg-ink font-semibold text-paper'
                  : 'text-ink hover:bg-card',
              )}
            >
              {o.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
