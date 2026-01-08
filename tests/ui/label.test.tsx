import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Label } from '../../components/ui/label'

describe('Label component', () => {
  it('renders children and applies className', () => {
    render(<Label className="lbl">Name</Label>)
    expect(screen.getByText('Name')).toBeDefined()
    const el = document.querySelector('.lbl')
    expect(el).toBeDefined()
  })
})