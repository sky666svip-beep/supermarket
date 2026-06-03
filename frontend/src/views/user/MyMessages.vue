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
  <div class="my-messages-container min-h-screen bg-gray-50 pb-4">
    <van-nav-bar title="收到的回复" left-arrow @click-left="router.back()" fixed placeholder />
    
    <div v-if="isError && messages.length === 0" class="mt-20 text-center text-gray-400">
      <van-empty description="加载失败" />
      <div class="text-xs text-red-400 mt-2 px-4">{{ errorMsg }}</div>
      <van-button size="small" type="primary" class="mt-4" @click="reload">重试</van-button>
    </div>
    
    <div v-else-if="messages.length === 0 && finished" class="mt-20 text-center text-gray-400">
      <van-empty description="暂时没有收到任何回复" />
    </div>
    
    <div v-else class="p-3">
      <van-list
        v-model:loading="loading"
        :finished="finished"
        finished-text="没有更多了"
        @load="onLoad"
      >
        <div v-for="msg in messages" :key="msg.comment?.id" class="bg-white rounded-lg p-4 mb-3 shadow-sm border border-gray-100" @click="goDetail(msg.post?.id)">
          <div class="flex items-start">
            <van-image round width="32" height="32" :src="msg.author?.avatar || 'https://fastly.jsdelivr.net/npm/@vant/assets/cat.jpeg'" class="mt-1" />
            <div class="ml-2 flex-1">
              <div class="flex justify-between items-center mb-1">
                <span class="text-sm font-medium text-gray-800">{{ msg.author?.nickname || msg.author?.username || '未知用户' }}</span>
                <span class="text-xs text-gray-400">{{ formatDate(msg.comment?.createdAt) }}</span>
              </div>
              <div class="text-sm text-gray-600 mb-2">回复了你的帖子: <span class="text-blue-500">《{{ msg.post?.title || '帖子已删除' }}》</span></div>
              <div class="bg-gray-50 p-2 rounded text-sm text-gray-800 line-clamp-2">
                {{ msg.comment?.content || '' }}
              </div>
            </div>
          </div>
        </div>
      </van-list>
    </div>
  </div>
</template>
