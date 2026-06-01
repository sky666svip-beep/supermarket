<script setup lang="ts">
import { ref, onMounted } from 'vue'
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
const loading = ref(true)
const isError = ref(false)

const fetchMessages = async () => {
  loading.value = true
  isError.value = false
  try {
    const res = await getMyReceivedComments()
    if (res.success) {
      messages.value = res.data
    } else {
      isError.value = true
      showToast(res.message || '获取失败')
    }
  } catch (error) {
    isError.value = true
    showToast('获取异常')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchMessages()
})

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
    
    <van-loading v-if="loading" class="mt-10 text-center" />
    
    <div v-else-if="isError" class="mt-20 text-center text-gray-400">
      <van-empty description="加载失败" />
      <van-button size="small" type="primary" class="mt-4" @click="fetchMessages">重试</van-button>
    </div>
    
    <div v-else-if="messages.length === 0" class="mt-20 text-center text-gray-400">
      <van-empty description="暂时没有收到任何回复" />
    </div>
    
    <div v-else class="p-3">
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
    </div>
  </div>
</template>
