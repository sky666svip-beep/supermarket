<!-- 模块：同店互助 -->
<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showLoadingToast, showImagePreview } from 'vant'
import { getStores, getPosts, publishPost, uploadImage } from '../../api/index'
import { getCachedLocation, setCachedLocation } from '../../utils/location'

const router = useRouter()
const stores = ref<any[]>([])
const currentStoreId = ref<number | null>(null)
const closestStoreIds = ref<number[]>([]) // 存储最近的3个门店ID
const activeTab = ref<string>('全部') // '全部', '寻物问答', '拼车互助'
const posts = ref<any[]>([])
const loading = ref(false)
const locating = ref(false)

// Selectors and Popups
const showStorePicker = ref(false)
const showPublishPopup = ref(false)

// Geolocation distance calculation
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371 // km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

// Fetch all stores
const loadStores = async () => {
  try {
    const res = await getStores()
    stores.value = res || []
  } catch (e) {
    showToast('获取门店失败')
  }
}

// Fetch posts based on current selection
const fetchPosts = async () => {
  if (!currentStoreId.value) return
  loading.value = true
  try {
    const categoryParam = activeTab.value === '全部' ? undefined : activeTab.value
    const res = await getPosts({
      storeId: currentStoreId.value,
      category: categoryParam,
      tab: 'latest',
      limit: 50
    })
    if (res.success) {
      // Filter only mutual aid posts if '全部' tab is active
      if (activeTab.value === '全部') {
        posts.value = (res.data || []).filter((p: any) => p.category === '寻物问答' || p.category === '拼车互助')
      } else {
        posts.value = res.data || []
      }
    } else {
      showToast(res.message || '获取互助信息失败')
    }
  } catch (error) {
    showToast('数据加载异常')
  } finally {
    loading.value = false
  }
}

const tryBrowserGeolocation = (): Promise<{ lat: number; lng: number } | null> => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 5000, maximumAge: 60000 }
    )
  })
}

// Trigger initial location binding
const handleLocationAndInit = async () => {
  locating.value = true
  const toast = showLoadingToast({
    message: '正在获取定位...',
    forbidClick: true,
    duration: 0
  })

  try {
    let loc = getCachedLocation()
    let userLat = loc?.lat
    let userLng = loc?.lng

    if (!userLat || !userLng) {
      const coords = await tryBrowserGeolocation()
      if (coords) {
        userLat = coords.lat
        userLng = coords.lng
        setCachedLocation({ ...loc, lat: coords.lat, lng: coords.lng } as any)
      }
    }

    if (userLat && userLng && stores.value.length > 0) {
      // Calculate distances for all stores
      const storesWithDistance = stores.value.map(s => {
        let distance = Infinity
        if (s.latitude && s.longitude) {
          distance = calculateDistance(userLat!, userLng!, parseFloat(String(s.latitude)), parseFloat(String(s.longitude)))
        }
        return { ...s, distance }
      })

      // Sort by distance and get top 3
      storesWithDistance.sort((a, b) => a.distance - b.distance)
      const top3 = storesWithDistance.slice(0, 3)
      closestStoreIds.value = top3.map(s => s.id)

      // Set current selected store to the closest one if not already set, or if saved store matches
      const savedStoreId = localStorage.getItem('selected_mutual_help_store_id')
      if (savedStoreId) {
        currentStoreId.value = parseInt(savedStoreId)
      } else if (top3.length > 0) {
        currentStoreId.value = top3[0].id
        localStorage.setItem('selected_mutual_help_store_id', top3[0].id.toString())
      }
    }
  } catch (e) {
    console.error('Failed to auto locate:', e)
  } finally {
    toast.close()
    locating.value = false
    
    // Fallback: If no store selected (due to location permission blocked or failed)
    if (!currentStoreId.value && stores.value.length > 0) {
      const savedStoreId = localStorage.getItem('selected_mutual_help_store_id')
      if (savedStoreId) {
        currentStoreId.value = parseInt(savedStoreId)
      } else {
        currentStoreId.value = stores.value[0].id
        localStorage.setItem('selected_mutual_help_store_id', stores.value[0].id.toString())
      }
    }
    
    if (currentStoreId.value) {
      fetchPosts()
    }
  }
}

