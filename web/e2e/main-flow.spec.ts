import { expect, test, type Page } from '@playwright/test'

const TEXT = 'Flood warning for Aluva. Water level will reach 5 metres by 6 pm.'
const facts = { places: ['aluva'], numbers: [{ value: 5, unit: 'metres' }], times: [{ hour: 6, period: 'pm' }] }
const states = (n: number, lost = 0) => [...Array(n).fill('ok'), ...Array(lost).fill('lost')]
const tier = (t: string, bytes: number, pk: string[]) => ({
  tier: t, available: true, estimated: false, payload_bytes: bytes, bytes_sent: bytes,
  airtime_s: bytes / 250, delivered: !pk.includes('lost'), resends: 0,
  facts_received: t === 'A' ? null : facts, packet_states: pk, note: null,
})

async function mockApi(page: Page) {
  await page.route('**/api/samples**', (r) =>
    r.fulfill({ json: [{ id: 'flood-00-en', text: TEXT, category: 'flood', split: 'test' }] }))
  await page.route('**/api/curve', (r) => r.fulfill({ status: 404, json: { detail: 'not built' } }))
  await page.route('**/api/send', (r) => {
    const loss = r.request().postDataJSON().loss_percent as number
    r.fulfill({
      json: {
        chosen: loss > 10 ? 'B' : 'A', facts_sent: facts,
        tiers: [tier('A', 600, states(12, loss ? 4 : 0)), tier('B', 26, ['ok']), tier('C', 7, ['ok'])],
      },
    })
  })
  await page.route('**/api/teachback', (r) => {
    const { sent, readback } = r.request().postDataJSON() as { sent: string; readback: string }
    r.fulfill({
      json: sent === readback
        ? { match: true, missing: [], wrong: [] }
        : { match: false, missing: [['numbers', [5, 'metres']]], wrong: [['numbers', [6, 'metres']]] },
    })
  })
}

test.beforeEach(async ({ page }) => mockApi(page))

test('opens with an example already sent, and the link setting switches the tier', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('chosen-tier')).toHaveText('A · Audio')
  await expect(page.getByRole('textbox', { name: 'Message' })).toHaveValue(TEXT)

  await page.getByRole('radio', { name: '30%', exact: true }).click()
  await expect(page.getByTestId('chosen-tier')).toHaveText('B · Transcript')
  await expect(page.getByText('Too many packets are lost for audio')).toBeVisible()
  await expect(page.getByTestId('tier-A').getByText('Packets lost: 4')).toBeVisible()
})

test('teach-back catches a changed number and says what was heard instead', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Check' }).click()
  await expect(page.getByTestId('teachback-result')).toContainText('Everything matches.')
  await page.getByRole('button', { name: 'Change one number' }).click()
  await page.getByRole('button', { name: 'Check' }).click()
  await expect(page.getByTestId('teachback-result')).toContainText('Mismatch caught.')
  await expect(page.getByTestId('teachback-result')).toContainText('Heard instead: 6 metres')
})

test('keyboard moves the link setting; language and theme switches work', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('radio', { name: '0%', exact: true }).focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('radio', { name: '10%', exact: true })).toBeChecked()

  await page.getByRole('radio', { name: 'हिन्दी' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('तथ्य भेजें')
  await expect(page.getByRole('button', { name: 'संदेश भेजें' })).toBeVisible()

  await page.getByRole('button', { name: 'डार्क मोड चालू करें' }).click()
  await expect(page.locator('html')).toHaveClass(/dark/)
})
