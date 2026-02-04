import { describe, it, expect } from 'vitest'
import { renderWithProviders as render, screen, fireEvent } from '@/tests/helpers/render-with-providers'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from './dialog'

describe('Dialog component', () => {
  it('opens when trigger is clicked and shows title/description', async () => {
    render(
      <Dialog>
        <DialogTrigger asChild>
          <button>Open</button>
        </DialogTrigger>
        <DialogContent>
          <DialogTitle>My Dialog</DialogTitle>
          <DialogDescription>Details</DialogDescription>
        </DialogContent>
      </Dialog>
    )

    // Get all buttons and select the first one (the trigger)
    const buttons = screen.getAllByRole('button', { name: /open/i })
    const btn = buttons[0]
    fireEvent.click(btn)

    expect(screen.getByText('My Dialog')).toBeDefined()
    expect(screen.getByText('Details')).toBeDefined()
  })
})

