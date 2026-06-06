/**
 * 前端图片压缩工具
 * 使用 Canvas 在上传前压缩图片，大幅减少传输体积
 */

/** 将 File 压缩为指定最大尺寸和质量的 File */
export function compressImage(
  file: File,
  maxSize = 1200,
  quality = 0.8
): Promise<File> {
  return new Promise((resolve) => {
    // 非图片直接返回
    if (!file.type.startsWith('image/')) {
      return resolve(file)
    }
    // GIF 不压缩（会丢动画）
    if (file.type === 'image/gif') {
      return resolve(file)
    }
    // 小于 200KB 不压缩
    if (file.size < 200 * 1024) {
      return resolve(file)
    }

    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      let { width, height } = img
      // 按最大边缩放
      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height = Math.round(height * (maxSize / width))
          width = maxSize
        } else {
          width = Math.round(width * (maxSize / height))
          height = maxSize
        }
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)

      // 决定输出格式：保留 PNG/WebP 以支持透明通道，其他转 JPEG
      let outType = file.type
      let outExt = file.name.match(/\.\w+$/)?.[0]?.toLowerCase() || ''
      if (outType !== 'image/png' && outType !== 'image/webp') {
        outType = 'image/jpeg'
        outExt = '.jpg'
      }

      canvas.toBlob(
        (blob) => {
          // 主动释放 Canvas 内存（防止高频调用时内存泄露）
          canvas.width = 0
          canvas.height = 0

          if (!blob) {
            return resolve(file) // 失败则用原图
          }

          // 兜底：如果压缩后反而比原图大（或者等于），直接使用原图
          if (blob.size >= file.size) {
            return resolve(file)
          }

          const baseName = file.name.replace(/\.\w+$/, '')
          const name = `${baseName}${outExt}`
          resolve(new File([blob], name, { type: outType }))
        },
        outType,
        quality
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      // 压缩失败就用原图
      resolve(file)
    }

    img.src = url
  })
}
