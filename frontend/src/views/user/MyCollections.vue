<!-- 模块：我的收藏 -->
<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { getMyCollections, collectPost } from '../../api/index'
import { showToast, showDialog } from 'vant'

interface CollectionItem {
  id: number
  postId: number
  createdAt: string
  post?: {
    id: number
    title: string
    content: string
  }
  author?: {
    id: number
    nickname: string
    avatar: string | null
  }
}

const router = useRouter()
const posts = ref<CollectionItem[]>([])
const loading = ref(false)
const finished = ref(false)
const isError = ref(false)
const errorMsg = ref('')
const page = ref(1)

const onLoad = async () => {
  isError.value = false
  try {
    const res = await getMyCollections({ page: page.value, limit: 10 })
    if (res.success) {
      const data = res.data || []
      posts.value.push(...data)
      page.value++
      if (data.length < 10) {
        finished.value = true
      }
    } else {
      isError.value = true
      errorMsg.value = res.message || '获取失败'
      finished.value = true
    }
  } catch (error: any) {
    isError.value = true
    errorMsg.value = error.response?.data?.error || error.message || '获取异常'
    finished.value = true
  } finally {
    loading.value = false
  }
}

const reload = () => {
  posts.value = []
  page.value = 1
  finished.value = false
  loading.value = true
  onLoad()
}

const goDetail = (id?: number) => {
  if (!id) return showToast('无效的帖子ID')
  router.push(`/community/post/${id}`)
}

const onUncollect = (e: Event, item: CollectionItem) => {
  e.stopPropagation()
  showDialog({
    title: '提示',
    message: '确定要取消收藏吗？',
    showCancelButton: true
  }).then(async () => {
    try {
      if (!item.post?.id) {
        showToast('无效的帖子ID')
        return
      }
      const res = await collectPost(item.post.id)
      if (res.success) {
        showToast('已取消收藏')
        posts.value = posts.value.filter(p => p.post?.id !== item.post?.id)
      } else {
        showToast(res.message || '取消失败')
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || err.message || '取消失败')
    }
  }).catch(() => {})
}
</script>

<template>
  <div class="my-collections-container min-h-screen bg-gray-50 pb-4">
    <van-nav-bar title="我的收藏" left-arrow @click-left="router.back()" fixed placeholder />
    
    <div v-if="isError && posts.length === 0" class="mt-20 text-center text-gray-400">
      <van-empty description="加载失败" />
      <div class="text-xs text-red-400 mt-2 px-4">{{ errorMsg }}</div>
      <van-button size="small" type="primary" class="mt-4" @click="reload">重试</van-button>
    </div>
    
    <div v-else-if="posts.length === 0 && finished" class="mt-20 text-center text-gray-400">
      <van-empty description="还没有收藏任何帖子哦" />
    </div>
    
    <div v-else class="p-3">
      <van-list
        v-model:loading="loading"
        :finished="finished"
        finished-text="没有更多了"
        @load="onLoad"
      >
        <div 
          v-for="item in posts" 
          :key="item.post?.id || item.id" 
          class="bg-white rounded-lg p-4 mb-3 shadow-sm border border-gray-100 flex flex-col relative"
          @click="goDetail(item.post?.id)"
        >
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center">
              <van-image round width="24" height="24" :src="item.author?.avatar || 'https://fastly.jsdelivr.net/npm/@vant/assets/cat.jpeg'" />
              <span class="ml-2 text-xs text-gray-600">{{ item.author?.nickname || '未知用户' }}</span>
            </div>
            <van-button size="mini" plain type="danger" round @click="onUncollect($event, item)">取消收藏</van-button>
          </div>
          <h3 class="text-base font-bold text-gray-900 mb-1 line-clamp-1 pr-16">{{ item.post?.title || '已删除帖子' }}</h3>
          <p class="text-sm text-gray-600 line-clamp-2 mb-2">{{ item.post?.content || '' }}</p>
        </div>
      </van-list>
    </div>
  </div>
</template>
