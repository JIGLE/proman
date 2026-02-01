'use client'

import { Suspense } from 'react'
import { signIn, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { ErrorBoundary } from '@/components/shared/error-boundary'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'

function SignInContent() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/')
    }
  }, [status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="text-zinc-400">Loading...</div>
      </div>
    )
  }

  if (session) {
    return null // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="max-w-md w-full mx-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>

            <h1 className="text-2xl font-bold text-zinc-50 mb-2">Welcome to ProMan</h1>
            <p className="text-zinc-400 mb-8">
              Sign in with Google to access your property management dashboard
            </p>

            <Button
              onClick={() => signIn('google', { callbackUrl: '/' })}
              className="w-full bg-white hover:bg-zinc-100 text-zinc-900 font-medium py-3 px-4 rounded-md transition-colors flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign in with Google
            </Button>

            {process.env.NODE_ENV !== 'production' && (
              <div className="mt-6 pt-6 border-t border-zinc-800">
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    signIn('credentials', { 
                      email: formData.get('email'), 
                      password: formData.get('password'),
                      callbackUrl: '/' 
                    });
                  }}
                  className="space-y-3"
                >
                  <div className="text-xs text-zinc-500 uppercase font-semibold">Dev Login</div>
                  <input 
                    name="email" 
                    type="email" 
                    defaultValue="demo@proman.local" 
                    className="w-full bg-zinc-800 text-sm text-zinc-200 p-3 rounded-md border border-zinc-700 focus:border-blue-500 outline-none" 
                    placeholder="Email" 
                  />
                  <input 
                    name="password" 
                    type="password" 
                    defaultValue="demo123" 
                    className="w-full bg-zinc-800 text-sm text-zinc-200 p-3 rounded-md border border-zinc-700 focus:border-blue-500 outline-none" 
                    placeholder="Password" 
                  />
                  <Button type="submit" variant="secondary" className="w-full h-10">
                    Sign in with Credentials
                  </Button>
                </form>
              </div>
            )}

            <div className="mt-6 text-center">
              <p className="text-sm text-zinc-500">
                Secure authentication powered by Google OAuth
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SignIn() {
  return (
    <ErrorBoundary>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-zinc-950">
          <div className="text-zinc-400">Loading...</div>
        </div>
      }>
        <SignInContent />
      </Suspense>
    </ErrorBoundary>
  )
}
