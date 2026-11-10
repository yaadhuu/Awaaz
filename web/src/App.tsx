import { domAnimation, LazyMotion, MotionConfig } from 'motion/react'
import { lazy, Suspense, useState } from 'react'
import { BrowserRouter, HashRouter, Route, Routes } from 'react-router-dom'
import { Shell } from '@/components/Shell'
import { Loading } from '@/components/States'
import type { Lang } from '@/data/types'
import { loadLang } from '@/i18n'
import StoryLanding from '@/pages/StoryLanding'

const Studio = lazy(() => import('@/pages/Studio'))
const VoiceWorkspace = lazy(() => import('@/pages/VoiceWorkspace'))
const LinkLab = lazy(() => import('@/pages/LinkLab'))
const Teachback = lazy(() => import('@/pages/Teachback'))
const Results = lazy(() => import('@/pages/Results'))
const Playground = lazy(() => import('@/pages/Playground'))
const Usage = lazy(() => import('@/pages/Usage'))
const Library = lazy(() => import('@/pages/Library'))
const About = lazy(() => import('@/pages/About'))
const HowItWorks = lazy(() => import('@/pages/HowItWorks'))
const CodeViewer = lazy(() => import('@/pages/CodeViewer'))
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
  const [lang, setLang] = useState<Lang>(() => {
    const l = savedLang()
    void loadLang(l)
    document.documentElement.lang = l
    return l
  })
  const pick = (l: Lang) => {
    void loadLang(l).then(() => setLang(l))
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
                <Route path="/" element={<StoryLanding lang={lang} />} />
                <Route path="/try" element={<VoiceWorkspace />} />
                <Route path="/how" element={<HowItWorks />} />
                <Route path="/code/:code" element={<CodeViewer />} />
                <Route path="/inspect" element={<Results lang={lang} />} />
                <Route path="/inspect/results" element={<Results lang={lang} />} />
                <Route path="/inspect/usage" element={<Usage />} />
                <Route path="/inspect/library" element={<Library />} />
                <Route path="/inspect/about" element={<About />} />

                {/* Legacy/Direct routing */}
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
