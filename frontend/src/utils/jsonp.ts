// 模块：JSONP 请求工具库 (跨域资源请求)
/**
 * 健壮的 JSONP 实现
 * @param url 请求的基础 URL
 * @param params 查询参数
 * @param callbackKey 回调函数的参数名，如 'callback'
 * @param timeoutMs 超时时间(毫秒)，默认 10000
 * @returns Promise<any>
 */
export const jsonp = (
  url: string, 
  params: Record<string, any>, 
  callbackKey: string = 'callback',
  timeoutMs: number = 10000
): Promise<any> => {
  return new Promise((resolve, reject) => {
    const callbackName = `jsonp_${Date.now()}_${Math.floor(Math.random() * 100000)}`
    let timeoutId: number | NodeJS.Timeout | null = null
    const script = document.createElement('script')

    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId as any)
        timeoutId = null
      }
      
      // Remove global callback safely to prevent memory leaks
      try {
        delete (window as any)[callbackName]
      } catch (e) {
        (window as any)[callbackName] = undefined
      }

      if (script && script.parentNode) {
        script.parentNode.removeChild(script)
      }
    }

    // 挂载全局回调
    ;(window as any)[callbackName] = (data: any) => {
      cleanup()
      resolve(data)
    }

    // 构造带参数的 URL (优雅处理 ? 和 & 边界情况)
    const queryParams = new URLSearchParams()
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        queryParams.append(key, String(params[key]))
      }
    })
    queryParams.append(callbackKey, callbackName)
    
    const separator = url.includes('?') ? '&' : '?'
    const finalUrl = `${url}${separator}${queryParams.toString()}`
    
    script.src = finalUrl
    script.async = true
    
    script.onerror = () => {
      cleanup()
      // JSONP 在原生层无法捕捉具体状态码，但可以明确提示是网络/跨域/资源加载问题
      reject(new Error(`JSONP Request Failed (Network Error or Resource Blocked). URL: ${url}`))
    }

    // 增加超时控制机制
    if (timeoutMs > 0) {
      timeoutId = setTimeout(() => {
        cleanup()
        // 设置挂起的回调，防止脚本极度延迟加载完成后报错
        ;(window as any)[callbackName] = () => {
          try { delete (window as any)[callbackName] } catch (e) {}
        }
        reject(new Error(`JSONP Request Timeout after ${timeoutMs}ms. URL: ${url}`))
      }, timeoutMs)
    }

    document.head.appendChild(script)
  })
}
