import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Select, SelectTrigger, SelectContent, SelectItem } from '../../components/ui/select'

describe('Select component', () => {
  it('renders trigger text', () => {
    render(
      <Select>
        <SelectTrigger>Choose</SelectTrigger>
        <SelectContent>
          <SelectItem value="a">A</SelectItem>
        </SelectContent>
      </Select>
    )

    expect(screen.getByText('Choose')).toBeDefined()
  })
})