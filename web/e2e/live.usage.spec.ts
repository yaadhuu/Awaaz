import { expect, test } from '@playwright/test'

test('usage meter warns at 80 % of the cap and calibration posts the dashboard balance', async ({ page }) => {
  const usage = {
    rate_configured: false, unit: 'calls', used: 980, cap: 1200, share: 0.8167, level: 'warn80', remaining_credits: null,
    starting_balance: 5000, calibrated: false, calls: 980, audio_seconds: 4000, characters: 9000,
    by_day: { '2026-11-09': { stt: 800, tts: 180, calls: 980 } }, by_kind: { stt: 800, tts: 180 }, live: true, queue: 2,
    ledger: [
      { time: '2026-11-09T10:00:00+0530', kind: 'stt', language: 'ml-IN', size: 9.1, size_unit: 's', attempts: 1, credits: null, cache_hit: false, status: 200 },
    ],
  }
  let calibrated = 0
  await page.route('**/api/usage', (r) => r.fulfill({ json: usage }))
  await page.route('**/api/usage/calibrate', (r) => {
    calibrated = (r.request().postDataJSON() as { remaining: number }).remaining
    r.fulfill({ json: usage })
  })
  await page.goto('/usage')
  await expect(page.getByText('Four fifths of the cap is used.').first()).toBeVisible()
  await page.getByLabel('Balance on the Gnani dashboard').fill('4123')
  await page.getByLabel('Access code').first().fill('x')
  await page.getByRole('button', { name: 'Calibrate' }).click()
  await expect.poll(() => calibrated).toBe(4123)
})
