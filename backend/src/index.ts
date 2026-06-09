import 'dotenv/config'
import { createServer } from 'http'
import { getRequestListener } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import * as path from 'path'
import { fileURLToPath } from 'url'

import { uploadsServingRouter } from './routes/uploads-serving.js'
import { startCleanupJobs } from './jobs/cleanup.js'

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

// Serve uploaded files
app.route('/api/uploads', uploadsServingRouter)

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

// Start background cleanup jobs
startCleanupJobs()
