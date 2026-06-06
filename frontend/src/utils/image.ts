/**
 * 全局图片工具函数
 */

// 全局默认缩略图配置
// 如果未来想调整全局缩略图的清晰度和大小，只需修改这里即可！
export const DEFAULT_THUMB_PARAMS = '?w=400&format=webp&q=50'
export const SMALL_THUMB_PARAMS = '?w=200&format=webp&q=80'

/**
 * 补全图片完整 URL，并追加缩略图参数
 */
export function getThumbnailUrl(url: string, params: string = DEFAULT_THUMB_PARAMS): string {
  if (!url) return ''
  
  // 处理后端拼接
  let fullUrl = url
  if (!url.startsWith('http') && !url.startsWith('/api')) {
    fullUrl = url.startsWith('/') ? `/api${url}` : `/api/${url}`
  }

  // 追加参数（假设原图 URL 不带 ? 参数）
  const separator = fullUrl.includes('?') ? '&' : '?'
  return fullUrl + params.replace('?', separator)
}

/**
 * 补全原图完整 URL（不压缩）
 */
export function getFullUrl(url: string): string {
  if (!url) return ''
  if (url.startsWith('http') || url.startsWith('/api')) return url
  return url.startsWith('/') ? `/api${url}` : `/api/${url}`
}
