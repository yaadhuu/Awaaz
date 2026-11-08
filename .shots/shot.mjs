import { chromium } from '@playwright/test'
const pages = process.argv.slice(2)
const b = await chromium.launch()
for (const spec of pages) {
  const [path, w, lang] = spec.split(':')
  const ctx = await b.newContext({ viewport: { width: Number(w), height: 900 } })
  const p = await ctx.newPage()
  const errs = []
  p.on('console', (m) => m.type() === 'error' && errs.push(m.text()))
  p.on('pageerror', (e) => errs.push(String(e)))
  if (lang) await p.addInitScript((l) => localStorage.setItem('tinytalk-lang', l), lang)
  await p.goto(`http://localhost:4173/#${path}`)
  await p.waitForTimeout(1500)
  const name = (path.replace(/\//g, '_') || 'home') + `-${w}${lang ? '-' + lang : ''}`
  await p.screenshot({ path: `../.shots/${name}.png`, fullPage: true })
  console.log(name, errs.length ? 'ERRORS: ' + errs.join(' | ').slice(0, 300) : 'ok')
  await ctx.close()
}
await b.close()
