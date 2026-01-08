import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { ErrorBoundary } from '../components/error-boundary'

function Bomb(): React.ReactElement {
  throw new Error('boom')
  // unreachable, but provide a React node so TypeScript recognizes this as a component
  return <div />
}

describe('ErrorBoundary', () => {
  it('renders default fallback when child throws', () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    )

    expect(screen.getByText(/Something went wrong/)).toBeDefined()
  })

  it('uses custom fallback when provided', () => {
    const Fallback = ({ error, resetError }: { error?: Error; resetError: () => void }) => (
      <div>
        <span>Custom: {error?.message}</span>
        <button onClick={resetError}>Reset</button>
      </div>
    )

    render(
      <ErrorBoundary fallback={Fallback}>
        <Bomb />
      </ErrorBoundary>
    )

    expect(screen.getByText(/Custom: boom/)).toBeDefined()
  })
})