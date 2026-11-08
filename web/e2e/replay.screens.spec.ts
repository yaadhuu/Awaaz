import { expect, test } from '@playwright/test'

const PAGES = ['', 'studio', 'link', 'teachback', 'results', 'playground', 'usage', 'library', 'about', 'missing']
const WIDTHS = [360, 768, 1280]
const LANGS = ['en', 'ml', 'hi']

for (const lang of LANGS) {
  for (const width of WIDTHS) {
    test(`screens ${lang} ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.addInitScript((l) => localStorage.setItem('tinytalk-lang', l), lang)
      for (const p of PAGES) {
        await page.goto(`/#/${p}`)
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
        await page.waitForTimeout(300)
        // No horizontal page scroll at any width.
        const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
        expect(over, `${p} overflows by ${over}px`).toBeLessThanOrEqual(1)
        // Malayalam and Devanagari glyphs must not be cut off by a box that hides its overflow.
        const clipped = await page.evaluate(() =>
          [...document.querySelectorAll('[lang=ml], [lang=hi], [lang=ml] *, [lang=hi] *')]
            .filter((el) => {
              const s = getComputedStyle(el)
              const hides = ['hidden', 'clip'].includes(s.overflowY) || ['hidden', 'clip'].includes(s.overflowX)
              const cut = el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1
              return hides && cut && !!el.textContent?.trim() && !el.classList.contains('sr-only')
            })
            .map((el) => `${el.tagName}.${el.className}`.slice(0, 80)),
        )
        expect(clipped, `${p} clipped`).toEqual([])
        await page.screenshot({ path: `test-results/screens/${lang}-${width}-${p || 'home'}.png`, fullPage: true })
      }
    })
  }
}