onMounted(async () => {
  await loadStores()
  await handleLocationAndInit()
})

// Watchers for reactive updates
watch([currentStoreId, activeTab], () => {
  fetchPosts()
})

// Computed options for Store Picker
const storeOptions = computed(() => {
  const closestStores = stores.value.filter(s => closestStoreIds.value.includes(s.id))
  // If location failed or not permitted, show all stores
  const displayStores = closestStores.length > 0 ? closestStores : stores.value
  return displayStores.map(s => ({ text: s.name, value: s.id }))
})

const currentStoreName = computed(() => {
  const s = stores.value.find(item => item.id === currentStoreId.value)
  return s ? s.name : '未选择门店'
})

const onStoreConfirm = ({ selectedOptions }: any) => {
  if (selectedOptions && selectedOptions[0]) {
    currentStoreId.value = selectedOptions[0].value
    localStorage.setItem('selected_mutual_help_store_id', selectedOptions[0].value.toString())
    showToast(`已切换至: ${selectedOptions[0].text}`)
  }
  showStorePicker.value = false
}

// ---------------- 发帖逻辑集成 ----------------
const newTitle = ref('')
const newContent = ref('')
const newCategory = ref('寻物问答')
const fileList = ref<any[]>([])

const handleOpenPublish = () => {
  const userStr = localStorage.getItem('user')
  if (!userStr) {
    showToast('发布互助信息需要先进行登录')
    router.push('/login')
    return
  }
  // Initialize form
  newTitle.value = ''
  newContent.value = ''
  newCategory.value = '寻物问答'
  fileList.value = []
  showPublishPopup.value = true
}

const afterRead = async (file: any) => {
  file.status = 'uploading'
  file.message = '上传中...'
  try {
    const res = await uploadImage(file.file)
    if (res.success) {
      file.status = 'done'
      file.url = res.url
    } else {
      file.status = 'failed'
      file.message = '上传失败'
    }
  } catch (error) {
    file.status = 'failed'
    file.message = '上传失败'
  }
}

const onSubmitPublish = async () => {
  if (!currentStoreId.value) {
    showToast('异常状态：无关联门店')
    return
  }
  if (!newTitle.value.trim() || !newContent.value.trim()) {
    showToast('互助标题和描述内容不能为空')
    return
  }

  // 链接过滤强规则 (前端强阻断校验)
  const linkRegex = /(http[s]?:\/\/|www\.)|([a-zA-Z0-9\-\_]+\.(com|cn|net|org|io|me|cc|co))/i
  if (linkRegex.test(newTitle.value) || linkRegex.test(newContent.value)) {
    showToast('根据互助规范，发布内容禁止包含网页链接，防范垃圾广告')
    return
  }

  const images = fileList.value.filter(item => item.status === 'done' || item.url).map(item => item.url)
  const toast = showLoadingToast({ message: '提交中...', forbidClick: true, duration: 0 })

  try {
    const res = await publishPost({
      storeId: currentStoreId.value,
      title: newTitle.value.trim(),
      content: newContent.value.trim(),
      category: newCategory.value,
      images
    })

    toast.close()
    if (res.success) {
      showToast('发布成功！同店互助已实时上线')
      showPublishPopup.value = false
      fetchPosts()
    } else {
      showToast(res.message || '发布失败')
    }
  } catch (error) {
    toast.close()
    showToast('发布失败，请检查网络配置')
  }
}

const parseImages = (imagesStr: string | null) => {
  if (!imagesStr) return []
  try { return JSON.parse(imagesStr) } catch { return [] }
}

const previewImage = (images: string[], startPosition: number) => {
  showImagePreview({
    images: images.map(img => img.startsWith('/uploads') ? '/api' + img : img),
    startPosition,
  })
}

