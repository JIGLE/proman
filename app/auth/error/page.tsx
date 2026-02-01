'use client'

import { Suspense } from 'react'
import { ErrorBoundary } from '@/components/error-boundary'

export const dynamic = 'force-dynamic'

function AuthErrorContent() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="max-w-md w-full mx-4">
        <div className="bg-zinc-900 border border-red-500/20 rounded-lg p-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-zinc-50 mb-2">Authentication Error</h1>
            <p className="text-zinc-400 mb-6">
              There was a problem signing you in. This is usually temporary.
            </p>

            <div className="space-y-3">
              <button
                onClick={() => window.location.href = '/api/auth/signin/google'}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                Try Again
              </button>

              <button
                onClick={() => window.location.href = '/'}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium py-2 px-4 rounded-md transition-colors"
              >
                Go Home
              </button>
            </div>

            <details className="mt-6 text-left">
              <summary className="text-sm text-zinc-500 cursor-pointer hover:text-zinc-400">
                Troubleshooting Info
              </summary>
              <div className="mt-2 p-3 bg-zinc-800 rounded text-xs text-zinc-400 font-mono">
                <div>Error: OAuthAccountNotLinked</div>
                <div className="mt-1">This usually means:</div>
                <ul className="mt-1 ml-4 list-disc space-y-1">
                  <li>Account linking issue with existing user</li>
                  <li>Try clearing browser data and retrying</li>
                  <li>Contact admin if issue persists</li>
                </ul>
              </div>
            </details>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AuthError() {
  return (
    <ErrorBoundary>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-zinc-950">
          <div className="text-zinc-400">Loading...</div>
        </div>
      }>
        <AuthErrorContent />
      </Suspense>
    </ErrorBoundary>
  )
}
