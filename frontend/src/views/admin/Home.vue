<script setup lang="ts">
import { useRouter } from 'vue-router'
const router = useRouter()
</script>

<template>
  <div class="bg-surface min-h-screen pb-8">
    <!-- Header -->
    <header class="bg-surface-container-lowest border-b border-surface/10 px-4 py-3 flex items-center justify-center relative shadow-sm sticky top-0 z-10">
      <button 
        @click="router.push('/profile')" 
        class="absolute left-4 p-2 text-primary hover:bg-surface-container-low rounded-full transition-colors flex items-center justify-center"
      >
        <van-icon name="arrow-left" class="text-lg" />
      </button>
      <h1 class="text-lg font-semibold text-on-surface">商场后台管理</h1>
    </header>

    <!-- Main Content -->
    <main class="flex-1 overflow-y-auto pb-8">
      <!-- Welcome Section -->
      <section class="px-5 py-6 bg-surface-container-lowest mb-3 shadow-sm border-b border-surface/5">
        <h2 class="text-xl font-bold text-on-surface mb-2">商场后台管理</h2>
        <p class="text-sm text-on-surface-variant/80 font-medium">欢迎来到管理系统，请选择您要处理的模块。</p>
      </section>

      <!-- Grid Menu -->
      <section class="px-4">
        <div class="bg-surface-container-lowest rounded-xl shadow-sm border border-surface/10 p-2">
          <div class="grid grid-cols-2 gap-y-6 gap-x-2 py-4">
            
            <!-- Announcement Management -->
            <a @click.prevent="router.push('/admin/notices')" class="cursor-pointer flex flex-col items-center justify-center p-4 hover:bg-surface-container-low/50 rounded-xl transition-colors group">
              <div class="w-8 h-8 flex items-center justify-center mb-3 text-on-surface group-hover:text-primary transition-colors">
                <van-icon name="volume-o" :size="34" />
              </div>
              <span class="text-base font-medium text-on-surface">公告管理</span>
            </a>
            
            <!-- Activity Management -->
            <a @click.prevent="router.push('/admin/activities')" class="cursor-pointer flex flex-col items-center justify-center p-4 hover:bg-surface-container-low/50 rounded-xl transition-colors group">
              <div class="w-8 h-8 flex items-center justify-center mb-3 text-on-surface group-hover:text-primary transition-colors">
                <van-icon name="flag-o" :size="34" />
              </div>
              <span class="text-base font-medium text-on-surface">活动管理</span>
            </a>
            
            <!-- Work Order Management -->
            <a @click.prevent="router.push('/admin/feedbacks')" class="cursor-pointer flex flex-col items-center justify-center p-4 hover:bg-surface-container-low/50 rounded-xl transition-colors group">
              <div class="w-8 h-8 flex items-center justify-center mb-3 text-on-surface group-hover:text-primary transition-colors">
                <van-icon name="orders-o" :size="34" />
              </div>
              <span class="text-base font-medium text-on-surface">工单管理</span>
            </a>
            
            <!-- Post Audit -->
            <a @click.prevent="router.push('/admin/community/posts')" class="cursor-pointer flex flex-col items-center justify-center p-4 hover:bg-surface-container-low/50 rounded-xl transition-colors group">
              <div class="w-8 h-8 flex items-center justify-center mb-3 text-on-surface group-hover:text-primary transition-colors">
                <van-icon name="notes-o" :size="34" />
              </div>
              <span class="text-base font-medium text-on-surface">帖子审核</span>
            </a>
            
            <!-- Report Management -->
            <a @click.prevent="router.push('/admin/community/reports')" class="cursor-pointer flex flex-col items-center justify-center p-4 hover:bg-surface-container-low/50 rounded-xl transition-colors group">
              <div class="w-8 h-8 flex items-center justify-center mb-3 text-on-surface group-hover:text-primary transition-colors">
                <van-icon name="warning-o" :size="34" />
              </div>
              <span class="text-base font-medium text-on-surface">举报管理</span>
            </a>
            
            <!-- User Management -->
            <a @click.prevent="router.push('/admin/users')" class="cursor-pointer flex flex-col items-center justify-center p-4 hover:bg-surface-container-low/50 rounded-xl transition-colors group">
              <div class="w-8 h-8 flex items-center justify-center mb-3 text-on-surface group-hover:text-primary transition-colors">
                <van-icon name="friends-o" :size="34"  />
              </div>
              <span class="text-base font-medium text-on-surface">用户管理</span>
            </a>
            
          </div>
        </div>
      </section>
    </main>
  </div>
</template>
