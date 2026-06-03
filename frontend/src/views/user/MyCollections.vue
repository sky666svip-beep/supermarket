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
  <div class="bg-background text-on-background min-h-screen font-body-md selection:bg-primary-container selection:text-white flex flex-col">
    <!-- Header -->
    <header class="bg-surface/80 backdrop-blur-md w-full top-0 sticky flex flex-col z-20 transition-colors border-b border-surface-variant/20">
      <div class="flex items-center justify-between px-margin-mobile h-16 w-full max-w-2xl mx-auto">
        <button type="button" @click="router.back()" class="flex items-center justify-center text-on-surface hover:bg-surface-container-low w-10 h-10 rounded-full transition-colors active:scale-95">
          <span class="material-symbols-outlined">arrow_back_ios_new</span>
        </button>
        <h1 class="font-headline-sm text-lg font-bold text-on-surface">我的收藏</h1>
        <div class="w-10 h-10"></div> <!-- Placeholder to balance flex -->
      </div>
    </header>
    
    <main class="flex-1 w-full max-w-2xl mx-auto px-margin-mobile py-6 flex flex-col gap-4">
      
      <div v-if="isError && posts.length === 0" class="flex flex-col items-center justify-center h-64 gap-4">
        <div class="w-16 h-16 bg-error-container text-on-error-container rounded-full flex items-center justify-center mb-2 shadow-sm">
          <span class="material-symbols-outlined text-[32px]">error</span>
        </div>
        <p class="text-on-surface font-medium">加载失败</p>
        <p class="text-error text-xs px-4 text-center">{{ errorMsg }}</p>
        <button @click="reload" class="mt-2 bg-primary/10 text-primary font-bold text-sm px-6 py-2.5 rounded-full hover:bg-primary/20 transition-colors">
          重试
        </button>
      </div>
      
      <div v-else-if="posts.length === 0 && finished" class="flex flex-col items-center justify-center h-64 gap-4">
        <div class="w-16 h-16 bg-surface-container-high text-on-surface-variant rounded-full flex items-center justify-center mb-2 shadow-sm">
          <span class="material-symbols-outlined text-[32px]">bookmark_added</span>
        </div>
        <p class="text-on-surface-variant text-sm">还没有收藏任何帖子哦</p>
      </div>
      
      <div v-else class="flex flex-col gap-4">
        <van-list
          v-model:loading="loading"
          :finished="finished"
          finished-text="没有更多了"
          @load="onLoad"
          class="flex flex-col gap-4"
        >
          <div 
            v-for="item in posts" 
            :key="item.post?.id || item.id" 
            class="bg-surface-container-lowest rounded-3xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-surface-variant/20 flex flex-col gap-3 active:scale-[0.99] transition-transform cursor-pointer"
            @click="goDetail(item.post?.id)"
          >
            <!-- Header: Author and Uncollect Button -->
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <img :src="item.author?.avatar || 'https://fastly.jsdelivr.net/npm/@vant/assets/cat.jpeg'" class="w-6 h-6 rounded-full object-cover border border-surface-variant/20" />
                <span class="text-xs text-on-surface-variant font-medium">{{ item.author?.nickname || '未知用户' }}</span>
              </div>
              <button 
                @click="onUncollect($event, item)"
                class="flex items-center justify-center gap-1 bg-surface-container-low text-on-surface-variant px-3 py-1.5 rounded-full text-[11px] font-bold transition-colors hover:bg-error-container hover:text-on-error-container active:scale-95"
              >
                <span class="material-symbols-outlined text-[14px]">bookmark_remove</span>
                取消收藏
              </button>
            </div>
            
            <!-- Title & Content -->
            <div class="flex flex-col gap-1 mt-1">
              <h3 class="font-headline-sm text-base font-bold text-on-surface line-clamp-1 leading-snug">{{ item.post?.title || '已删除帖子' }}</h3>
              <p class="text-sm text-on-surface-variant line-clamp-2 leading-relaxed">{{ item.post?.content || '' }}</p>
            </div>
          </div>
        </van-list>
      </div>
    </main>
  </div>
</template>
