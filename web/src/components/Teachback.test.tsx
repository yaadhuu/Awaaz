import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import '@/i18n'
import { Teachback } from './Teachback'

afterEach(() => vi.unstubAllGlobals())

const facts = { places: ['kochi'], numbers: [{ value: 5, unit: 'boats' }], times: [] }

function renderIt() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <Teachback sent="5 boats near Kochi" facts={facts} lang="en" />
    </QueryClientProvider>,
  )
}

test('changing a number is reported as a mismatch with what was heard instead', async () => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      match: false,
      missing: [['numbers', [5, 'boats']]],
      wrong: [['numbers', [6, 'boats']]],
    }),
  })
  vi.stubGlobal('fetch', fetchMock)
  renderIt()
  await userEvent.click(screen.getByRole('button', { name: 'Change one number' }))
  expect(screen.getByLabelText('What the receiver says back')).toHaveValue('6 boats near Kochi')
  await userEvent.click(screen.getByRole('button', { name: 'Check' }))
  const result = await screen.findByTestId('teachback-result')
  expect(result).toHaveTextContent('Mismatch caught.')
  expect(result).toHaveTextContent('Missing: 5 boats')
  expect(result).toHaveTextContent('Heard instead: 6 boats')
  const body = JSON.parse(fetchMock.mock.calls[0][1].body as string)
  expect(body).toEqual({ sent: '5 boats near Kochi', readback: '6 boats near Kochi' })
})
