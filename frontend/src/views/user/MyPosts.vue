<!-- 模块：我的帖子 -->
<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { getMyPosts, deletePost } from '../../api/index'
import { showToast, showConfirmDialog } from 'vant'

interface PostItem {
  id: number
  title: string
  content: string
  status: string
  createdAt: string
  viewCount: number
  likeCount: number
  commentCount: number
}

const router = useRouter()
const posts = ref<PostItem[]>([])
const loading = ref(false)
const finished = ref(false)
const isError = ref(false)
const errorMsg = ref('')
const page = ref(1)

const onLoad = async () => {
  isError.value = false
  try {
    const res = await getMyPosts({ page: page.value, limit: 10 })
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

const onEdit = (id?: number) => {
  if (!id) return showToast('无效的帖子ID')
  router.push(`/community/publish?id=${id}`)
}

const onDelete = (id?: number) => {
  if (!id) return showToast('无效的帖子ID')
  showConfirmDialog({
    title: '删除帖子',
    message: '确定要删除这条帖子吗？此操作不可恢复。',
  }).then(async () => {
    try {
      const res = await deletePost(id)
      if (res.success) {
        showToast('删除成功')
        posts.value = posts.value.filter(p => p.id !== id)
      } else {
        showToast(res.message || '删除失败')
      }
    } catch (error: any) {
      showToast(error.response?.data?.error || error.message || '删除异常')
    }
  }).catch(() => {})
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
        <h1 class="font-headline-sm text-lg font-bold text-on-surface">我的帖子</h1>
        <div class="w-10 h-10"></div> <!-- Placeholder to balance flex -->
      </div>
    </header>
    
    <main class="flex-1 w-full max-w-2xl mx-auto px-margin-mobile py-6 flex flex-col gap-4">
      
      <div v-if="isError && posts.length === 0" class="flex flex-col items-center justify-center h-64 gap-4">
        <div class="w-16 h-16 bg-error-container text-on-error-container rounded-full flex items-center justify-center mb-2 shadow-sm">
          <i-material-symbols-error-outline  class="text-[32px]"></i-material-symbols-error-outline>
        </div>
        <p class="text-on-surface font-medium">加载失败</p>
        <p class="text-error text-xs px-4 text-center">{{ errorMsg }}</p>
        <button @click="reload" class="mt-2 bg-primary/10 text-primary font-bold text-sm px-6 py-2.5 rounded-full hover:bg-primary/20 transition-colors">
          重试
        </button>
      </div>
      
      <div v-else-if="posts.length === 0 && finished" class="flex flex-col items-center justify-center h-64 gap-4">
        <div class="w-16 h-16 bg-surface-container-high text-on-surface-variant rounded-full flex items-center justify-center mb-2 shadow-sm">
          <i-material-symbols-post-add  class="text-[32px]"></i-material-symbols-post-add>
        </div>
        <p class="text-on-surface-variant text-sm">还没发过帖子哦</p>
        <button @click="router.push('/community/publish')" class="mt-2 bg-primary text-white font-bold text-sm px-6 py-2.5 rounded-full shadow-sm hover:bg-primary/90 transition-colors" style="color: #ffffff !important;">
          去发帖
        </button>
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
            v-for="post in posts" 
            :key="post.id" 
            class="bg-surface-container-lowest rounded-3xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-surface-variant/20 flex flex-col gap-3 active:scale-[0.99] transition-transform cursor-pointer"
            @click="goDetail(post.id)"
          >
            <!-- Header: Status and Date -->
            <div class="flex justify-between items-center">
              <div 
                class="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider"
                :class="{
                  'bg-[#e6f4ea] text-[#137333]': post.status === 'approved',
                  'bg-[#fce8e6] text-[#c5221f]': post.status === 'rejected',
                  'bg-[#fef7e0] text-[#b06000]': post.status !== 'approved' && post.status !== 'rejected'
                }"
              >
                {{ post.status === 'approved' ? '已发布' : post.status === 'rejected' ? '被拒绝' : '审核中' }}
              </div>
              <span class="text-xs text-on-surface-variant/70 font-medium">{{ formatDate(post.createdAt) }}</span>
            </div>
            
            <!-- Title & Content -->
            <div class="flex flex-col gap-1">
              <h3 class="font-headline-sm text-base font-bold text-on-surface line-clamp-1 leading-snug">{{ post.title }}</h3>
              <p class="text-sm text-on-surface-variant line-clamp-2 leading-relaxed">{{ post.content }}</p>
            </div>
            
            <!-- Stats -->
            <div class="flex items-center gap-5 mt-1">
              <div class="flex items-center gap-1.5 text-on-surface-variant/70">
                <i-material-symbols-visibility-outline  class="text-[14px]"></i-material-symbols-visibility-outline>
                <span class="text-[11px] font-medium">{{ post.viewCount }}</span>
              </div>
              <div class="flex items-center gap-1.5 text-on-surface-variant/70">
                <i-material-symbols-favorite-outline  class="text-[14px]"></i-material-symbols-favorite-outline>
                <span class="text-[11px] font-medium">{{ post.likeCount }}</span>
              </div>
              <div class="flex items-center gap-1.5 text-on-surface-variant/70">
                <i-material-symbols-chat-bubble-outline  class="text-[14px]"></i-material-symbols-chat-bubble-outline>
                <span class="text-[11px] font-medium">{{ post.commentCount }}</span>
              </div>
            </div>
            
            <!-- Actions -->
            <div class="flex justify-end gap-3 mt-3 pt-3 border-t border-surface-variant/20" @click.stop>
              <button 
                @click="onEdit(post.id)"
                class="flex items-center justify-center gap-1.5 bg-primary-container text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors active:bg-primary-container/80"
                style="color: #ffffff !important;"
              >
                <i-material-symbols-edit-outline  class="text-[14px]"></i-material-symbols-edit-outline>
                编辑
              </button>
              <button 
                @click="onDelete(post.id)"
                class="flex items-center justify-center gap-1.5 bg-error-container text-on-error-container px-4 py-2 rounded-xl text-xs font-bold transition-colors active:bg-error-container/80"
              >
                <i-material-symbols-delete-outline  class="text-[14px]"></i-material-symbols-delete-outline>
                删除
              </button>
            </div>
          </div>
        </van-list>
      </div>
    </main>
  </div>
</template>
