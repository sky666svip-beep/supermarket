<!-- 模块：我的评论 -->
<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

</script>

<template>
  <div class="bg-background text-on-background min-h-screen font-body-md selection:bg-primary-container selection:text-white flex flex-col">
    <!-- Header -->
    <header class="bg-surface/80 backdrop-blur-md w-full top-0 sticky flex flex-col z-20 transition-colors border-b border-surface-variant/20">
      <div class="flex items-center justify-between px-margin-mobile h-16 w-full max-w-2xl mx-auto">
        <button type="button" @click="router.back()" class="flex items-center justify-center text-on-surface hover:bg-surface-container-low w-10 h-10 rounded-full transition-colors active:scale-95">
          <i-material-symbols-arrow-back-ios-new></i-material-symbols-arrow-back-ios-new>
        </button>
        <h1 class="font-headline-sm text-lg font-bold text-on-surface">我的评论</h1>
        <div class="w-10 h-10"></div> <!-- Placeholder to balance flex -->
      </div>
    </header>
    
    <main class="flex-1 w-full max-w-2xl mx-auto px-margin-mobile py-6 flex flex-col gap-4">
      <div class="flex flex-col items-center justify-center h-64 gap-4">
        <div class="w-16 h-16 bg-surface-container-high text-on-surface-variant rounded-full flex items-center justify-center mb-2 shadow-sm">
          <i-material-symbols-chat-outline  class="text-[32px]"></i-material-symbols-chat-outline>
        </div>
        <p class="text-on-surface-variant text-sm">我的评论历史功能尚未完善</p>
      </div>
    </main>
  </div>
</template>
