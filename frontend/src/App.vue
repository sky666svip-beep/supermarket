<script setup lang="ts">
import { ref } from 'vue'

const active = ref(0)
</script>

<template>
  <div class="min-h-screen bg-gray-50 pb-16">
    <van-nav-bar title="商场助手" fixed placeholder />
    
    <main class="p-4">
      <router-view />
    </main>
    
    <van-tabbar v-model="active" route fixed>
      <van-tabbar-item icon="home-o" replace to="/">顾客服务</van-tabbar-item>
      <van-tabbar-item icon="user-o" replace to="/profile">我的</van-tabbar-item>
    </van-tabbar>
  </div>
</template>
