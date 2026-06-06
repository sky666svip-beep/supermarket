import { IncomingMessage, ServerResponse } from 'http'
import * as fs from 'fs'
import * as path from 'path'

const allowedExts = ['jpg', 'jpeg', 'png', 'gif', 'webp']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_BODY_SIZE = 20 * 1024 * 1024 // 20MB

interface ParsedFile {
  filename: string
  mimeType: string
  content: Buffer
}

/** 从 multipart body 中提取文件 */
function parseMultipartFile(body: Buffer, boundary: string): ParsedFile | null {
  const boundaryBuf = Buffer.from(`--${boundary}`)
  
  let pos = body.indexOf(boundaryBuf)
  if (pos < 0) return null
  
  while (pos < body.length) {
    let partStart = pos + boundaryBuf.length
    
    // 检查是否是结束符 `--boundary--`
    if (body[partStart] === 0x2d && body[partStart + 1] === 0x2d) {
      break
    }
    
    // 跳过 boundary 后的换行符 (\r\n 或 \n)
    if (body[partStart] === 0x0d && body[partStart + 1] === 0x0a) {
      partStart += 2
    } else if (body[partStart] === 0x0a) {
      partStart += 1
    }
    
    // 查找下一个 boundary 的起始位置
    const nextBoundaryPos = body.indexOf(boundaryBuf, partStart)
    if (nextBoundaryPos < 0) break // 意外的 EOF
    
    // 提取当前 part，去除紧挨着下一个 boundary 前的换行符
    let partEnd = nextBoundaryPos
    if (body[partEnd - 2] === 0x0d && body[partEnd - 1] === 0x0a) {
      partEnd -= 2
    } else if (body[partEnd - 1] === 0x0a) {
      partEnd -= 1
    }
    
    const part = body.subarray(partStart, partEnd)
    
    // 分离 headers 和 content
    let sepIdx = part.indexOf(Buffer.from('\r\n\r\n'))
    let sepLen = 4
    if (sepIdx < 0) {
      sepIdx = part.indexOf(Buffer.from('\n\n'))
      sepLen = 2
    }
    
    if (sepIdx >= 0) {
      const headersStr = part.subarray(0, sepIdx).toString('utf-8')
      const content = part.subarray(sepIdx + sepLen)
      
      const dispositionMatch = headersStr.match(/Content-Disposition:\s*form-data;([^\r\n]+)/i)
      if (dispositionMatch) {
        const filenameMatch = dispositionMatch[1].match(/filename="([^"]*)"/)
        if (filenameMatch) {
          const filename = filenameMatch[1]
          // 容错匹配 Content-Type，即使没有空格
          const ctMatch = headersStr.match(/Content-Type:\s*([^\r\n]*)/i)
          const mimeType = ctMatch ? ctMatch[1].trim() : 'application/octet-stream'
          return { filename, mimeType, content }
        }
      }
    }
    
    // 推进到下一个 boundary
    pos = nextBoundaryPos
  }
  
  return null
}

/** 发送 JSON 响应（幂等，已发送过则跳过） */
function sendJson(res: ServerResponse, status: number, data: object) {
  if (res.headersSent || res.destroyed) return
  try {
    res.writeHead(status, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    })
    res.end(JSON.stringify(data))
  } catch (err: any) {
    console.error('[Upload] Send response error:', err.message)
  }
}

/** 处理 CORS 预检请求 */
export function handleUploadCors(req: IncomingMessage, res: ServerResponse): boolean {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Max-Age': '86400',
    })
    res.end()
    return true
  }
  return false
}

/** 原生 Node.js 文件上传处理 */
export function handleUpload(req: IncomingMessage, res: ServerResponse) {
  const contentType = req.headers['content-type'] || ''
  if (!contentType.includes('multipart/form-data')) {
    return sendJson(res, 400, { error: '请求格式错误' })
  }

  // 提前校验 Content-Length（如果客户端提供了）
  const contentLengthStr = req.headers['content-length']
  if (contentLengthStr) {
    const contentLength = parseInt(contentLengthStr, 10)
    if (contentLength > MAX_BODY_SIZE) {
      req.resume() // 消耗数据防止卡住
      return sendJson(res, 400, { error: '文件大小超出限制' })
    }
  }

  const boundaryMatch = contentType.match(/boundary=(.+)/)
  if (!boundaryMatch) {
    return sendJson(res, 400, { error: '缺少 boundary' })
  }
  // 移除可能存在的双引号
  const boundary = boundaryMatch[1].replace(/^"|"$/g, '')

  const chunks: Buffer[] = []
  let totalSize = 0
  let aborted = false

  req.on('data', (chunk: Buffer) => {
    if (aborted) return
    totalSize += chunk.length
    if (totalSize > MAX_BODY_SIZE) {
      aborted = true
      req.resume() // 消耗剩余数据防止背压
      sendJson(res, 400, { error: '文件大小超出限制' })
      return
    }
    chunks.push(chunk)
  })

  req.on('error', (err) => {
    if (aborted) return
    aborted = true
    console.error('[Upload] Stream error:', err.message)
    sendJson(res, 400, { error: '上传中断' })
  })

  req.on('aborted', () => {
    if (aborted) return
    aborted = true
    console.warn('[Upload] Client aborted')
  })

  req.on('end', async () => {
    if (aborted) return

    try {
      const body = Buffer.concat(chunks)

      const file = parseMultipartFile(body, boundary)
      if (!file || file.content.length === 0) {
        return sendJson(res, 400, { error: 'No file uploaded' })
      }

      const ext = file.filename.split('.').pop()?.toLowerCase() || ''
      if (!allowedExts.includes(ext)) {
        return sendJson(res, 400, { error: '不支持的文件类型，仅允许图片上传' })
      }

      if (file.content.length > MAX_FILE_SIZE) {
        return sendJson(res, 400, { error: '单张图片大小不能超过 5MB' })
      }

      const filename = `${Date.now()}-${Math.floor(Math.random() * 10000)}.${ext}`
      const uploadDir = path.resolve(process.cwd(), 'data/uploads')
      if (!fs.existsSync(uploadDir)) {
        await fs.promises.mkdir(uploadDir, { recursive: true })
      }

      await fs.promises.writeFile(path.join(uploadDir, filename), file.content)
      sendJson(res, 200, { success: true, url: `/api/uploads/${filename}` })
    } catch (err: any) {
      console.error('[Upload] Processing error:', err.message)
      sendJson(res, 400, { error: '文件上传失败' })
    }
  })
}
