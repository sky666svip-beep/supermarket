<!-- 模块：社区帖子列表 -->
<script setup lang="ts">
// 模块：社区帖子列表
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { getPosts } from '../../api/index'
import { showToast } from 'vant'

const router = useRouter()
const activeTab = ref('latest')
const posts = ref<any[]>([])
const loading = ref(false)
const finished = ref(false)
const page = ref(1)

const onLoad = async () => {
  try {
    const res = await getPosts({ tab: activeTab.value, page: page.value, limit: 10 })
    if (res.success) {
      if (page.value === 1) {
        posts.value = res.data
      } else {
        posts.value.push(...res.data)
      }
      loading.value = false
      if (res.data.length < 10) {
        finished.value = true
      } else {
        page.value++
      }
    } else {
      showToast(res.message || '获取失败')
      finished.value = true
    }
  } catch (error) {
    showToast('获取失败')
    finished.value = true
  }
}

const onTabChange = () => {
  page.value = 1
  finished.value = false
  loading.value = true
  onLoad()
}

const goDetail = (id: number) => {
  router.push(`/community/post/${id}`)
}

const goPublish = () => {
  router.push('/community/publish')
}

// 格式化时间
const formatTime = (timeStr: string) => {
  const d = new Date(timeStr)
  return `${d.getMonth() + 1}-${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}
</script>

<template>
  <div class="community-container">
    <van-nav-bar title="社区" fixed placeholder />
    
    <van-tabs v-model:active="activeTab" @change="onTabChange" sticky offset-top="46">
      <van-tab title="最新" name="latest"></van-tab>
      <van-tab title="最热" name="hot"></van-tab>
      <van-tab title="精华" name="elite"></van-tab>
    </van-tabs>

    <div class="post-list p-3">
      <van-list
        v-model:loading="loading"
        :finished="finished"
        finished-text="没有更多了"
        @load="onLoad"
      >
        <div v-for="post in posts" :key="post.id" class="post-card bg-white rounded-lg p-4 mb-3 shadow-sm border border-gray-100 transition-all active:scale-[0.98]" @click="goDetail(post.id)">
          <div class="flex items-center mb-2">
            <van-image round width="32" height="32" :src="post.author.avatar || 'https://fastly.jsdelivr.net/npm/@vant/assets/cat.jpeg'" />
            <div class="ml-2 flex-1">
              <div class="text-sm font-medium text-gray-800">{{ post.author.nickname || post.author.username }}</div>
              <div class="text-xs text-gray-400">{{ formatTime(post.createdAt) }}</div>
            </div>
            <van-tag type="primary" plain size="medium" v-if="post.category">{{ post.category }}</van-tag>
          </div>
          <div class="mb-2 flex gap-1" v-if="post.isTop || post.isElite">
             <van-tag type="danger" v-if="post.isTop">置顶</van-tag>
             <van-tag type="warning" v-if="post.isElite">精华</van-tag>
          </div>
          <h3 class="text-base font-bold text-gray-900 mb-1 line-clamp-2">{{ post.title }}</h3>
          <p class="text-sm text-gray-600 mb-2 line-clamp-3">{{ post.content }}</p>
          
          <div class="grid grid-cols-3 gap-1 mb-2" v-if="post.images && JSON.parse(post.images).length > 0">
            <van-image v-for="(img, idx) in JSON.parse(post.images).slice(0,3)" :key="idx" fit="cover" :src="img.startsWith('/uploads') ? '/api' + img : img" class="h-24 w-full rounded" />
          </div>
          
          <div class="flex items-center text-xs text-gray-500 justify-between mt-2 pt-2 border-t border-gray-50">
            <span class="flex items-center"><van-icon name="eye-o" class="mr-1"/>{{ post.viewCount || 0 }}</span>
            <span class="flex items-center"><van-icon name="good-job-o" class="mr-1"/>{{ post.likeCount || 0 }}</span>
            <span class="flex items-center"><van-icon name="comment-o" class="mr-1"/>{{ post.commentCount || 0 }}</span>
          </div>
        </div>
      </van-list>
    </div>

    <!-- 悬浮发帖按钮 -->
    <div class="fixed right-4 bottom-20 z-50">
      <van-button type="primary" icon="plus" round class="shadow-lg w-12 h-12 flex items-center justify-center bg-blue-600 border-none" @click="goPublish"></van-button>
    </div>
  </div>
</template>

<style scoped>
.community-container {
  min-height: 100vh;
  background-color: #f7f8fa;
}
</style>
