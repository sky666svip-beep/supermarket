import { Hono } from 'hono'
import * as fs from 'fs'
import * as path from 'path'
import sharp from 'sharp'

export const uploadsServingRouter = new Hono()

// Serve uploaded files manually
const mimeTypes: Record<string, string> = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.avif': 'image/avif',
}

// 内存锁防止高并发时重复生成同一个缩略图（Thundering Herd Problem）
const generationLocks = new Map<string, Promise<void>>()

uploadsServingRouter.get('/:filename', async (c) => {
  const rawFilename = c.req.param('filename')

  // 1. 安全修复：路径遍历 (Path Traversal)。强制提取基础文件名，拒绝跨目录访问
  const filename = path.basename(rawFilename)
  if (!filename) return c.json({ error: 'Invalid filename' }, 400)

  const uploadDir = path.resolve(process.cwd(), 'data/uploads')
  const filepath = path.join(uploadDir, filename)

  // 3. TOCTOU 优化：直接通过 stat 判断存在与否，合并读取元数据，减少一次 IO 
  let origStat: fs.Stats
  try {
    origStat = await fs.promises.stat(filepath)
    // 防止用户恶意请求 `.cache` 目录导致 createReadStream 报错崩溃
    if (origStat.isDirectory()) return c.json({ error: 'File not found' }, 404)
  } catch (err: any) {
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
    try {
      await fs.promises.mkdir(cacheDir, { recursive: true })
    } catch (err) {
      // ignore error if exists
    }

    const cacheFilename = `${filename}_w${width}_q${quality}.${format}`
    const cacheFilepath = path.join(cacheDir, cacheFilename)

    let needGenerate = true
    try {
      const cacheStat = await fs.promises.stat(cacheFilepath)
      if (origStat.mtimeMs <= cacheStat.mtimeMs) {
        needGenerate = false
      }
    } catch (e) {
      // cache does not exist
    }

    if (needGenerate) {
      if (generationLocks.has(cacheFilename)) {
        // 如果已经有并发请求在生成这张图，等待它完成，而不是大家一起去调 sharp
        try {
          await generationLocks.get(cacheFilename)
          targetFilepath = cacheFilepath
          targetExt = outExt
        } catch (err) {
          // 其他人的生成任务失败了，我们安静回退原图即可
        }
      } else {
        const generationPromise = (async () => {
          let pipeline = sharp(filepath).resize({ width, withoutEnlargement: true })
          if (format === 'webp') pipeline = pipeline.webp({ quality })
          else if (format === 'jpeg') pipeline = pipeline.jpeg({ quality })
          else if (format === 'png') pipeline = pipeline.png({ quality })
          else if (format === 'avif') pipeline = pipeline.avif({ quality })

          // 2. 并发竞争修复：增加随机字符串，即使是 PM2 多进程/容器集群同时处理，也不会互相覆盖 .tmp
          const tmpFilepath = `${cacheFilepath}.${Date.now()}-${Math.random().toString(36).slice(2, 8)}.tmp`
          await pipeline.toFile(tmpFilepath)
          await fs.promises.rename(tmpFilepath, cacheFilepath)
        })()

        generationLocks.set(cacheFilename, generationPromise)

        try {
          await generationPromise
          // 4. 异常流隐患修复：仅当 promise resolved 才替换目标路径和后缀
          targetFilepath = cacheFilepath
          targetExt = outExt
        } catch (err) {
          console.error('[Sharp] Failed to generate thumbnail:', err)
          // 出错则回退到原图，targetExt 和 targetFilepath 保持不动
        } finally {
          generationLocks.delete(cacheFilename)
        }
      }
    } else {
      targetFilepath = cacheFilepath
      targetExt = outExt
    }
  }

  // 二次验证：确保要发送的文件依然存在
  let stats
  try {
    stats = await fs.promises.stat(targetFilepath)
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      return c.json({ error: 'File not found' }, 404)
    }
    return c.json({ error: 'Internal Server Error' }, 500)
  }
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
      nodeStream.on('error', (err) => {
        console.error('[Stream] Error serving file:', err)
        // 防止读取被意外截断时连接长期挂起
        try { controller.error(err) } catch (e) { }
      })
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
