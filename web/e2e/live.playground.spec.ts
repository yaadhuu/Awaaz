import { expect, test } from '@playwright/test'

// Fake server: the live edition's API is answered here, so no credit is ever spent.
const usage = {
  rate_configured: true, unit: 'credits', used: 100, cap: 4500, share: 0.02, level: 'ok', remaining_credits: 4900,
  starting_balance: 5000, calibrated: false, calls: 10, audio_seconds: 40, characters: 500,
  by_day: { '2026-11-09': { stt: 6, tts: 4, calls: 10 } }, by_kind: { stt: 6, tts: 4 }, live: true, queue: 0, ledger: [],
}

test.beforeEach(async ({ page }) => {
  await page.route('**/api/usage', (r) => r.fulfill({ json: usage }))
  await page.route('**/api/estimate', (r) => {
    const body = r.request().postDataJSON() as { kind: string }
    const units = body.kind === 'tts' ? { characters: 20 } : { audio_seconds: 4 }
    r.fulfill({ json: { credits: 30, rate_configured: true, units, confirm_needed: true, meter: usage } })
  })
})

test('tts: estimate, confirm above the threshold, then actual cost and audio', async ({ page }) => {
  let sent: Record<string, unknown> = {}
  let code = ''
  await page.route('**/api/tts', (r) => {
    sent = r.request().postDataJSON()
    code = r.request().headers()['x-access-code']
    r.fulfill({
      json: { audio_b64: 'UklGRg==', content_type: 'audio/wav', estimate: 30, actual: { calls: 1, cache_hits: 0, credits: 29.5 }, usage },
    })
  })
  await page.goto('/playground')
  await page.getByLabel('Access code').first().fill('letmein')
  await page.getByRole('tab', { name: /Text to speech/ }).click()
  await page.getByLabel('Text', { exact: true }).fill('Flood warning for Aluva')
  await page.getByRole('button', { name: '<pauses>' }).click()
  await page.getByRole('button', { name: 'Speak' }).click()
  await expect(page.getByRole('alertdialog')).toContainText('about 30.0 credits')
  await page.getByRole('button', { name: 'Spend and continue' }).click()
  await expect(page.getByText('29.5 credits')).toBeVisible()
  expect(sent.confirm).toBe(true)
  expect(String(sent.text)).toContain('<pauses>')
  expect(code).toBe('letmein')
  await expect(page.getByRole('link', { name: 'Download' })).toBeVisible()
})

test('stt: refusal at the cap is explained', async ({ page }) => {
  await page.route('**/api/stt', (r) =>
    r.fulfill({ status: 402, json: { detail: 'The credit cap is reached; the server refuses live calls.' } }),
  )
  await page.goto('/playground')
  await page.getByLabel('Audio file').setInputFiles({ name: 'a.wav', mimeType: 'audio/wav', buffer: Buffer.from('RIFF0000WAVE') })
  await page.getByRole('button', { name: 'Transcribe' }).click()
  await page.getByRole('button', { name: 'Spend and continue' }).click()
  await expect(page.getByRole('alert')).toContainText('402')
})
