import * as fs from 'fs'
import * as path from 'path'
import { db } from '../db/index.js'
import { itemMemos } from '../db/schema.js'
import { and, eq, lte } from 'drizzle-orm'

export function startCleanupJobs() {
  // Auto cleanup job: runs every hour to delete memos completed > 24h ago
  setInterval(async () => {
    try {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const oldMemos = await db.select().from(itemMemos)
        .where(and(eq(itemMemos.isCompleted, true), lte(itemMemos.completedAt, cutoff)))
        
      for (const memo of oldMemos) {
        try {
          // 1. Delete record first to ensure DB consistency
          await db.delete(itemMemos).where(eq(itemMemos.id, memo.id))
          
          // 2. Delete file only if DB deletion succeeded
          if (memo.imageUrl) {
            // extract filename from url
            const filename = memo.imageUrl.split('/').pop()
            if (filename) {
              const filepath = path.resolve(process.cwd(), 'data/uploads', filename)
              const exists = await fs.promises.access(filepath).then(() => true).catch(() => false)
              if (exists) {
                await fs.promises.unlink(filepath)
              }
            }
          }
        } catch (innerErr) {
          console.error(`[Cleanup] Failed to clean up memo ${memo.id}:`, innerErr)
        }
      }
    } catch (error) {
      console.error('Memo cleanup job error:', error)
    }
  }, 60 * 60 * 1000)

  // Auto cleanup job for thumbnails cache: runs every 12 hours
  setInterval(async () => {
    try {
      const cacheDir = path.resolve(process.cwd(), 'data/uploads/.cache')
      const cacheDirExists = await fs.promises.access(cacheDir).then(() => true).catch(() => false)
      if (!cacheDirExists) return

      const now = Date.now()
      const maxAgeMs = 7 * 24 * 60 * 60 * 1000 // 7 days

      const files = await fs.promises.readdir(cacheDir)
      for (const file of files) {
        try {
          const filepath = path.join(cacheDir, file)
          const stats = await fs.promises.stat(filepath)
          // 如果文件超过 7 天未被修改（或访问），则清理
          if (now - stats.mtimeMs > maxAgeMs) {
            await fs.promises.unlink(filepath)
          }
        } catch (innerErr) {
          console.error(`[Cleanup] Failed to clean up cache file ${file}:`, innerErr)
        }
      }
    } catch (error) {
      console.error('Thumbnail cache cleanup error:', error)
    }
  }, 12 * 60 * 60 * 1000)
}
