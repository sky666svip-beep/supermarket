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
    }
  ]
})

export default router
