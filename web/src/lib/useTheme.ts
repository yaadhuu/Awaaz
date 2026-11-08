import { useCallback, useState } from 'react'

type Theme = 'light' | 'dark'

function initial(): Theme {
  try {
    const saved = localStorage.getItem('tinytalk-theme')
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    // storage can be blocked; fall through to the system setting
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** Light or dark, remembered per browser, defaulting to the system setting. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    const t = initial()
    document.documentElement.classList.toggle('dark', t === 'dark')
    return t
  })

  const toggle = useCallback(() => {
    setTheme((current) => {
      const next: Theme = current === 'dark' ? 'light' : 'dark'
      document.documentElement.classList.toggle('dark', next === 'dark')
      try {
        localStorage.setItem('tinytalk-theme', next)
      } catch {
        // ignore: the choice just will not be remembered
      }
      return next
    })
  }, [])

  return { theme, toggle }
}
