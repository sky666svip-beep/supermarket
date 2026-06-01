import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'Home',
      component: () => import('../views/Home.vue')
    },
    {
      path: '/notices',
      name: 'NoticeManager',
      component: () => import('../views/NoticeManager.vue')
    },
    {
      path: '/feedbacks',
      name: 'FeedbackDashboard',
      component: () => import('../views/FeedbackDashboard.vue')
    },
    {
      path: '/community/posts',
      name: 'CommunityPosts',
      component: () => import('../views/CommunityPosts.vue')
    },
    {
      path: '/community/reports',
      name: 'CommunityReports',
      component: () => import('../views/CommunityReports.vue')
    },
    {
      path: '/activities',
      name: 'ActivityManager',
      component: () => import('../views/ActivityManager.vue')
    }
  ]
})

export default router
