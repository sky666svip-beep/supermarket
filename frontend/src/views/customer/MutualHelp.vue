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
  <div class="mutual-help-container min-h-screen bg-gray-50 pb-20">
    <!-- 顶部导航，提供当前绑定门店切换入口 -->
    <van-nav-bar left-arrow @click-left="router.push('/')" fixed placeholder>
      <template #title>
        <div class="flex items-center justify-center font-bold text-gray-800 text-sm">
          <span>同店互助广场</span>
        </div>
      </template>
      <template #right>
        <div @click="showStorePicker = true" class="flex items-center text-blue-500 font-medium text-xs bg-blue-50 px-2 py-1 rounded-full cursor-pointer max-w-[120px]">
          <van-icon name="location-o" class="mr-0.5" />
          <span class="truncate">{{ currentStoreName }}</span>
          <van-icon name="arrow-down" class="ml-0.5 text-[8px]" />
        </div>
      </template>
    </van-nav-bar>

    <!-- 分类标签导航，无缝切换不同互助类型 -->
    <van-tabs v-model:active="activeTab" sticky offset-top="46" color="#3b82f6" title-active-color="#3b82f6" class="shadow-sm">
      <van-tab title="全部" name="全部"></van-tab>
      <van-tab title="🔍 寻物问答" name="寻物问答"></van-tab>
      <van-tab title="🚗 拼车互助" name="拼车互助"></van-tab>
    </van-tabs>

    <!-- 骨架屏 / 加载指示器 -->
    <div v-if="loading" class="flex justify-center items-center py-20">
      <van-loading type="spinner" color="#3b82f6" vertical>加载中...</van-loading>
    </div>

    <!-- 空状态展示 -->
    <div v-else-if="posts.length === 0" class="py-12 text-center">
      <van-empty image="search" description="该门店目前暂无互助信息" />
      <van-button 
        type="primary" 
        size="small" 
        round 
        class="mt-4 bg-gradient-to-r from-blue-500 to-indigo-600 border-0 shadow-sm"
        @click="handleOpenPublish"
      >
        成为第一个发布的人
      </van-button>
    </div>

    <!-- 互助信息流主体 -->
    <div v-else class="p-4 space-y-4">
      <div 
        v-for="post in posts" 
        :key="post.id"
        class="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:border-blue-100 active:bg-gray-50 transition-all cursor-pointer"
        @click="router.push(`/community/post/${post.id}`)"
      >
        <!-- 头部作者信息及类别标签 -->
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center">
            <van-image 
              round 
              width="36" 
              height="36" 
              :src="post.author.avatar || 'https://fastly.jsdelivr.net/npm/@vant/assets/cat.jpeg'" 
              class="border border-gray-100 shadow-inner"
            />
            <div class="ml-3">
              <div class="text-sm font-bold text-gray-800">{{ post.author.nickname || post.author.username }}</div>
              <div class="text-[10px] text-gray-400 mt-0.5">{{ formatTime(post.createdAt) }}</div>
            </div>
          </div>
          <!-- 标签徽章 -->
          <van-tag 
            :type="post.category === '寻物问答' ? 'primary' : 'success'" 
            plain 
            round
            class="text-[10px] px-2 py-0.5 font-medium"
          >
            {{ post.category }}
          </van-tag>
        </div>

        <!-- 互助标题与内容主体 -->
        <h2 class="text-base font-bold text-gray-900 mb-2 leading-snug line-clamp-1">
          {{ post.title }}
        </h2>
        <p class="text-sm text-gray-600 mb-3 leading-relaxed line-clamp-3 whitespace-pre-wrap">
          {{ post.content }}
        </p>

        <!-- 缩略图网格，支持点击大图预览 -->
        <div 
          v-if="parseImages(post.images).length > 0" 
          class="grid gap-2 mb-3 max-w-sm"
          :class="parseImages(post.images).length === 1 ? 'grid-cols-1' : parseImages(post.images).length === 2 ? 'grid-cols-2' : 'grid-cols-3'"
          @click.stop
        >
          <van-image 
            v-for="(img, idx) in parseImages(post.images).slice(0, 3)" 
            :key="idx"
            :src="img.startsWith('/uploads') ? '/api' + img : img" 
            height="85"
            fit="cover"
            radius="8"
            class="shadow-sm border border-gray-50"
            @click="previewImage(parseImages(post.images), Number(idx))"
          />
        </div>

        <!-- 底部数据指标面板，点击整张卡片跳转详情后可深度互动 -->
        <div class="flex items-center justify-between text-xs text-gray-400 border-t border-gray-50 pt-3 mt-1">
          <div class="flex items-center gap-4">
            <span class="flex items-center gap-1">
              <van-icon name="eye-o" />
              {{ post.viewCount || 0 }} 阅读
            </span>
            <span class="flex items-center gap-1">
              <van-icon name="chat-o" />
              {{ post.commentCount || 0 }} 评论
            </span>
          </div>
          <span class="flex items-center gap-1 text-blue-500 font-medium">
            <van-icon name="good-job-o" />
            {{ post.likeCount || 0 }} 觉得有用
          </span>
        </div>
      </div>
    </div>

    <!-- 底部悬浮发布按钮 FAB -->
    <div 
      class="fixed bottom-20 right-6 w-14 h-14 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 shadow-lg flex items-center justify-center text-white active:scale-95 transition-transform z-40 cursor-pointer"
      @click="handleOpenPublish"
    >
      <van-icon name="edit" size="24" />
    </div>

    <!-- 门店强制切换/选择器 Popup -->
    <van-popup v-model:show="showStorePicker" position="bottom" round safe-area-inset-bottom>
      <van-picker
        :columns="storeOptions"
        @confirm="onStoreConfirm"
        @cancel="showStorePicker = false"
        show-toolbar
        title="选择关联门店"
      />
    </van-popup>



    <!-- 发帖 Popup 对话框 -->
    <van-popup 
      v-model:show="showPublishPopup" 
      position="bottom" 
      round 
      safe-area-inset-bottom 
      class="max-h-[85%]"
    >
      <div class="publish-form p-4">
        <!-- 弹窗页眉 -->
        <div class="flex justify-between items-center mb-4 border-b border-gray-50 pb-3">
          <span class="text-lg font-bold text-gray-900">发布同店互助信息</span>
          <van-icon name="cross" size="20" class="text-gray-400" @click="showPublishPopup = false" />
        </div>

        <van-form @submit="onSubmitPublish">
          <!-- 强锁当前门店 -->
          <van-field
            :model-value="currentStoreName"
            label="关联门店"
            readonly
            left-icon="location-o"
            class="bg-gray-50 rounded-xl mb-4 font-bold text-gray-700"
          />

          <!-- 互助品类单选 -->
          <div class="mb-4 bg-gray-50 p-3 rounded-xl">
            <span class="text-xs text-gray-400 block mb-2 font-medium">请选择互助类型</span>
            <van-radio-group v-model="newCategory" direction="horizontal" class="flex gap-4">
              <van-radio name="寻物问答" checked-color="#3b82f6">🔍 寻物问答</van-radio>
              <van-radio name="拼车互助" checked-color="#10b981">🚗 拼车互助</van-radio>
            </van-radio-group>
          </div>

          <!-- 标题输入，包含前端拦截提示 -->
          <van-field
            v-model="newTitle"
            name="title"
            label="互助标题"
            placeholder="写下你要互助的核心问题（如：金谷园店今天有大白菜特价么）"
            maxlength="40"
            required
            :rules="[{ required: true, message: '请填写简洁的互助标题' }]"
            class="border border-gray-100 rounded-xl mb-4"
          />

          <!-- 正文输入 -->
          <van-field
            v-model="newContent"
            rows="5"
            autosize
            label="详细描述"
            type="textarea"
            maxlength="300"
            placeholder="详细叙述你的需求或发布你的拼车同行方案。严禁带有商业引流链接，发布后实时对同店邻里展现。"
            show-word-limit
            required
            :rules="[{ required: true, message: '请填写具体的详细描述' }]"
            class="border border-gray-100 rounded-xl mb-4"
          />

          <!-- 多图上传 (可选) -->
          <div class="mb-4">
            <span class="text-xs text-gray-400 block mb-2 font-medium">添加现场图片 (可选，上限 9 张)</span>
            <van-uploader 
              v-model="fileList" 
              :after-read="afterRead" 
              multiple 
              :max-count="9"
              class="block"
            />
          </div>

          <!-- 提交按钮 -->
          <div class="mt-6">
            <van-button 
              round 
              block 
              type="primary" 
              native-type="submit" 
              class="bg-gradient-to-r from-blue-500 to-indigo-600 shadow-md border-0 text-white font-bold h-11"
            >
              立刻发布上线
            </van-button>
          </div>
        </van-form>
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
