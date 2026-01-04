#!/usr/bin/env node
const getDatabaseUrl = () => {
  // Allow passing URL as first arg or via DATABASE_URL env var
  if (process.argv[2]) return process.argv[2]
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL
  console.error('No DATABASE_URL provided. Set DATABASE_URL env var or pass the connection string as the first argument.')
  process.exit(2)
}

const url = getDatabaseUrl()

;(async () => {
  try {
    console.log('Attempting to connect to:', url.replace(/(:\/\/[^:]+:)[^@]+@/, '$1***@'))

    // If using SQLite, check the file exists as a lightweight verification.
    if (url.startsWith('file:') || url.includes('sqlite')) {
      const fs = require('fs')
      const path = url.replace(/^file:\/\//, '').replace(/^file:/, '')
      if (fs.existsSync(path)) {
        const stat = fs.statSync(path)
        console.log('Success: SQLite file exists at', path, 'size:', stat.size)
        process.exit(0)
      } else {
        throw new Error('SQLite database file not found: ' + path)
      }
    }

    // Fallback: assume PostgreSQL and use `pg` client
    const { Client } = require('pg')
    const client = new Client({ connectionString: url, connectionTimeoutMillis: 5000, query_timeout: 5000 })
    try {
      await client.connect()
      const res = await client.query('SELECT 1')
      console.log('Success: received result:', res.rows)
      process.exit(0)
    } finally {
      try { await client.end() } catch (e) {}
    }
  } catch (err) {
    console.error('Connection failed:')
    console.error(err && err.message ? err.message : err)
    process.exit(1)
  }
})()
