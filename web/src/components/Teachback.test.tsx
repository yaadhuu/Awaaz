import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import '@/i18n'
import { Teachback } from './Teachback'

afterEach(() => vi.unstubAllGlobals())

function renderIt() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <Teachback sent="5 boats near Kochi" />
    </QueryClientProvider>,
  )
}

test('changing a number is reported as a mismatch', async () => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ match: false, missing: [], wrong: [] }),
  })
  vi.stubGlobal('fetch', fetchMock)
  renderIt()
  await userEvent.click(screen.getByRole('button', { name: 'Change one number' }))
  expect(screen.getByRole('textbox')).toHaveValue('6 boats near Kochi')
  await userEvent.click(screen.getByRole('button', { name: 'Check' }))
  expect(await screen.findByTestId('teachback-result')).toHaveTextContent('Mismatch caught')
  const sent = JSON.parse(fetchMock.mock.calls[0][1].body as string)
  expect(sent).toEqual({ sent: '5 boats near Kochi', readback: '6 boats near Kochi' })
})
