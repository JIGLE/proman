import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { ErrorBoundary, useErrorHandler } from '../components/error-boundary'

function Bomb() {
  throw new Error('boom')
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