<!-- 模块：商品备忘列表 -->
<script setup lang="ts">
import { ref, onMounted, onActivated, computed } from 'vue'
import { useRouter } from 'vue-router'
import { showConfirmDialog, showToast } from 'vant'
import { getItemMemos, updateItemMemo, deleteItemMemo } from '../../api/index'
import { getThumbnailUrl } from '../../utils/image'

const router = useRouter()
const activeTab = ref('全部')
const memos = ref<any[]>([])
const refreshing = ref(false)

const onRefresh = async () => {
  await fetchMemos()
  refreshing.value = false
}

const fetchMemos = async () => {
  try {
    const data = await getItemMemos()
    memos.value = data.map((item: any) => ({
      ...item,
      parsedTags: parseTags(item.tags)
    }))
  } catch (e) {
    showToast('获取备忘录失败')
  }
}

onMounted(() => {
  fetchMemos()
})

onActivated(() => {
  fetchMemos()
})

const categories = computed(() => {
  const cats = new Set<string>()
  cats.add('全部')
  memos.value.forEach(m => {
    if (m.category) cats.add(m.category)
  })
  return Array.from(cats)
})

const filteredMemos = computed(() => {
  if (activeTab.value === '全部') {
    return memos.value
  }
  return memos.value.filter(m => m.category === activeTab.value)
})

const toggleComplete = async (memo: any) => {
  try {
    const newStatus = !memo.isCompleted
    await updateItemMemo(memo.id, { isCompleted: newStatus })
    memo.isCompleted = newStatus
    showToast(newStatus ? '已标记完成 (24小时后自动清理)' : '已取消标记完成')
  } catch (e) {
    showToast('更新状态失败')
  }
}

const onDelete = (memo: any) => {
  showConfirmDialog({
    title: '删除确认',
    message: '确定要删除这条商品备忘吗？'
  }).then(async () => {
    try {
      await deleteItemMemo(memo.id)
      showToast('删除成功')
      fetchMemos()
    } catch (e) {
      showToast('删除失败')
    }
  }).catch(() => {})
}

const parseTags = (tagsStr: string) => {
  if (!tagsStr) return []
  try {
    return JSON.parse(tagsStr)
  } catch (e) {
    return []
  }
}
</script>