const formatTime = (timeStr: string) => {
  const d = new Date(timeStr)
  return `${d.getMonth() + 1}-${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}
</script>

<template>
  <div class="mutual-help-container bg-background text-on-background min-h-screen font-body-md selection:bg-primary-container selection:text-white pb-20 flex flex-col">
    <!-- Top App Bar with Store Selector -->
    <header class="bg-surface w-full top-0 sticky flex flex-col z-20 shadow-sm transition-colors">
      <div class="flex items-center justify-between px-margin-mobile h-16 w-full max-w-2xl mx-auto">
        <button type="button" @click="router.push('/')" class="flex items-center justify-center text-primary hover:bg-surface-container-low w-10 h-10 rounded-full transition-colors active:scale-95">
          <span class="material-symbols-outlined">arrow_back_ios_new</span>
        </button>
        <h1 class="font-headline-sm text-headline-sm font-bold text-on-surface truncate max-w-[50%] text-center">
          同店互助广场
        </h1>
        <div @click="showStorePicker = true" class="flex items-center gap-1 text-primary bg-primary/10 px-2.5 py-1.5 rounded-full cursor-pointer hover:bg-primary/20 transition-colors max-w-[120px]">
          <span class="material-symbols-outlined text-[16px]">location_on</span>
          <span class="text-xs font-bold truncate">{{ currentStoreName }}</span>
          <span class="material-symbols-outlined text-[16px]">arrow_drop_down</span>
        </div>
      </div>
    </header>

    <!-- Tabs -->
    <van-tabs v-model:active="activeTab" sticky offset-top="64" color="#005c6c" title-active-color="#005c6c" class="border-b border-surface-variant/30">
      <van-tab title="全部" name="全部"></van-tab>
      <van-tab title="寻物问答" name="寻物问答"></van-tab>
      <van-tab title="拼车互助" name="拼车互助"></van-tab>
    </van-tabs>

    <main class="flex-1 w-full max-w-2xl mx-auto">
      <!-- Loading state -->
      <div v-if="loading" class="flex justify-center items-center py-20">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>

      <!-- Empty state -->
      <div v-else-if="posts.length === 0" class="py-20 flex flex-col items-center justify-center text-center px-4">
        <div class="w-24 h-24 mb-4 opacity-70">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full text-surface-variant"><path d="M15.5 14H14.71L14.43 13.73C15.41 12.59 16 11.11 16 9.5C16 5.91 13.09 3 9.5 3C5.91 3 3 5.91 3 9.5C3 13.09 5.91 16 9.5 16C11.11 16 12.59 15.41 13.73 14.43L14 14.71V15.5L19 20.49L20.49 19L15.5 14ZM9.5 14C7.01 14 5 11.99 5 9.5C5 7.01 7.01 5 9.5 5C11.99 5 14 7.01 14 9.5C14 11.99 11.99 14 9.5 14Z" fill="currentColor"/></svg>
        </div>
        <p class="text-sm text-on-surface-variant mb-6 font-medium">该门店目前暂无互助信息</p>
        <button 
          @click="handleOpenPublish"
          class="bg-primary text-white px-6 py-2.5 rounded-full font-label-lg font-bold shadow-sm active:scale-95 transition-transform"
        >
          成为第一个发布的人
        </button>
      </div>

      <!-- Post List -->
      <div v-else class="p-4 flex flex-col gap-4">
        <article 
          v-for="post in posts" 
          :key="post.id"
          class="bg-surface-container-lowest border border-surface-variant/50 rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] active:scale-[0.99] transition-all cursor-pointer flex flex-col gap-3"
          @click="router.push(`/community/post/${post.id}`)"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-full overflow-hidden border border-surface-variant/30 shrink-0">
                <van-image :src="post.author.avatar || 'https://fastly.jsdelivr.net/npm/@vant/assets/cat.jpeg'" width="100%" height="100%" fit="cover" />
              </div>
              <div class="flex flex-col">
                <span class="font-label-md font-bold text-on-surface">{{ post.author.nickname || post.author.username }}</span>
                <span class="text-[10px] text-on-surface-variant">{{ formatTime(post.createdAt) }}</span>
              </div>
            </div>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full" :class="post.category === '寻物问答' ? 'bg-primary/10 text-primary' : 'bg-[#10b981]/10 text-[#10b981]'">
              {{ post.category }}
            </span>
          </div>

          <div class="flex flex-col gap-1">
            <h2 class="font-headline-sm text-base font-bold text-on-surface line-clamp-1">
              {{ post.title }}
            </h2>
            <p class="text-sm text-on-surface-variant leading-relaxed line-clamp-3 whitespace-pre-wrap">
              {{ post.content }}
            </p>
          </div>

          <div 
            v-if="parseImages(post.images).length > 0" 
            class="grid gap-2 mt-1"
            :class="parseImages(post.images).length === 1 ? 'grid-cols-1 max-w-[60%]' : (parseImages(post.images).length === 2 ? 'grid-cols-2 max-w-[80%]' : 'grid-cols-3')"
            @click.stop
          >
            <div 
              v-for="(img, idx) in parseImages(post.images).slice(0, 3)" 
              :key="idx"
              class="aspect-square rounded-xl overflow-hidden shadow-sm border border-surface-variant/30 cursor-pointer active:scale-95 transition-transform"
              @click="previewImage(parseImages(post.images), Number(idx))"
            >
              <van-image :src="img.startsWith('/uploads') ? '/api' + img : img" width="100%" height="100%" fit="cover" />
            </div>
          </div>

          <div class="flex items-center justify-between text-xs text-on-surface-variant font-medium pt-3 border-t border-surface-variant/30 mt-1">
            <div class="flex items-center gap-4">
              <span class="flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">visibility</span> {{ post.viewCount || 0 }}</span>
              <span class="flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">chat_bubble</span> {{ post.commentCount || 0 }}</span>
            </div>
            <span class="flex items-center gap-1 text-primary"><span class="material-symbols-outlined text-[14px]">thumb_up</span> {{ post.likeCount || 0 }}</span>
          </div>
        </article>
      </div>
    </main>

    <!-- FAB -->
    <button 
      @click="handleOpenPublish"
      class="fixed bottom-20 right-6 w-14 h-14 rounded-2xl bg-primary text-white shadow-[0_4px_12px_rgba(0,92,108,0.3)] flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-all z-40"
    >
      <span class="material-symbols-outlined text-[28px]">edit_square</span>
    </button>

    <!-- Store Picker Popup -->
    <van-popup v-model:show="showStorePicker" position="bottom" round safe-area-inset-bottom>
      <van-picker :columns="storeOptions" @confirm="onStoreConfirm" @cancel="showStorePicker = false" show-toolbar title="选择关联门店" />
    </van-popup>

    <!-- Publish Popup -->
    <van-popup v-model:show="showPublishPopup" position="bottom" round safe-area-inset-bottom class="max-h-[90vh]">
      <div class="p-5 flex flex-col h-full overflow-y-auto">
        <div class="flex justify-between items-center mb-6 pb-3 border-b border-surface-variant/30">
          <h2 class="font-headline-sm text-lg font-bold text-on-surface">发布互助信息</h2>
          <button @click="showPublishPopup = false" class="text-on-surface-variant hover:text-on-surface p-1 rounded-full active:bg-surface-variant/20 transition-colors">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <form @submit.prevent="onSubmitPublish" class="flex flex-col gap-5">
          <!-- Store Display -->
          <div class="flex flex-col gap-1.5">
            <label class="font-label-md text-sm text-on-surface-variant px-1">关联门店</label>
            <div class="w-full bg-surface-container-lowest border border-surface-variant/50 rounded-xl p-4 flex items-center gap-2 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
              <span class="material-symbols-outlined text-primary">location_on</span>
              <span class="text-on-surface font-bold">{{ currentStoreName }}</span>
            </div>
          </div>

          <!-- Type Radio -->
          <div class="flex flex-col gap-2">
            <label class="font-label-md text-sm text-on-surface-variant px-1">互助类型</label>
            <div class="flex gap-3">
              <button 
                type="button" 
                @click="newCategory = '寻物问答'"
                class="flex-1 py-3 px-2 rounded-xl border flex items-center justify-center gap-1 transition-colors font-bold text-sm"
                :class="newCategory === '寻物问答' ? 'bg-primary text-white border-primary shadow-sm' : 'bg-surface-container-lowest border-surface-variant/50 text-on-surface-variant hover:border-primary/50'"
              >
                <span class="material-symbols-outlined text-[18px]">search</span> 寻物问答
              </button>
              <button 
                type="button" 
                @click="newCategory = '拼车互助'"
                class="flex-1 py-3 px-2 rounded-xl border flex items-center justify-center gap-1 transition-colors font-bold text-sm"
                :class="newCategory === '拼车互助' ? 'bg-[#10b981] text-white border-[#10b981] shadow-sm' : 'bg-surface-container-lowest border-surface-variant/50 text-on-surface-variant hover:border-[#10b981]/50'"
              >
                <span class="material-symbols-outlined text-[18px]">directions_car</span> 拼车互助
              </button>
            </div>
          </div>

          <!-- Title Input -->
          <div class="flex flex-col gap-1.5">
            <label class="font-label-md text-sm text-on-surface-variant px-1">互助标题 <span class="text-error">*</span></label>
            <input 
              v-model="newTitle"
              type="text"
              maxlength="40"
              required
              placeholder="核心问题 (如: 今天有大白菜特价么)"
              class="w-full bg-surface-container-lowest border border-surface-variant/50 rounded-xl p-4 text-on-surface font-body-md placeholder:text-on-surface-variant/50 shadow-[0_2px_8px_rgba(0,0,0,0.02)] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            />
          </div>

          <!-- Content Input -->
          <div class="flex flex-col gap-1.5">
            <div class="flex items-center justify-between px-1">
              <label class="font-label-md text-sm text-on-surface-variant">详细描述 <span class="text-error">*</span></label>
              <span class="text-xs text-on-surface-variant/70">{{ newContent.length }}/300</span>
            </div>
            <textarea 
              v-model="newContent"
              rows="5"
              maxlength="300"
              required
              placeholder="严禁带有商业引流链接，发布后实时对同店邻里展现。"
              class="w-full bg-surface-container-lowest border border-surface-variant/50 rounded-xl p-4 text-on-surface font-body-md placeholder:text-on-surface-variant/50 shadow-[0_2px_8px_rgba(0,0,0,0.02)] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors resize-none"
            ></textarea>
          </div>

          <!-- Image Uploader -->
          <div class="flex flex-col gap-1.5 bg-surface-container-lowest border border-surface-variant/50 rounded-xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
            <div class="flex items-center justify-between mb-2">
              <label class="font-label-md text-sm text-on-surface-variant">现场图片 (选填)</label>
              <span class="text-xs text-on-surface-variant">上限9张</span>
            </div>
            <van-uploader v-model="fileList" :after-read="afterRead" multiple :max-count="9" />
          </div>

          <!-- Submit Button -->
          <div class="mt-2 pt-2">
            <button 
              type="submit" 
              class="w-full bg-primary text-white py-3.5 rounded-full font-headline-sm text-base font-bold shadow-md active:scale-[0.98] transition-transform"
            >
              立刻发布上线
            </button>
          </div>
        </form>
      </div>
    </van-popup>
  </div>
</template>

<style scoped>
/* 优雅平滑的微动画效果 */
.animate-spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.line-clamp-1 {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;  
  overflow: hidden;
}

.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;  
  overflow: hidden;
}
</style>
