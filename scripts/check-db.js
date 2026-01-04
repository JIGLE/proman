#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

const { Client } = (() => {
  try { return require('pg') } catch (e) { return null }
})()

const getDatabaseUrl = () => {
  // Allow passing URL as first arg or via DATABASE_URL env var
  if (process.argv[2]) return process.argv[2]
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL
  console.error('No DATABASE_URL provided. Set DATABASE_URL env var or pass the connection string as the first argument.')
  process.exit(2)
}

const url = getDatabaseUrl()

if (url.startsWith('file:')) {
  const dbPath = url.replace(/^file:\/\//, '').replace(/^file:/, '')
  const resolved = path.resolve(dbPath)
  console.log('Checking SQLite DB file at:', resolved)

  if (fs.existsSync(resolved)) {
    console.log('Success: SQLite DB file exists')
    process.exit(0)
  } else {
    console.log('SQLite DB file does not exist. You can create it with `npx prisma db push`')
    process.exit(1)
  }
} else {
  if (!Client) {
    console.error('Postgres client not installed. Install `pg` to check a PostgreSQL database, or use a SQLite DATABASE_URL.')
    process.exit(2)
  }

  const client = new Client({ connectionString: url, connectionTimeoutMillis: 5000, query_timeout: 5000 })

  ;(async () => {
    try {
      console.log('Attempting to connect to:', url.replace(/(:\/\/[^:]+:)[^@]+@/, '$1***@'))
      await client.connect()
      const res = await client.query('SELECT 1')
      console.log('Success: received result:', res.rows)
      process.exit(0)
    } catch (err) {
      console.error('Connection failed:')
      console.error(err && err.message ? err.message : err)
      process.exit(1)
    } finally {
      try { await client.end() } catch (e) {}
    }
  })()
}