import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: Home },
    { path: '/customer/stores', name: 'store-info', component: () => import('../views/customer/StoreInfo.vue') },
    { path: '/customer/checklist', name: 'checklist', component: () => import('../views/customer/Checklist.vue') },
    { path: '/customer/feedback', name: 'feedback-history', component: () => import('../views/customer/FeedbackHistory.vue') },
    { path: '/customer/feedback/new', name: 'feedback', component: () => import('../views/customer/Feedback.vue') },
    { path: '/customer/memos', name: 'memos', component: () => import('../views/customer/ItemMemoList.vue') },
    { path: '/customer/memos/edit', name: 'memos-edit', component: () => import('../views/customer/ItemMemoEdit.vue') },
    { path: '/profile', name: 'profile', component: () => import('../views/profile/Index.vue') },
    { path: '/login', name: 'login', component: () => import('../views/profile/Login.vue') },
    { path: '/register', name: 'register', component: () => import('../views/profile/Register.vue') }
  ]
})

router.beforeEach((to, _from, next) => {
  const userStr = localStorage.getItem('user')
  const authRequired = ['checklist', 'feedback', 'feedback-history', 'memos', 'memos-edit'].includes(to.name as string)
  if (authRequired && !userStr) {
    import('vant').then(({ showToast }) => {
      showToast('请先登录后使用此功能')
      next('/login')
    })
  } else {
    next()
  }
})

export default router
