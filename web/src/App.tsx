import { domAnimation, LazyMotion, MotionConfig } from 'motion/react'
import { lazy, Suspense, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BrowserRouter, HashRouter, Route, Routes } from 'react-router-dom'
import { Shell } from '@/components/Shell'
import { Loading } from '@/components/States'
import type { Lang } from '@/data/types'
import Home from '@/pages/Home'

const Studio = lazy(() => import('@/pages/Studio'))
const LinkLab = lazy(() => import('@/pages/LinkLab'))
const Teachback = lazy(() => import('@/pages/Teachback'))
const Results = lazy(() => import('@/pages/Results'))
const Playground = lazy(() => import('@/pages/Playground'))
const Usage = lazy(() => import('@/pages/Usage'))
const Library = lazy(() => import('@/pages/Library'))
const About = lazy(() => import('@/pages/About'))
const NotFound = lazy(() => import('@/pages/NotFound'))

function savedLang(): Lang {
  try {
    const v = localStorage.getItem('tinytalk-lang')
    if (v === 'ml' || v === 'hi' || v === 'en') return v
  } catch {
    // storage blocked: use English
  }
  return 'en'
}

// The static Replay build can be hosted anywhere, so it uses hash URLs; the live server uses paths.
const Router = import.meta.env.VITE_DATA_SOURCE === 'api' ? BrowserRouter : HashRouter

export default function App() {
  const { i18n } = useTranslation()
  const [lang, setLang] = useState<Lang>(() => {
    const l = savedLang()
    void i18n.changeLanguage(l)
    document.documentElement.lang = l
    return l
  })
  const pick = (l: Lang) => {
    setLang(l)
    void i18n.changeLanguage(l)
    document.documentElement.lang = l
    try {
      localStorage.setItem('tinytalk-lang', l)
    } catch {
      // not remembered
    }
  }
  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={domAnimation} strict>
        <Router>
          <Shell lang={lang} onLang={pick}>
            <Suspense fallback={<Loading />}>
              <Routes>
                <Route path="/" element={<Home lang={lang} />} />
                <Route path="/studio" element={<Studio lang={lang} />} />
                <Route path="/link" element={<LinkLab lang={lang} />} />
                <Route path="/teachback" element={<Teachback lang={lang} />} />
                <Route path="/results" element={<Results lang={lang} />} />
                <Route path="/playground" element={<Playground lang={lang} />} />
                <Route path="/usage" element={<Usage />} />
                <Route path="/library" element={<Library />} />
                <Route path="/about" element={<About />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </Shell>
        </Router>
      </LazyMotion>
    </MotionConfig>
  )
}
