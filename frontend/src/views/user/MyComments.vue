<!-- 模块：我的评论 -->
<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { getMySentComments, deleteComment } from '../../api/index'
import { showToast, showDialog } from 'vant'

interface CommentItem {
  comment: {
    id: number
    content: string
    createdAt: string
  }
  post?: {
    id: number
    title: string
  }
}

const router = useRouter()
const comments = ref<CommentItem[]>([])
const loading = ref(false)
const finished = ref(false)
const isError = ref(false)
const errorMsg = ref('')
const page = ref(1)

const onLoad = async () => {
  isError.value = false
  try {
    const res = await getMySentComments({ page: page.value, limit: 10 })
    if (res.success) {
      const data = res.data || []
      comments.value.push(...data)
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
  comments.value = []
  page.value = 1
  finished.value = false
  loading.value = true
  onLoad()
}

const goDetail = (id?: number) => {
  if (!id) return showToast('原帖已失效')
  router.push(`/community/post/${id}`)
}

const handleDelete = (id: number) => {
  showDialog({
    title: '确认删除',
    message: '确定要删除这条评论吗？',
    showCancelButton: true,
    confirmButtonColor: '#ff4d4f',
  }).then(async () => {
    try {
      const res = await deleteComment(id)
      if (res.success) {
        showToast('删除成功')
        // 从列表中移除
        comments.value = comments.value.filter(c => c.comment.id !== id)
      } else {
        showToast(res.message || '删除失败')
      }
    } catch (error: any) {
      showToast(error.response?.data?.message || '删除异常')
    }
  }).catch(() => {
    // on cancel
  })
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
        <h1 class="font-headline-sm text-lg font-bold text-on-surface">我的评论</h1>
        <div class="w-10 h-10"></div> <!-- Placeholder to balance flex -->
      </div>
    </header>
    
    <main class="flex-1 w-full max-w-2xl mx-auto px-margin-mobile py-6 flex flex-col gap-4">
      
      <div v-if="isError && comments.length === 0" class="flex flex-col items-center justify-center h-64 gap-4">
        <div class="w-16 h-16 bg-error-container text-on-error-container rounded-full flex items-center justify-center mb-2 shadow-sm">
          <i-material-symbols-error-outline  class="text-[32px]"></i-material-symbols-error-outline>
        </div>
        <p class="text-on-surface font-medium">加载失败</p>
        <p class="text-error text-xs px-4 text-center">{{ errorMsg }}</p>
        <button @click="reload" class="mt-2 bg-primary/10 text-primary font-bold text-sm px-6 py-2.5 rounded-full hover:bg-primary/20 transition-colors">
          重试
        </button>
      </div>
      
      <div v-else-if="comments.length === 0 && finished" class="flex flex-col items-center justify-center h-64 gap-4">
        <div class="w-16 h-16 bg-surface-container-high text-on-surface-variant rounded-full flex items-center justify-center mb-2 shadow-sm">
          <i-material-symbols-chat-outline  class="text-[32px]"></i-material-symbols-chat-outline>
        </div>
        <p class="text-on-surface-variant text-sm">还没有发表过评论</p>
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
            v-for="item in comments" 
            :key="item.comment?.id" 
            class="bg-surface-container-lowest rounded-3xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-surface-variant/20 flex flex-col gap-3 active:scale-[0.99] transition-transform cursor-pointer"
            @click="goDetail(item.post?.id)"
          >
            <div class="flex justify-between items-start mb-1">
              <span class="text-[11px] text-on-surface-variant font-medium flex-shrink-0">{{ formatDate(item.comment?.createdAt) }}</span>
              <button @click.stop="handleDelete(item.comment.id)" class="text-error opacity-70 hover:opacity-100 hover:bg-error/10 w-8 h-8 rounded-full flex items-center justify-center transition-all -mt-1 -mr-1">
                <i-material-symbols-delete-outline class="text-lg"></i-material-symbols-delete-outline>
              </button>
            </div>
            
            <div class="text-sm text-on-surface-variant mb-2 line-clamp-1">
              评论了原帖: <span class="text-primary font-medium">《{{ item.post?.title || '帖子已失效' }}》</span>
            </div>
            
            <div class="bg-surface-container-low p-3 rounded-2xl text-sm text-on-surface leading-relaxed border border-surface-variant/10 whitespace-pre-wrap break-words">
              {{ item.comment?.content || '' }}
            </div>
          </div>
        </van-list>
      </div>
    </main>
  </div>
</template>