<template>
  <div class="antialiased text-on-surface bg-background min-h-screen flex flex-col font-body-md selection:bg-primary-container selection:text-white">
    <!-- TopAppBar -->
    <header class="flex items-center justify-between px-margin-mobile h-16 w-full max-w-2xl mx-auto bg-surface top-0 sticky z-20 shadow-sm">
      <!-- Leading Action (Back) -->
      <button @click="router.back()" class="w-10 h-10 flex items-center justify-center text-primary hover:bg-surface-container-low rounded-full transition-colors active:scale-95">
        <i-material-symbols-chevron-left></i-material-symbols-chevron-left>
      </button>
      <!-- Headline -->
      <h1 class="font-headline-sm text-headline-sm font-bold text-on-surface flex-1 text-center truncate px-2">商品备忘本</h1>
      <!-- Trailing Action (Add) -->
      <button @click="router.push('/customer/memos/edit')" class="w-10 h-10 flex items-center justify-center text-primary hover:bg-surface-container-low rounded-full transition-colors active:scale-95">
        <i-material-symbols-add></i-material-symbols-add>
      </button>
    </header>

    <!-- Tab Bar -->
    <div class="flex overflow-x-auto bg-surface sticky top-16 z-10 shadow-sm border-b border-surface-variant/40 hide-scrollbar w-full max-w-2xl mx-auto px-4 gap-2">
      <button 
        v-for="cat in categories" 
        :key="cat"
        @click="activeTab = cat"
        class="relative py-3 px-4 font-label-md text-label-md transition-all whitespace-nowrap"
        :class="activeTab === cat ? 'text-primary font-bold active:scale-95' : 'text-on-surface-variant hover:text-on-surface'"
      >
        {{ cat }}
        <span v-if="activeTab === cat" class="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-t-full"></span>
      </button>
    </div>

    <!-- Main Content Canvas -->
    <van-pull-refresh v-model="refreshing" @refresh="onRefresh" class="min-h-[calc(100vh-128px)] w-full">
      <main class="p-margin-mobile flex flex-col items-center md:max-w-2xl md:mx-auto w-full">
      
      <!-- Empty State -->
      <div v-if="filteredMemos.length === 0" class="flex-1 flex flex-col items-center justify-center min-h-[400px]">
        <!-- Soft Empty State Illustration -->
        <div class="relative flex items-center justify-center w-48 h-48 mb-6">
          <!-- Ambient Blur -->
          <div class="absolute inset-0 bg-surface-variant/30 rounded-full blur-2xl scale-75"></div>
          <!-- Floating Document Card -->
          <div class="relative z-10 bg-gradient-to-br from-surface-container-lowest to-surface-container-low border border-surface-variant/50 w-28 h-36 rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.04)] flex flex-col items-center p-4">
            <div class="w-full h-1 bg-surface-variant/50 rounded-full mb-3 mt-2"></div>
            <div class="w-3/4 h-1 bg-surface-variant/50 rounded-full mb-3 self-start"></div>
            <div class="w-5/6 h-1 bg-surface-variant/50 rounded-full mb-auto self-start"></div>
            <!-- Bottom stylized "drawer" or fold detail -->
            <div class="w-full h-8 bg-surface-variant/20 rounded-b-lg mt-4 flex items-center justify-center">
              <div class="w-6 h-1 bg-surface-variant/60 rounded-full"></div>
            </div>
          </div>
          <!-- Secondary floating element (subtle) -->
          <div class="absolute right-4 bottom-4 w-12 h-12 bg-surface-container-lowest rounded-lg shadow-sm border border-surface-variant/40 flex items-center justify-center -rotate-6 z-0">
            <i-material-symbols-description-outline  class="text-surface-variant opacity-50"></i-material-symbols-description-outline>
          </div>
        </div>
        <!-- Empty State Message -->
        <p class="font-body-md text-body-md text-secondary text-center tracking-wide">暂无备忘记录</p>
      </div>
      
      <!-- Memo List -->
      <div v-else class="w-full flex flex-col gap-4 pb-24 mt-4">
        <article 
          v-for="memo in filteredMemos" 
          :key="memo.id"
          class="bg-surface-container-lowest rounded-xl shadow-[0px_4px_12px_rgba(0,0,0,0.05)] border border-surface-variant overflow-hidden flex flex-col"
        >
          <div class="relative h-36 bg-surface-container-high w-full overflow-hidden">
            <img 
              v-if="memo.imageUrl"
              :src="getThumbnailUrl(memo.imageUrl)"
              class="w-full h-full object-cover transition-transform hover:scale-105 duration-500"
              alt="Memo Image"
            />
            <div v-else class="w-full h-full flex items-center justify-center text-surface-variant">
              <i-material-symbols-image-outline  class="text-4xl"></i-material-symbols-image-outline>
            </div>
            <!-- Completed Overlay -->
            <div 
              v-if="memo.isCompleted" 
              class="absolute inset-0 bg-inverse-surface/40 backdrop-blur-[2px] flex items-center justify-center z-10 transition-all"
            >
              <i-material-symbols-check-circle-outline style="font-variation-settings: 'FILL' 1;" class="text-white text-5xl"></i-material-symbols-check-circle-outline>
            </div>
          </div>
          
          <div class="p-4 flex flex-col gap-3" :class="{'opacity-70': memo.isCompleted}">
            <!-- Top Info -->
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2 flex-1 overflow-hidden">
                <span v-if="memo.price" class="px-2 py-0.5 rounded-sm bg-error-container text-on-error-container font-label-md text-sm font-bold flex-shrink-0">
                  ￥{{ memo.price }}
                </span>
                <div class="font-headline-sm text-lg font-bold text-on-surface truncate flex-1">{{ memo.style || '未命名商品款式' }}</div>
              </div>
              <span class="px-2 py-0.5 rounded border border-primary/30 text-primary font-label-md text-xs bg-primary/5 flex-shrink-0 ml-2">{{ memo.category }}</span>
            </div>
            
            <!-- Address & Phone -->
            <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
              <div class="flex items-center text-on-surface-variant" v-if="memo.location">
                <i-material-symbols-location-on-outline  class="text-[18px] mr-1"></i-material-symbols-location-on-outline>
                <span class="font-body-md text-sm">{{ memo.location }}</span>
              </div>
              <div class="flex items-center text-on-surface-variant" v-if="memo.contact">
                <i-material-symbols-call-outline class="text-[18px] mr-1" />
                <span class="font-body-md text-sm">{{ memo.contact }}</span>
              </div>
            </div>
            
            <!-- Tags -->
            <div class="flex flex-wrap gap-2" v-if="memo.parsedTags && memo.parsedTags.length > 0">
              <span v-for="tag in memo.parsedTags" :key="tag" class="px-2 py-0.5 rounded-full border border-primary/20 text-primary font-label-md text-xs bg-surface">
                {{ tag }}
              </span>
            </div>
            
            <!-- Actions -->
            <div class="flex justify-end gap-3 border-t border-surface-variant/50 pt-3 mt-1">
              <button 
                @click="toggleComplete(memo)"
                class="px-4 py-1.5 rounded-lg font-label-md text-sm transition-colors active:scale-95"
                :class="memo.isCompleted ? 'bg-surface-container-high text-on-surface-variant hover:bg-surface-variant' : 'bg-primary text-white hover:bg-primary/80'"
                :style="!memo.isCompleted ? 'color: #ffffff !important;' : ''"
              >
                {{ memo.isCompleted ? '取消完成' : '标记完成' }}
              </button>
              <button 
                @click="onDelete(memo)"
                class="px-4 py-1.5 rounded-lg font-label-md text-sm border border-error/50 text-error hover:bg-error-container/50 transition-colors active:scale-95"
              >
                删除
              </button>
            </div>
          </div>
        </article>
      </div>
      </main>
    </van-pull-refresh>
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
