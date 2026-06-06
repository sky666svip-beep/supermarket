<!-- 模块：我的消息 -->
<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { getMyReceivedComments } from '../../api/index'
import { showToast } from 'vant'

interface MessageItem {
  comment: {
    id: number
    content: string
    createdAt: string
  }
  post?: {
    id: number
    title: string
  }
  author?: {
    id: number
    nickname: string
    username: string
    avatar: string | null
  }
}

const router = useRouter()
const messages = ref<MessageItem[]>([])
const loading = ref(false)
const finished = ref(false)
const isError = ref(false)
const errorMsg = ref('')
const page = ref(1)

const onLoad = async () => {
  isError.value = false
  try {
    const res = await getMyReceivedComments({ page: page.value, limit: 10 })
    if (res.success) {
      const data = res.data || []
      messages.value.push(...data)
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
  messages.value = []
  page.value = 1
  finished.value = false
  loading.value = true
  onLoad()
}

const goDetail = (id?: number) => {
  if (!id) return showToast('无效的帖子ID')
  router.push(`/community/post/${id}`)
}

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '未知时间'
  const d = new Date(dateStr)
  return isNaN(d.getTime()) ? '无效时间' : d.toLocaleDateString()
}
</script>

<template>
  <div class="bg-background text-on-background min-h-screen font-body-md selection:bg-primary-container selection:text-white flex flex-col">
    <!-- Header -->
    <header class="bg-surface/80 backdrop-blur-md w-full top-0 sticky flex flex-col z-20 transition-colors border-b border-surface-variant/20">
      <div class="flex items-center justify-between px-margin-mobile h-16 w-full max-w-2xl mx-auto">
        <button type="button" @click="router.back()" class="flex items-center justify-center text-on-surface hover:bg-surface-container-low w-10 h-10 rounded-full transition-colors active:scale-95">
          <i-material-symbols-arrow-back-ios-new></i-material-symbols-arrow-back-ios-new>
        </button>
        <h1 class="font-headline-sm text-lg font-bold text-on-surface">收到的回复</h1>
        <div class="w-10 h-10"></div> <!-- Placeholder to balance flex -->
      </div>
    </header>
    
    <main class="flex-1 w-full max-w-2xl mx-auto px-margin-mobile py-6 flex flex-col gap-4">
      
      <div v-if="isError && messages.length === 0" class="flex flex-col items-center justify-center h-64 gap-4">
        <div class="w-16 h-16 bg-error-container text-on-error-container rounded-full flex items-center justify-center mb-2 shadow-sm">
          <i-material-symbols-error-outline  class="text-[32px]"></i-material-symbols-error-outline>
        </div>
        <p class="text-on-surface font-medium">加载失败</p>
        <p class="text-error text-xs px-4 text-center">{{ errorMsg }}</p>
        <button @click="reload" class="mt-2 bg-primary/10 text-primary font-bold text-sm px-6 py-2.5 rounded-full hover:bg-primary/20 transition-colors">
          重试
        </button>
      </div>
      
      <div v-else-if="messages.length === 0 && finished" class="flex flex-col items-center justify-center h-64 gap-4">
        <div class="w-16 h-16 bg-surface-container-high text-on-surface-variant rounded-full flex items-center justify-center mb-2 shadow-sm">
          <i-material-symbols-mark-email-read-outline  class="text-[32px]"></i-material-symbols-mark-email-read-outline>
        </div>
        <p class="text-on-surface-variant text-sm">暂时没有收到任何回复</p>
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
            v-for="msg in messages" 
            :key="msg.comment?.id" 
            class="bg-surface-container-lowest rounded-3xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-surface-variant/20 flex flex-col gap-3 active:scale-[0.99] transition-transform cursor-pointer"
            @click="goDetail(msg.post?.id)"
          >
            <div class="flex items-start gap-3">
              <img :src="msg.author?.avatar || 'https://fastly.jsdelivr.net/npm/@vant/assets/cat.jpeg'" class="w-10 h-10 rounded-full object-cover border border-surface-variant/20 flex-shrink-0" />
              <div class="flex-1 flex flex-col min-w-0">
                <div class="flex justify-between items-center mb-1">
                  <span class="font-headline-sm text-sm font-bold text-on-surface truncate">{{ msg.author?.nickname || msg.author?.username || '未知用户' }}</span>
                  <span class="text-[11px] text-on-surface-variant font-medium flex-shrink-0 ml-2">{{ formatDate(msg.comment?.createdAt) }}</span>
                </div>
                
                <div class="text-sm text-on-surface-variant mb-2 line-clamp-1">
                  回复了你的帖子: <span class="text-primary font-medium">《{{ msg.post?.title || '帖子已删除' }}》</span>
                </div>
                
                <div class="bg-surface-container-low p-3 rounded-2xl text-sm text-on-surface line-clamp-2 leading-relaxed border border-surface-variant/10">
                  {{ msg.comment?.content || '' }}
                </div>
              </div>
            </div>
          </div>
        </van-list>
      </div>
    </main>
  </div>
</template>
