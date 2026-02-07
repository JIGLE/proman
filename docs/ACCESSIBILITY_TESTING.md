# Accessibility Testing Guide

This document describes how to add and run automated accessibility checks in ProMan.

## Automated Axe Checks in Playwright

Add accessibility assertions to your Playwright E2E tests using `@axe-core/playwright`.

### Setup

```bash
npm install -D @axe-core/playwright
```

### Usage in Tests

```typescript
// e2e/accessibility.spec.ts
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('Accessibility', () => {
  test('dashboard page has no critical a11y violations', async ({ page }) => {
    await page.goto('/')

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()

    expect(results.violations.filter(v => v.impact === 'critical')).toEqual([])
  })

  test('login page has no critical a11y violations', async ({ page }) => {
    await page.goto('/auth/signin')

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()

    expect(results.violations.filter(v => v.impact === 'critical')).toEqual([])
  })

  test('properties page has no critical a11y violations', async ({ page }) => {
    await page.goto('/')
    // Navigate to properties if accessible
    const propertiesLink = page.getByRole('link', { name: /properties/i })
    if (await propertiesLink.isVisible()) {
      await propertiesLink.click()
      await page.waitForLoadState('networkidle')

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze()

      expect(results.violations.filter(v => v.impact === 'critical')).toEqual([])
    }
  })
})
```

### Reporting Violations

For detailed reports, log violations:

```typescript
if (results.violations.length > 0) {
  console.log('Accessibility violations:')
  results.violations.forEach(v => {
    console.log(`  [${v.impact}] ${v.id}: ${v.description}`)
    v.nodes.forEach(n => {
      console.log(`    ${n.html}`)
    })
  })
}
```

## Manual Testing Checklist

- [ ] All interactive elements are keyboard accessible
- [ ] Focus order follows visual/logical order
- [ ] Color contrast meets WCAG AA (4.5:1 for normal text, 3:1 for large text)
- [ ] Images have alt text
- [ ] Forms have associated labels
- [ ] Error messages are announced to screen readers
- [ ] Page has proper heading hierarchy (h1 → h2 → h3)
- [ ] ARIA attributes are used correctly

## Existing Documentation

See also:
- [Accessibility Improvements](ACCESSIBILITY_IMPROVEMENTS.md)
- [Accessibility Quick Reference](ACCESSIBILITY_QUICK_REFERENCE.md)
