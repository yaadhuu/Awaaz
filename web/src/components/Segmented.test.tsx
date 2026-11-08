import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import { Segmented } from './Segmented'

test('arrow keys move the selection and wrap around', async () => {
  const onChange = vi.fn()
  render(
    <Segmented
      label="Packet loss"
      value={0}
      onChange={onChange}
      options={[
        { value: 0, label: '0%' },
        { value: 10, label: '10%' },
      ]}
    />,
  )
  expect(screen.getByRole('radiogroup', { name: 'Packet loss' })).toBeInTheDocument()
  screen.getByRole('radio', { name: '0%' }).focus()
  await userEvent.keyboard('{ArrowRight}')
  expect(onChange).toHaveBeenLastCalledWith(10)
  await userEvent.keyboard('{ArrowLeft}')
  expect(onChange).toHaveBeenLastCalledWith(10) // from value 0, left wraps to the last option
})
