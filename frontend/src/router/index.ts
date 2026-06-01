import { createRouter, createWebHistory } from 'vue-router'
import { showToast } from 'vant'
import Home from '../views/Home.vue'

// 解析 JWT 并验证是否过期
const isTokenExpired = (token: string): boolean => {
  if (!token) return true
  try {
    const base64Url = token.split('.')[1]
    if (!base64Url) return true
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(window.atob(base64))
    // JWT 里的 exp 单位是秒
    return payload.exp * 1000 < Date.now()
  } catch (e) {
    return true
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: Home },
    { path: '/customer/stores', name: 'store-info', component: () => import('../views/customer/StoreInfo.vue') },
    { path: '/customer/checklist', name: 'checklist', component: () => import('../views/customer/Checklist.vue'), meta: { customNav: true, requiresAuth: true } },
    { path: '/customer/feedback', name: 'feedback-history', component: () => import('../views/customer/FeedbackHistory.vue'), meta: { customNav: true, requiresAuth: true } },
    { path: '/customer/feedback/new', name: 'feedback', component: () => import('../views/customer/Feedback.vue'), meta: { requiresAuth: true } },
    { path: '/customer/memos', name: 'memos', component: () => import('../views/customer/ItemMemoList.vue'), meta: { customNav: true, requiresAuth: true } },
    { path: '/customer/memos/edit', name: 'memos-edit', component: () => import('../views/customer/ItemMemoEdit.vue'), meta: { customNav: true, requiresAuth: true } },
    { path: '/customer/traffic', name: 'traffic-analysis', component: () => import('../views/customer/TrafficAnalysis.vue'), meta: { customNav: true } },
    { path: '/customer/parking', name: 'parking-fee', component: () => import('../views/customer/ParkingFee.vue'), meta: { customNav: true } },
    { path: '/profile', name: 'profile', component: () => import('../views/profile/Index.vue') },
    { path: '/login', name: 'login', component: () => import('../views/profile/Login.vue') },
    { path: '/register', name: 'register', component: () => import('../views/profile/Register.vue') },
    { path: '/forgot-password', name: 'forgot-password', component: () => import('../views/profile/ForgotPassword.vue') },
    { path: '/community', name: 'community', component: () => import('../views/community/PostList.vue'), meta: { customNav: true } },
    { path: '/community/post/:id', name: 'post-detail', component: () => import('../views/community/PostDetail.vue'), meta: { customNav: true } },
    { path: '/community/publish', name: 'post-publish', component: () => import('../views/community/PostPublish.vue'), meta: { customNav: true, requiresAuth: true } },
    { path: '/profile/posts', name: 'my-posts', component: () => import('../views/user/MyPosts.vue'), meta: { customNav: true, requiresAuth: true } },
    { path: '/profile/comments', name: 'my-comments', component: () => import('../views/user/MyComments.vue'), meta: { customNav: true, requiresAuth: true } },
    { path: '/profile/collections', name: 'my-collections', component: () => import('../views/user/MyCollections.vue'), meta: { customNav: true, requiresAuth: true } },
    { path: '/profile/messages', name: 'my-messages', component: () => import('../views/user/MyMessages.vue'), meta: { customNav: true, requiresAuth: true } }
  ]
})

router.beforeEach((to, _from, next) => {
  if (to.meta.requiresAuth) {
    const userStr = localStorage.getItem('user')
    let isValid = false
    
    if (userStr) {
      try {
        const user = JSON.parse(userStr)
        // 校验 token 的存在性及其过期时间
        if (user && user.token && !isTokenExpired(user.token)) {
          isValid = true
        } else {
          // Token 过期或非法，清理本地无用缓存
          localStorage.removeItem('user')
        }
      } catch (e) {
        localStorage.removeItem('user')
      }
    }

    if (!isValid) {
      showToast('登录信息已过期或未登录，请重新登录')
      next('/login')
      return
    }
  }
  
  next()
})

// 全局路由错误处理，重点捕获动态组件加载失败（如断网或发布导致的原有 chunk 丢失）
router.onError((error: Error, to: any) => {
  console.error('Router error:', error)
  
  const isChunkLoadFailed = error.message.includes('Failed to fetch dynamically imported module') 
    || error.name === 'ChunkLoadError'
    || error.message.includes('Importing a module script failed')

  if (isChunkLoadFailed) {
    showToast('页面资源加载失败，正在尝试恢复...')
    
    // 利用 sessionStorage 实现防死循环的单次重试刷新机制
    const cacheKey = `router-retry-${to.fullPath}`
    const hasRetried = sessionStorage.getItem(cacheKey)
    
    if (!hasRetried) {
      sessionStorage.setItem(cacheKey, 'true')
      window.location.reload()
    } else {
      sessionStorage.removeItem(cacheKey)
      showToast('网络错误导致页面加载失败，请检查网络设置')
    }
  } else {
    showToast('页面跳转发生异常')
  }
})

export default router
