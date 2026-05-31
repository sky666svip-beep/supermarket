import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: Home },
    { path: '/customer/stores', name: 'store-info', component: () => import('../views/customer/StoreInfo.vue') },
    { path: '/customer/checklist', name: 'checklist', component: () => import('../views/customer/Checklist.vue'), meta: { customNav: true } },
    { path: '/customer/feedback', name: 'feedback-history', component: () => import('../views/customer/FeedbackHistory.vue'), meta: { customNav: true } },
    { path: '/customer/feedback/new', name: 'feedback', component: () => import('../views/customer/Feedback.vue') },
    { path: '/customer/memos', name: 'memos', component: () => import('../views/customer/ItemMemoList.vue'), meta: { customNav: true } },
    { path: '/customer/memos/edit', name: 'memos-edit', component: () => import('../views/customer/ItemMemoEdit.vue'), meta: { customNav: true } },
    { path: '/profile', name: 'profile', component: () => import('../views/profile/Index.vue') },
    { path: '/login', name: 'login', component: () => import('../views/profile/Login.vue') },
    { path: '/register', name: 'register', component: () => import('../views/profile/Register.vue') },
    { path: '/community', name: 'community', component: () => import('../views/community/PostList.vue'), meta: { customNav: true } },
    { path: '/community/post/:id', name: 'post-detail', component: () => import('../views/community/PostDetail.vue'), meta: { customNav: true } },
    { path: '/community/publish', name: 'post-publish', component: () => import('../views/community/PostPublish.vue'), meta: { customNav: true } },
    { path: '/profile/posts', name: 'my-posts', component: () => import('../views/user/MyPosts.vue'), meta: { customNav: true } },
    { path: '/profile/comments', name: 'my-comments', component: () => import('../views/user/MyComments.vue'), meta: { customNav: true } },
    { path: '/profile/collections', name: 'my-collections', component: () => import('../views/user/MyCollections.vue'), meta: { customNav: true } },
    { path: '/profile/messages', name: 'my-messages', component: () => import('../views/user/MyMessages.vue'), meta: { customNav: true } }
  ]
})

router.beforeEach((to, _from, next) => {
  const userStr = localStorage.getItem('user')
  const authRequired = ['checklist', 'feedback', 'feedback-history', 'memos', 'memos-edit', 'post-publish', 'my-posts', 'my-comments', 'my-collections', 'my-messages'].includes(to.name as string)
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
