/**
 * 简单的 JSONP 实现
 * @param url 请求的基础 URL
 * @param params 查询参数
 * @param callbackKey 回调函数的参数名，如 'callback'
 * @returns Promise<any>
 */
export const jsonp = (url: string, params: Record<string, any>, callbackKey: string = 'callback'): Promise<any> => {
  return new Promise((resolve, reject) => {
    const callbackName = `jsonp_${Date.now()}_${Math.floor(Math.random() * 10000)}`
    
    // 挂载全局回调
    ;(window as any)[callbackName] = (data: any) => {
      resolve(data)
      cleanup()
    }

    const script = document.createElement('script')
    
    // 构造带参数的 URL
    const queryString = Object.keys(params)
      .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&')
      
    const finalUrl = `${url}?${queryString}${queryString ? '&' : ''}${callbackKey}=${callbackName}`
    
    script.src = finalUrl
    script.async = true
    
    script.onerror = () => {
      reject(new Error(`JSONP request to ${url} failed`))
      cleanup()
    }

    document.head.appendChild(script)

    const cleanup = () => {
      delete (window as any)[callbackName]
      if (script.parentNode) {
        script.parentNode.removeChild(script)
      }
    }
  })
}
