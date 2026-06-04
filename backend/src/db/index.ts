// 模块：数据库连接与配置入口
import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import * as schema from './schema.js'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Calculate path relative to root to avoid issues when running dist vs src
const dataDir = path.resolve(process.cwd(), 'data')
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const dbPath = process.env.DB_PATH || path.resolve(dataDir, 'supermarket.db')
const sqlite = new Database(dbPath)

// Enable foreign keys constraints in SQLite
sqlite.pragma('foreign_keys = ON')

// Enable high concurrency mode (WAL)
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('synchronous = NORMAL')
sqlite.pragma('busy_timeout = 5000')

export const db = drizzle(sqlite, { schema })

// Run migrations on startup
try {
  console.log('[DB] Running migrations...')
  const migrationsFolder = path.resolve(process.cwd(), 'drizzle')
  if (fs.existsSync(migrationsFolder)) {
    migrate(db, { migrationsFolder })
    console.log('[DB] Migrations applied successfully!')
  } else {
    console.log('[DB] No migrations folder found, skipping auto-migration.')
  }
} catch (e) {
  console.error('[DB] Failed to run migrations:', e)
}
