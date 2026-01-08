import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '../../components/ui/dialog'

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

    const btn = screen.getByRole('button', { name: /open/i })
    fireEvent.click(btn)

    expect(screen.getByText('My Dialog')).toBeDefined()
    expect(screen.getByText('Details')).toBeDefined()
  })
})