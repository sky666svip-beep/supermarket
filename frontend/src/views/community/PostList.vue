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
      const formattedData = res.data.map((item: any) => {
        let parsedImages = []
        if (item.images) {
          try {
            parsedImages = JSON.parse(item.images)
            if (!Array.isArray(parsedImages)) parsedImages = []
          } catch (e) {}
        }
        return { ...item, parsedImages }
      })
      
      if (page.value === 1) {
        posts.value = formattedData
      } else {
        posts.value.push(...formattedData)
      }
      loading.value = false
      if (res.data.length < 10) {
        finished.value = true
      } else {
        page.value++
      }
    } else {
      showToast(res.message || '获取失败')
      loading.value = false
      finished.value = true
    }
  } catch (error) {
    showToast('获取失败')
    loading.value = false
    finished.value = true
  }
}

const onTabChange = () => {
  posts.value = []
  page.value = 1
  finished.value = false
  // 将 loading 置为 false，van-list 检测到数据为空且未加载完成时，会自动触发 @load 防止重复请求
  loading.value = false
}

const goDetail = (id: number) => {
  router.push(`/community/post/${id}`)
}

const goPublish = () => {
  router.push('/community/publish')
}

// 格式化时间
const formatTime = (timeStr: string) => {
  if (!timeStr) return ''
  const d = new Date(timeStr)
  if (isNaN(d.getTime())) return ''
  return `${d.getMonth() + 1}-${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}
</script>

<template>
  <div class="bg-surface text-on-surface min-h-screen pb-20 antialiased font-body-md">
    <!-- TopAppBar -->
    <header class="bg-surface fixed top-0 left-0 w-full z-50 shadow-sm transition-all duration-300">
      <div class="flex items-center justify-center px-4 w-full h-14 relative">
        <h1 class="font-headline-sm text-headline-sm font-bold text-primary">社区</h1>
      </div>
      <!-- Tabs -->
      <nav class="flex border-b border-surface-variant overflow-x-auto hide-scrollbar">
        <button 
          @click="activeTab = 'latest'; onTabChange()"
          class="flex-1 py-3 text-center font-label-md text-label-md transition-colors relative"
          :class="activeTab === 'latest' ? 'border-b-2 border-primary text-primary' : 'border-b-2 border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'"
        >最新</button>
        <button 
          @click="activeTab = 'hot'; onTabChange()"
          class="flex-1 py-3 text-center font-label-md text-label-md transition-colors relative"
          :class="activeTab === 'hot' ? 'border-b-2 border-primary text-primary' : 'border-b-2 border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'"
        >最热</button>
        <button 
          @click="activeTab = 'elite'; onTabChange()"
          class="flex-1 py-3 text-center font-label-md text-label-md transition-colors relative"
          :class="activeTab === 'elite' ? 'border-b-2 border-primary text-primary' : 'border-b-2 border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'"
        >精华</button>
      </nav>
    </header>

    <!-- Main Canvas -->
    <main class="pt-[104px] px-4 py-4 space-y-4 max-w-3xl mx-auto">
      <van-list
        v-model:loading="loading"
        :finished="finished"
        finished-text="没有更多了"
        @load="onLoad"
      >
        <article 
          v-for="post in posts" :key="post.id"
          class="bg-surface-container-lowest rounded-xl shadow-sm p-4 border border-surface-variant/50 mb-4 cursor-pointer hover:bg-surface-container-low transition-colors active:scale-[0.98]"
          @click="goDetail(post.id)"
        >
          <!-- Header -->
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center space-x-2">
              <div class="w-10 h-10 rounded-full overflow-hidden bg-surface-container flex-shrink-0">
                <img alt="Avatar" class="w-full h-full object-cover" :src="post.author?.avatar || 'https://fastly.jsdelivr.net/npm/@vant/assets/cat.jpeg'" />
              </div>
              <div>
                <h3 class="font-label-md text-label-md text-on-surface">{{ post.author?.nickname || post.author?.username || '用户' }}</h3>
                <p class="font-body-md text-[12px] text-on-surface-variant">{{ formatTime(post.createdAt) }}</p>
              </div>
            </div>
            <span v-if="post.category" class="px-2 py-1 rounded border border-primary text-primary font-label-md text-[10px]">{{ post.category }}</span>
          </div>

          <!-- Content -->
          <div class="mb-3">
            <div class="flex gap-1 mb-2" v-if="post.isTop || post.isElite">
               <span v-if="post.isTop" class="px-1.5 py-0.5 rounded bg-error/10 text-error font-label-md text-[10px]">置顶</span>
               <span v-if="post.isElite" class="px-1.5 py-0.5 rounded bg-tertiary/10 text-tertiary font-label-md text-[10px]">精华</span>
            </div>
            <h2 class="font-headline-sm text-headline-sm text-on-surface mb-1 line-clamp-2">{{ post.title }}</h2>
            <p class="font-body-md text-body-md text-on-surface-variant line-clamp-3">{{ post.content }}</p>
          </div>

          <!-- Images -->
          <div class="grid grid-cols-3 gap-2 mb-3" v-if="post.parsedImages && post.parsedImages.length > 0">
            <div v-for="(img, idx) in post.parsedImages.slice(0,3)" :key="idx" class="w-full h-24 rounded-lg overflow-hidden border border-surface-variant/30">
              <img class="w-full h-full object-cover" :src="img.startsWith('/uploads') ? '/api' + img : img" />
            </div>
          </div>

          <!-- Metrics -->
          <div class="flex items-center justify-between text-on-surface-variant font-body-md text-[13px] pt-3 border-t border-surface-variant/30">
            <div class="flex items-center space-x-1 hover:text-primary transition-colors">
              <span class="material-symbols-outlined text-[18px]">visibility</span>
              <span>{{ post.viewCount || 0 }}</span>
            </div>
            <div class="flex items-center space-x-1 hover:text-primary transition-colors">
              <span class="material-symbols-outlined text-[18px]">thumb_up</span>
              <span>{{ post.likeCount || 0 }}</span>
            </div>
            <div class="flex items-center space-x-1 hover:text-primary transition-colors">
              <span class="material-symbols-outlined text-[18px]">chat</span>
              <span>{{ post.commentCount || 0 }}</span>
            </div>
          </div>
        </article>
      </van-list>
    </main>

    <!-- Floating Action Button -->
    <button @click="goPublish" class="fixed bottom-24 right-4 w-14 h-14 bg-primary text-white rounded-full shadow-lg flex items-center justify-center hover:bg-primary-container active:scale-95 transition-all duration-200 z-40">
      <span class="material-symbols-outlined font-bold text-[28px]">add</span>
    </button>
  </div>
</template>

<style scoped>
.hide-scrollbar::-webkit-scrollbar {
  display: none;
}
.hide-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
