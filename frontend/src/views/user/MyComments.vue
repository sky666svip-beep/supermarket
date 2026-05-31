<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

</script>

<template>
  <div class="my-comments-container min-h-screen bg-gray-50 pb-4">
    <van-nav-bar title="我的评论" left-arrow @click-left="router.back()" fixed placeholder />
    
    <div class="mt-20 text-center text-gray-400">
      <van-empty description="我的评论历史功能尚未完善" />
    </div>
  </div>
</template>
