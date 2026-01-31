import { test as setup } from '@playwright/test'
import path from 'path'

const authFile = path.join(__dirname, '../playwright/.auth/user.json')

/**
 * Authentication setup for E2E tests
 * 
 * In CI environments without real OAuth credentials, this creates a minimal
 * storage state to allow unauthenticated tests to run.
 * 
 * For local development with real credentials, this attempts actual login.
 */
setup('authenticate', async ({ page }) => {
  // In CI without real OAuth, skip actual authentication
  // Tests that require auth will be designed to handle 401s gracefully
  if (process.env.CI) {
    // Create an empty auth state - tests will run unauthenticated
    // This is intentional: our E2E tests verify security (401 responses)
    // rather than authenticated flows
    await page.context().storageState({ path: authFile })
    return
  }
  
  // Navigate to sign-in page
  await page.goto('/auth/signin')
  
  // Wait for the page to be ready
  await page.waitForLoadState('networkidle')
  
  // Check if we're already authenticated (redirected to dashboard)
  const url = page.url()
  if (url.includes('/en') || url.includes('/pt')) {
    // Already logged in
    await page.context().storageState({ path: authFile })
    return
  }
  
  // For local dev with credentials provider (if configured)
  const demoEmail = process.env.E2E_USER_EMAIL || 'demo@proman.local'
  const demoPassword = process.env.E2E_USER_PASSWORD || 'demo123'
  
  // Look for email input
  const emailInput = page.getByLabel(/email/i).or(page.locator('input[type="email"]'))
  const passwordInput = page.getByLabel(/password/i).or(page.locator('input[type="password"]'))
  
  // Fill credentials if inputs exist
  if (await emailInput.isVisible()) {
    await emailInput.fill(demoEmail)
  }
  
  if (await passwordInput.isVisible()) {
    await passwordInput.fill(demoPassword)
  }
  
  // Look for sign-in button
  const signInButton = page.getByRole('button', { name: /sign in|login/i })
  if (await signInButton.isVisible()) {
    await signInButton.click()
    
    // Wait for navigation to complete (with timeout)
    try {
      await page.waitForURL(/\/(en|pt)/, { timeout: 10000 })
    } catch {
      // Auth may have failed - continue anyway with empty state
      console.log('Auth login did not redirect - continuing with unauthenticated state')
    }
  }
  
  // Save authentication state
  await page.context().storageState({ path: authFile })
})
