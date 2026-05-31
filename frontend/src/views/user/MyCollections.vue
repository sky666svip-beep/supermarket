<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getMyCollections } from '../../api/index'
import { showToast } from 'vant'

const router = useRouter()
const posts = ref<any[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    const res = await getMyCollections()
    if (res.success) {
      posts.value = res.data
    } else {
      showToast(res.message || '获取失败')
    }
  } catch (error) {
    showToast('获取异常')
  } finally {
    loading.value = false
  }
})

const goDetail = (id: number) => {
  router.push(`/community/post/${id}`)
}
</script>

<template>
  <div class="my-collections-container min-h-screen bg-gray-50 pb-4">
    <van-nav-bar title="我的收藏" left-arrow @click-left="router.back()" fixed placeholder />
    
    <van-loading v-if="loading" class="mt-10 text-center" />
    
    <div v-else-if="posts.length === 0" class="mt-20 text-center text-gray-400">
      <van-empty description="还没有收藏任何帖子哦" />
    </div>
    
    <div v-else class="p-3">
      <div v-for="item in posts" :key="item.post.id" class="bg-white rounded-lg p-4 mb-3 shadow-sm border border-gray-100" @click="goDetail(item.post.id)">
        <div class="flex items-center mb-2">
          <van-image round width="24" height="24" :src="item.author.avatar || 'https://fastly.jsdelivr.net/npm/@vant/assets/cat.jpeg'" />
          <span class="ml-2 text-xs text-gray-600">{{ item.author.nickname }}</span>
        </div>
        <h3 class="text-base font-bold text-gray-900 mb-1 line-clamp-1">{{ item.post.title }}</h3>
        <p class="text-sm text-gray-600 line-clamp-2 mb-2">{{ item.post.content }}</p>
      </div>
    </div>
  </div>
</template>
