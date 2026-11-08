import { expect, test } from '@playwright/test'

test.use({ reducedMotion: 'reduce' })

test('with reduced motion nothing animates and every page stays reachable', async ({ page }) => {
  await page.goto('/#/')
  const nav = page.getByRole('navigation', { name: 'Main' })
  for (const name of ['Studio', 'Link lab', 'Teach-back', 'Results', 'Playground', 'Usage', 'Library', 'About']) {
    await nav.getByRole('link', { name }).click()
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  }
  await nav.getByRole('link', { name: 'Link lab' }).click()
  await page.getByRole('radio', { name: '30%', exact: true }).click()
  await page.getByRole('slider', { name: 'Link speed' }).focus()
  await page.keyboard.press('ArrowLeft')
  await page.waitForTimeout(50)
  // Anything longer than 20 ms that is still running counts as motion (CSS is cut to 0.01 ms).
  const running = await page.evaluate(
    () => document.getAnimations().filter((a) => a.playState === 'running' && Number(a.effect?.getTiming().duration) > 20).length,
  )
  expect(running).toBe(0)
  const needle = page.locator('svg[role=slider] g').first()
  const first = await needle.evaluate((g) => getComputedStyle(g).transform)
  await page.waitForTimeout(600)
  expect(await needle.evaluate((g) => getComputedStyle(g).transform)).toBe(first)
})
