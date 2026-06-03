import { Hono } from 'hono'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const upload = new Hono()

upload.post('/', async (c) => {
  const body = await c.req.parseBody()
  const file = body['file'] as File
  
  if (!file) {
    return c.json({ error: 'No file uploaded' }, 400)
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
  const allowedExts = ['jpg', 'jpeg', 'png', 'gif', 'webp']
  if (!allowedExts.includes(ext)) {
    return c.json({ error: '不支持的文件类型，仅允许图片上传' }, 400)
  }

  // 10MB limit
  const MAX_SIZE = 5 * 1024 * 1024
  if (file.size > MAX_SIZE) {
    return c.json({ error: '文件大小不能超过 5MB' }, 400)
  }

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  
  const filename = `${Date.now()}-${Math.floor(Math.random() * 10000)}.${ext}`
  
  const uploadDir = path.resolve(__dirname, '../../data/uploads')
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true })
  }
  
  const filePath = path.join(uploadDir, filename)
  fs.writeFileSync(filePath, buffer)
  return c.json({ success: true, url: `/api/uploads/${filename}` })
})
