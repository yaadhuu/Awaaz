import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'

test.use({ permissions: ['microphone'], launchOptions: { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] } })

test.beforeEach(async ({ page }) => {
  await page.route('**/api/audio/status', (r) => r.fulfill({ json: { available: true, processing_available: true, live: true, remaining: 4, limit: 4, max_seconds: 30 } }))
})

test('real backend audio processing changes the received preview; all ten languages selectable', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('/#/try')
  await expect(page.getByRole('heading', { level: 1, name: /Your voice, under pressure/ })).toBeVisible()
  const received = page.locator('audio[aria-label="Processed received audio"]')
  await expect(received).toHaveAttribute('src', /^blob:/, { timeout: 20000 })
  const before = await received.getAttribute('src')
  await page.getByRole('combobox', { name: 'Audio codec' }).selectOption('codec2')
  await expect(page.getByRole('combobox', { name: 'Sample rate' })).toBeDisabled()
  await expect(received).not.toHaveAttribute('src', before ?? '', { timeout: 20000 })
  await expect(page.locator('.vw-audio-metrics')).toContainText('2.4')
  await expect(page.getByRole('combobox', { name: 'Spoken language' }).locator('option')).toHaveCount(11)
  await page.getByRole('combobox', { name: 'Spoken language' }).selectOption('kn-IN')
  await page.getByRole('combobox', { name: 'Prisma output' }).selectOption('codemix')
  expect(errors).toEqual([])
})

test('actual recording can stop, preview and transcribe; changing settings invalidates the result', async ({ page }) => {
  let transcriptRequests = 0
  let readAloudLanguage = ''
  await page.route('**/api/audio/speak', (r) => {
    readAloudLanguage = r.request().postDataJSON().language
    return r.fulfill({ json: { audio_b64: readFileSync('public/data/audio/workspace-medical-en.mp3').toString('base64'), content_type: 'audio/mpeg', remaining: 2 } })
  })
  await page.route('**/api/audio/transcribe', (r) => {
    transcriptRequests++
    const request = r.request().postDataJSON()
    return r.fulfill({ json: { transcript: 'ತುರ್ತು ವೈದ್ಯಕೀಯ ಸಹಾಯ ಬೇಕು.', detected_language: 'kn-IN', model: 'prisma-v3.0', format: request.format, elapsed_seconds: 0.6, remaining: 3, clip_id: request.clip_id, audio_sha256: 'a'.repeat(64), reused: false, source: 'gnani_live' } })
  })
  await page.goto('/#/try')
  await page.getByRole('tab', { name: 'Record my voice' }).click()
  await page.getByRole('button', { name: 'Start recording' }).click()
  await expect(page.getByRole('button', { name: 'Stop recording' })).toBeVisible()
  await page.waitForTimeout(750)
  await page.getByRole('button', { name: 'Stop recording' }).click()
  await expect(page.locator('audio[aria-label="Your original recording"]')).toBeVisible()
  await expect(page.locator('audio[aria-label="Processed received audio"]')).toBeVisible({ timeout: 20000 })
  await page.getByRole('combobox', { name: 'Spoken language' }).selectOption('kn-IN')
  await page.getByRole('button', { name: 'Transcribe received audio' }).click()
  await expect(page.locator('.vw-result-text')).toHaveText('ತುರ್ತು ವೈದ್ಯಕೀಯ ಸಹಾಯ ಬೇಕು.')
  expect(transcriptRequests).toBe(1)
  await page.getByRole('combobox', { name: 'Read-aloud language' }).selectOption('kn-IN')
  await page.getByRole('button', { name: 'Read aloud with Timbre' }).click()
  await expect(page.locator('audio[aria-label="Timbre read-aloud"]')).toBeVisible()
  expect(readAloudLanguage).toBe('kn-IN')
  await page.getByRole('slider', { name: 'Simulated loss' }).fill('40')
  await expect(page.locator('.vw-result-text')).toHaveCount(0)
  await expect(page.locator('audio[aria-label="Processed received audio"]')).toBeVisible({ timeout: 20000 })
  expect(transcriptRequests).toBe(1)
  await expect(page.locator('.vw-history')).toContainText('ತುರ್ತು ವೈದ್ಯಕೀಯ ಸಹಾಯ ಬೇಕು.')
})

test('upload handles real MP3 and disabled live service without inventing text', async ({ page }) => {
  await page.route('**/api/audio/status', (r) => r.fulfill({ json: { available: true, processing_available: true, live: false, remaining: 4, limit: 4, max_seconds: 30 } }))
  await page.goto('/#/try')
  await page.getByRole('tab', { name: 'Upload audio' }).click()
  await page.getByLabel('Upload your audio').setInputFiles('public/assets/radio/ham-contest-exchange.mp3')
  await expect(page.locator('audio[aria-label="Processed received audio"]')).toBeVisible({ timeout: 20000 })
  await expect(page.getByRole('button', { name: 'Transcribe received audio' })).toBeDisabled()
  await expect(page.locator('.vw-result-text')).toHaveCount(0)
  await expect(page.getByText(/No saved transcript will be passed off as yours/)).toBeVisible()
})

test('workspace fits narrow mobile and exposes sample credits', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto('/#/try')
  await expect(page.locator('audio[aria-label="Processed received audio"]')).toBeVisible({ timeout: 20000 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1)
  await page.getByRole('combobox', { name: 'Choose a situation' }).selectOption('ham-radio')
  await page.getByText('About this sample', { exact: true }).click()
  await expect(page.getByRole('link', { name: /Source · CC0/ })).toBeVisible()
})
