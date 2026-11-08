import { expect, test } from '@playwright/test'

const TEXT = 'Flood warning for Aluva. Water level will reach 5 metres by 6 pm.'
const facts = { places: ['aluva'], numbers: [{ value: 5, unit: 'metres' }], times: [{ hour: 6, period: 'pm' }] }
const tier = (t: string, bytes: number) => ({
  tier: t, available: true, estimated: false, payload_bytes: bytes, bytes_sent: bytes,
  airtime_s: bytes / 250, delivered: true, resends: 0, facts_received: t === 'A' ? null : facts, note: null,
})

test('send, link slider switches the tier, teach-back catches a changed number', async ({ page }) => {
  await page.route('**/api/samples**', (r) =>
    r.fulfill({ json: [{ id: 'flood-00-en', text: TEXT, category: 'flood', split: 'test' }] }))
  await page.route('**/api/curve', (r) => r.fulfill({ status: 404, json: { detail: 'not built' } }))
  await page.route('**/api/send', (r) => {
    const loss = r.request().postDataJSON().loss_percent as number
    r.fulfill({ json: { chosen: loss > 10 ? 'B' : 'A', facts_sent: facts, tiers: [tier('A', 600), tier('B', 26), tier('C', 7)] } })
  })
  await page.route('**/api/teachback', (r) => {
    const { sent, readback } = r.request().postDataJSON() as { sent: string; readback: string }
    r.fulfill({ json: { match: sent === readback, missing: [], wrong: [] } })
  })

  await page.goto('/')
  await page.getByLabel('Message').fill(TEXT)
  await page.getByRole('button', { name: 'Send' }).click()
  await expect(page.getByTestId('chosen-tier')).toHaveText('A · Audio')

  await page.getByLabel(/Packet loss/).fill('30')
  await expect(page.getByTestId('chosen-tier')).toHaveText('B · Transcript')

  await page.getByRole('button', { name: 'Check' }).click()
  await expect(page.getByTestId('teachback-result')).toHaveText('Everything matches')
  await page.getByRole('button', { name: 'Change one number' }).click()
  await page.getByRole('button', { name: 'Check' }).click()
  await expect(page.getByTestId('teachback-result')).toHaveText('Mismatch caught')

  await page.getByRole('button', { name: 'हिन्दी' }).click()
  await expect(page.getByRole('heading', { name: 'TinyTalk' })).toBeVisible()
  await expect(page.getByText('संदेश', { exact: true })).toBeVisible()
})
