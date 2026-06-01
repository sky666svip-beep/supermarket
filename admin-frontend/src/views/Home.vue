<script setup lang="ts">
import { useRouter } from 'vue-router'
const router = useRouter()
</script>

<template>
  <div class="space-y-4">
    <div class="bg-white p-4 shadow-sm">
      <h2 class="text-xl font-bold mb-2">商场后台管理</h2>
      <p class="text-gray-500 text-sm">欢迎来到管理系统，请选择您要处理的模块。</p>
    </div>
    
    <van-grid :column-num="2" :border="false" class="bg-white mx-4 rounded-lg overflow-hidden shadow-sm">
      <van-grid-item icon="volume-o" text="公告管理" @click="router.push('/notices')" />
      <van-grid-item icon="flag-o" text="活动管理" @click="router.push('/activities')" />
      <van-grid-item icon="orders-o" text="工单管理" @click="router.push('/feedbacks')" />
      <van-grid-item icon="notes-o" text="帖子审核" @click="router.push('/community/posts')" />
      <van-grid-item icon="warning-o" text="举报管理" @click="router.push('/community/reports')" />
    </van-grid>
  </div>
</template>
