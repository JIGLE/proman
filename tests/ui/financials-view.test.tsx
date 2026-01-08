import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FinancialsView } from '../../components/financials-view'

describe('FinancialsView', () => {
  it('renders summary cards', () => {
    render(<FinancialsView />)
    expect(screen.getByText(/Financial Overview/)).toBeDefined()
    expect(screen.getByText(/Total Revenue/)).toBeDefined()
  })
})