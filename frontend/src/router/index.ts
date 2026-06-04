import { createRouter, createWebHistory, type RouteLocationNormalized } from 'vue-router'
import { showToast } from 'vant'
import Home from '../views/Home.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: Home, meta: { customNav: true } },
    { path: '/customer/stores', name: 'store-info', component: () => import('../views/customer/StoreInfo.vue') },
    { path: '/customer/mutual-help', name: 'mutual-help', component: () => import('../views/customer/MutualHelp.vue'), meta: { customNav: true } },
    { path: '/customer/checklist', name: 'checklist', component: () => import('../views/customer/Checklist.vue'), meta: { customNav: true, requiresAuth: true } },
    { path: '/customer/feedback', name: 'feedback-history', component: () => import('../views/customer/FeedbackHistory.vue'), meta: { customNav: true, requiresAuth: true } },
    { path: '/customer/feedback/new', name: 'feedback', component: () => import('../views/customer/Feedback.vue'), meta: { requiresAuth: true } },
    { path: '/customer/memos', name: 'memos', component: () => import('../views/customer/ItemMemoList.vue'), meta: { customNav: true, requiresAuth: true } },
    { path: '/customer/memos/edit', name: 'memos-edit', component: () => import('../views/customer/ItemMemoEdit.vue'), meta: { customNav: true, requiresAuth: true } },
    { path: '/customer/traffic', name: 'traffic-analysis', component: () => import('../views/customer/TrafficAnalysis.vue'), meta: { customNav: true } },
    { path: '/customer/parking', name: 'parking-fee', component: () => import('../views/customer/ParkingFee.vue'), meta: { customNav: true } },
    { path: '/customer/jobs', name: 'jobs', component: () => import('../views/customer/Jobs.vue'), meta: { customNav: true } },
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
    { path: '/profile/messages', name: 'my-messages', component: () => import('../views/user/MyMessages.vue'), meta: { customNav: true, requiresAuth: true } },
    
    // Admin Routes
    { path: '/admin', name: 'admin-home', component: () => import('../views/admin/Home.vue'), meta: { customNav: true, requiresAuth: true, requiresAdmin: true } },
    { path: '/admin/notices', name: 'admin-notices', component: () => import('../views/admin/NoticeManager.vue'), meta: { customNav: true, requiresAuth: true, requiresAdmin: true } },
    { path: '/admin/feedbacks', name: 'admin-feedbacks', component: () => import('../views/admin/FeedbackDashboard.vue'), meta: { customNav: true, requiresAuth: true, requiresAdmin: true } },
    { path: '/admin/activities', name: 'admin-activities', component: () => import('../views/admin/ActivityManager.vue'), meta: { customNav: true, requiresAuth: true, requiresAdmin: true } },
    { path: '/admin/community/posts', name: 'admin-community-posts', component: () => import('../views/admin/CommunityPosts.vue'), meta: { customNav: true, requiresAuth: true, requiresAdmin: true } },
    { path: '/admin/community/reports', name: 'admin-community-reports', component: () => import('../views/admin/CommunityReports.vue'), meta: { customNav: true, requiresAuth: true, requiresAdmin: true } }
  ]
})

router.beforeEach((to, _from) => {
  if (to.meta.requiresAuth) {
    const userStr = localStorage.getItem('user')
    let isValid = false
    
    if (userStr) {
      try {
        const user = JSON.parse(userStr)
        // 后端未使用 JWT，因此仅校验 user.id
        if (user && user.id) {
          if (to.meta.requiresAdmin && user.role !== 'admin') {
            showToast('非管理员无法访问')
            return '/'
          }
          isValid = true
        } else {
          // 登录态非法，清理本地无用缓存
          localStorage.removeItem('user')
        }
      } catch (e) {
        localStorage.removeItem('user')
      }
    }

    if (!isValid) {
      showToast('登录信息已过期或未登录，请重新登录')
      return '/login'
    }
  }
})

// 全局路由错误处理，重点捕获动态组件加载失败（如断网或发布导致的原有 chunk 丢失）
router.onError((error: Error, to: RouteLocationNormalized) => {
  console.error('Router error:', error)
  
  const isChunkLoadFailed = error.message.includes('Failed to fetch dynamically imported module') 
    || error.name === 'ChunkLoadError'
    || error.message.includes('Importing a module script failed')

  if (isChunkLoadFailed) {
    // 利用 sessionStorage 实现防死循环的单次重试刷新机制
    const cacheKey = `router-retry-${to.fullPath}`
    const lastRetryStr = sessionStorage.getItem(cacheKey)
    const lastRetry = lastRetryStr ? parseInt(lastRetryStr, 10) : 0
    const now = Date.now()
    
    // 如果距离上次重试不到10秒，认为是连续失败，不再重试
    if (now - lastRetry > 10000) {
      showToast('页面资源加载失败，正在尝试恢复...')
      sessionStorage.setItem(cacheKey, now.toString())
      window.location.reload()
    } else {
      showToast('网络错误导致页面加载失败，请检查网络设置')
    }
  } else {
    showToast('页面跳转发生异常')
  }
})

export default router
