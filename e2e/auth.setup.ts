import { test as setup, expect } from '@playwright/test'
import path from 'path'

const authFile = path.join(__dirname, '../playwright/.auth/user.json')

/**
 * Authentication setup for E2E tests
 * 
 * This runs before all tests to establish an authenticated session.
 * For development/testing, we use the demo user credentials.
 */
setup('authenticate', async ({ page }) => {
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
  
  // Fill in demo credentials
  // Note: In production tests, use environment variables for credentials
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
    
    // Wait for navigation to complete
    await page.waitForURL(/\/(en|pt)/)
  }
  
  // Save authentication state
  await page.context().storageState({ path: authFile })
})
