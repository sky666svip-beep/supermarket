import 'dotenv/config'
import { createServer } from 'http'
import { getRequestListener } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import { db } from './db/index.js'
import { itemMemos } from './db/schema.js'
import { and, eq, lte } from 'drizzle-orm'

import customer from './routes/customer.js'
import { auth } from './routes/auth.js'
import { admin } from './routes/admin.js'
import { handleUpload, handleUploadCors } from './routes/upload-handler.js'
import { notice } from './routes/notice.js'
import { postRouter } from './routes/posts.js'
import { commentRouter } from './routes/comments.js'
import { communityAdminRouter } from './routes/community-admin.js'
import { activityRouter } from './routes/activities.js'
import { adminActivityRouter } from './routes/admin-activities.js'
import { trafficRouter } from './routes/traffic.js'
import { parkingRouter } from './routes/parking.js'
import { adminUsersRouter } from './routes/admin-users.js'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = new Hono()

app.use('*', logger())
app.use('*', cors())

// Serve uploaded files manually (avoid serveStatic compatibility issues with tsx watch)
const mimeTypes: Record<string, string> = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
}

app.get('/api/uploads/:filename', async (c) => {
  const filename = c.req.param('filename')
  const uploadDir = path.resolve(process.cwd(), 'data/uploads')
  const filepath = path.join(uploadDir, filename)

  const exists = await fs.promises.access(filepath).then(() => true).catch(() => false)
  if (!exists) {
    return c.json({ error: 'File not found' }, 404)
  }

  // 动态缩略图处理
  let targetFilepath = filepath
  let targetExt = path.extname(filename).toLowerCase()

  const widthParam = c.req.query('w')
  const width = widthParam ? parseInt(widthParam, 10) : null

  const qParam = c.req.query('q')
  const quality = qParam && !isNaN(parseInt(qParam, 10)) ? Math.max(1, Math.min(100, parseInt(qParam, 10))) : 80

  const formatParam = c.req.query('format')?.toLowerCase()
  const validFormats = ['webp', 'jpeg', 'png', 'avif']
  const format = validFormats.includes(formatParam || '') ? formatParam : 'webp'
  const outExt = `.${format}`
  
  if (width && !isNaN(width) && width > 0 && width <= 2000) {
    const cacheDir = path.join(uploadDir, '.cache')
    const cacheDirExists = await fs.promises.access(cacheDir).then(() => true).catch(() => false)
    if (!cacheDirExists) {
      await fs.promises.mkdir(cacheDir, { recursive: true })
    }
    
    const cacheFilename = `${filename}_w${width}_q${quality}.${format}`
    const cacheFilepath = path.join(cacheDir, cacheFilename)

    const cacheExists = await fs.promises.access(cacheFilepath).then(() => true).catch(() => false)
    let needGenerate = !cacheExists
    if (!needGenerate) {
      const origStat = await fs.promises.stat(filepath)
      const cacheStat = await fs.promises.stat(cacheFilepath)
      if (origStat.mtimeMs > cacheStat.mtimeMs) {
        needGenerate = true
      }
    }

    if (needGenerate) {
      try {
        let pipeline = sharp(filepath).resize({ width, withoutEnlargement: true })
        if (format === 'webp') pipeline = pipeline.webp({ quality })
        else if (format === 'jpeg') pipeline = pipeline.jpeg({ quality })
        else if (format === 'png') pipeline = pipeline.png({ quality })
        else if (format === 'avif') pipeline = pipeline.avif({ quality })
        
        await pipeline.toFile(cacheFilepath)
        targetFilepath = cacheFilepath
        targetExt = outExt
      } catch (err) {
        console.error('[Sharp] Failed to generate thumbnail:', err)
        // 出错则回退到原图
      }
    } else {
      targetFilepath = cacheFilepath
      targetExt = outExt
    }
  }

  const stats = await fs.promises.stat(targetFilepath)
  const lastModified = stats.mtime.toUTCString()
  
  // 处理协商缓存 304 Not Modified
  const ifModifiedSince = c.req.header('if-modified-since')
  if (ifModifiedSince && ifModifiedSince === lastModified) {
    return new Response(null, { status: 304 })
  }

  const contentType = mimeTypes[targetExt] || 'application/octet-stream'
  
  // 使用 Node.js 可读流并转换为 ReadableStream 以减少内存占用
  const nodeStream = fs.createReadStream(targetFilepath)
  const webStream = new ReadableStream({
    start(controller) {
      nodeStream.on('data', (chunk) => controller.enqueue(chunk))
      nodeStream.on('end', () => controller.close())
      nodeStream.on('error', (err) => controller.error(err))
    },
    cancel() {
      nodeStream.destroy()
    }
  })

  return new Response(webStream, {
    headers: { 
      'Content-Type': contentType, 
      // 恢复为 1 天缓存，后续依赖 304 协商缓存即可
      'Cache-Control': 'public, max-age=86400',
      'Last-Modified': lastModified
    }
  })
})

// Routes
app.route('/api/customer', customer)
app.route('/api/auth', auth)
app.route('/api/admin', admin)
// /api/upload 在 HTTP server 层处理，见下方 createServer
app.route('/api/notice', notice)
app.route('/api/posts', postRouter)
app.route('/api/comments', commentRouter)
app.route('/api/community-admin', communityAdminRouter)
app.route('/api/activities', activityRouter)
app.route('/api/admin/activities', adminActivityRouter)
app.route('/api/traffic', trafficRouter)
app.route('/api/parking', parkingRouter)
app.route('/api/admin/users', adminUsersRouter)
app.get('/', (c) => {
  return c.json({ message: 'Welcome to Supermarket API' })
})

// Internal endpoint for scripts to invalidate cache
import { invalidateStoresCache } from './routes/customer.js'
app.post('/api/internal/clear-cache', async (c) => {
  // Simple protection: can check if request is local if needed
  invalidateStoresCache()
  return c.json({ success: true })
})

// Health check endpoint for PM2, Caddy, or Kubernetes liveness probes
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

const port = process.env.PORT ? parseInt(process.env.PORT) : 3000

// 手动创建 HTTP server：上传走原生 Node.js 流，其余走 Hono
const honoListener = getRequestListener(app.fetch)
const server = createServer((req, res) => {
  // 文件上传直接用 Node.js 原生流处理，绕过 Hono 的 body 解析
  if (req.url?.startsWith('/api/upload') && (req.method === 'POST' || req.method === 'OPTIONS')) {
    if (handleUploadCors(req, res)) return
    handleUpload(req, res)
    return
  }
  honoListener(req, res)
})
server.listen(port, () => {
  console.log(`Server is running on port ${port}`)
})

// Auto cleanup job: runs every hour to delete memos completed > 24h ago
setInterval(async () => {
  try {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const oldMemos = await db.select().from(itemMemos)
      .where(and(eq(itemMemos.isCompleted, true), lte(itemMemos.completedAt, cutoff)))
      
    for (const memo of oldMemos) {
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
      const filepath = path.join(cacheDir, file)
      const stats = await fs.promises.stat(filepath)
      // 如果文件超过 7 天未被修改（或访问），则清理
      if (now - stats.mtimeMs > maxAgeMs) {
        await fs.promises.unlink(filepath)
      }
    }
  } catch (error) {
    console.error('Thumbnail cache cleanup error:', error)
  }
}, 12 * 60 * 60 * 1000)
