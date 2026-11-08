import { expect, test } from '@playwright/test'

const errors: string[] = []
test.beforeEach(async ({ page }) => {
  errors.length = 0
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
})
test.afterEach(() => expect(errors).toEqual([]))

test('studio: a bad link switches to the transcript and the receiver reads it', async ({ page }) => {
  await page.goto('/#/studio')
  await expect(page.getByRole('heading', { name: 'Studio', level: 1 })).toBeVisible()
  await expect(page.getByTestId('studio-tier-A')).toHaveAttribute('aria-current', 'true')
  await page.getByRole('radio', { name: '30%', exact: true }).click()
  await expect(page.getByTestId('studio-tier-B')).toHaveAttribute('aria-current', 'true')
  await expect(page.getByText('The receiver reads the transcript.')).toBeVisible()
  await expect(page.getByTestId('studio-tier-A').getByText(/packets · [1-9]\d* lost/)).toBeVisible()
})

test('link lab: the dial is a keyboard slider and airtime follows it', async ({ page }) => {
  await page.goto('/#/link')
  const dial = page.getByRole('slider', { name: 'Link speed' })
  await expect(dial).toHaveAttribute('aria-valuenow', '5')
  const air = page.locator('li', { hasText: 'A · Audio' }).locator('.num')
  const before = await air.textContent()
  await dial.focus()
  await page.keyboard.press('ArrowRight')
  await expect(dial).toHaveAttribute('aria-valuenow', '10')
  await expect(air).not.toHaveText(before ?? '')
  await expect(page.getByRole('combobox', { name: 'Radio noise bed' })).toBeVisible()
})

test('teach-back: a changed fact is caught, the heard read-back is checked', async ({ page }) => {
  await page.goto('/#/teachback')
  await page.getByRole('button', { name: 'Change one fact' }).click()
  await page.getByRole('button', { name: 'Check' }).click()
  await expect(page.getByTestId('teachback-result')).toContainText('Mismatch caught.')
  await page.getByRole('button', { name: 'Read back as heard' }).click()
  await page.getByRole('button', { name: 'Check' }).click()
  await expect(page.getByTestId('teachback-result')).toBeVisible()
})

test('usage: ledger from the real file, paging and CSV export', async ({ page }) => {
  await page.goto('/#/usage')
  await expect(page.getByText(/Showing 50 of \d+ rows/)).toBeVisible()
  await page.getByRole('button', { name: 'Show more' }).click()
  await expect(page.getByText(/Showing 250 of \d+ rows/)).toBeVisible()
  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export CSV' }).click()
  expect((await dl).suggestedFilename()).toBe('tinytalk-ledger.csv')
})

test('results: every section has its source link', async ({ page }) => {
  await page.goto('/#/results')
  await expect(page.getByRole('link', { name: 'results/curve.json' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'results/main/summary.json' })).toBeVisible()
})

test('404 page in the same style', async ({ page }) => {
  await page.goto('/#/no-such-page')
  await expect(page.getByRole('heading', { name: 'No such page' })).toBeVisible()
})
