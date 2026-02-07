#!/usr/bin/env node
/**
 * scripts/check-translations.js
 *
 * Validates that all translation files in messages/ have the same keys.
 * Reports missing or extra keys compared to the reference locale (en.json).
 *
 * Usage:
 *   node scripts/check-translations.js
 *   node scripts/check-translations.js --strict   # exit 1 on any diff
 */

const fs = require('fs')
const path = require('path')

const MESSAGES_DIR = path.join(__dirname, '..', 'messages')
const REFERENCE_LOCALE = 'en.json'
const strict = process.argv.includes('--strict')

/**
 * Recursively collect all keys from a nested object, using dot notation.
 */
function collectKeys(obj, prefix = '') {
  const keys = []
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...collectKeys(value, fullKey))
    } else {
      keys.push(fullKey)
    }
  }
  return keys
}

function main() {
  // Load reference locale
  const refPath = path.join(MESSAGES_DIR, REFERENCE_LOCALE)
  if (!fs.existsSync(refPath)) {
    console.error(`Reference locale not found: ${refPath}`)
    process.exit(1)
  }

  const refData = JSON.parse(fs.readFileSync(refPath, 'utf-8'))
  const refKeys = new Set(collectKeys(refData))
  console.log(`Reference: ${REFERENCE_LOCALE} (${refKeys.size} keys)\n`)

  // Find all other locales
  const files = fs.readdirSync(MESSAGES_DIR).filter(f => f.endsWith('.json') && f !== REFERENCE_LOCALE)

  if (files.length === 0) {
    console.log('No other locale files found.')
    return
  }

  let hasIssues = false

  for (const file of files) {
    const filePath = path.join(MESSAGES_DIR, file)
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    const keys = new Set(collectKeys(data))

    const missing = [...refKeys].filter(k => !keys.has(k))
    const extra = [...keys].filter(k => !refKeys.has(k))

    const status = missing.length === 0 && extra.length === 0 ? '✓' : '✗'
    console.log(`${status} ${file} (${keys.size} keys)`)

    if (missing.length > 0) {
      hasIssues = true
      console.log(`  Missing (${missing.length}):`)
      for (const k of missing.slice(0, 20)) {
        console.log(`    - ${k}`)
      }
      if (missing.length > 20) {
        console.log(`    ... and ${missing.length - 20} more`)
      }
    }

    if (extra.length > 0) {
      hasIssues = true
      console.log(`  Extra (${extra.length}):`)
      for (const k of extra.slice(0, 10)) {
        console.log(`    + ${k}`)
      }
      if (extra.length > 10) {
        console.log(`    ... and ${extra.length - 10} more`)
      }
    }

    console.log('')
  }

  // Summary
  const totalLocales = files.length + 1
  console.log(`\nChecked ${totalLocales} locale(s). ${hasIssues ? 'Issues found.' : 'All translations complete.'}`)

  if (strict && hasIssues) {
    process.exit(1)
  }
}

main()
