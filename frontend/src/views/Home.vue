<script setup lang="ts">
// 模块：首页与公告动态
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showImagePreview } from 'vant'
import { getNotices, getActivities } from '../api'
import { getCachedLocation, setCachedLocation } from '../utils/location'

const router = useRouter()

export interface Notice {
  id: number
  title: string
  content: string
  images: string | null
  isUrgent: boolean
  expiresAt: string | null
  createdAt: string
  storeId?: number
  latitude?: string | number
  longitude?: string | number
  storeName?: string
}

export interface Activity {
  id: number
  title: string
  content: string
  images: string | null
  startTime: string | null
  endTime: string | null
  isAllStores: boolean
  isActive: boolean
  createdAt: string
  storeNames?: string[]
}

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

const urgentNotices = ref<Notice[]>([])
const normalNotices = ref<Notice[]>([])
const activities = ref<Activity[]>([])
const currentStoreName = ref('')
const closestStoreId = ref<number | null>(null)

onMounted(async () => {
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

    let res = await getNotices()
    
    // 找出最近的店铺
    if (userLat && userLng && res.length > 0) {
      let minDistance = Infinity
      
      for (const n of res) {
        if (n.storeId && n.latitude && n.longitude) {
          const d = calculateDistance(userLat, userLng, parseFloat(String(n.latitude)), parseFloat(String(n.longitude)))
          if (d < minDistance) {
            minDistance = d
            closestStoreId.value = n.storeId || null
            currentStoreName.value = n.storeName || ''
          }
        }
      }
      
      if (closestStoreId.value !== null) {
        // 只保留最近店铺的公告
        res = res.filter((n: Notice) => n.storeId === closestStoreId.value)
      }
    }

    urgentNotices.value = res.filter((n: Notice) => n.isUrgent)
    normalNotices.value = res.filter((n: Notice) => !n.isUrgent)

    // Load activities
    const actRes = await getActivities(closestStoreId.value ? { storeId: closestStoreId.value } : undefined)
    activities.value = actRes
  } catch (e) {
    console.error('Failed to load notices/activities', e)
  }
})

const showNoticeDialog = ref(false)
const currentNotice = ref<Notice | null>(null)

const openNotice = (notice: Notice) => {
  currentNotice.value = notice
  showNoticeDialog.value = true
}

const getImages = (imagesStr: string | null) => {
  if (!imagesStr) return []
  try { return JSON.parse(imagesStr) } catch { return [] }
}

const openActivityImages = (activity: Activity) => {
  const imgs = getImages(activity.images)
  if (imgs.length > 0) {
    showImagePreview({
      images: imgs,
      startPosition: 0,
    })
  }
}
</script>

<template>
  <div class="space-y-4 pb-4">
    <!-- 紧急横幅通知 -->
    <van-notice-bar
      v-if="urgentNotices && urgentNotices.length > 0"
      left-icon="volume-o"
      :text="urgentNotices.map((n) => (n.storeName ? `[${n.storeName}] ` : '') + n.title + ': ' + n.content).join('  |  ')"
      mode="link"
      @click="openNotice(urgentNotices[0])"
      class="mb-2"
    />

    <div class="bg-white p-4 rounded-lg shadow-sm" :class="{ 'mt-2': urgentNotices && urgentNotices.length > 0 }">
      <h2 class="text-lg font-bold mb-2">欢迎来到商场助手</h2>
      <p class="text-gray-500 text-sm">提供门店查询、购物清单和问题上报功能。</p>
    </div>
    
    <van-grid :column-num="4" :border="false" class="bg-white rounded-lg overflow-hidden shadow-sm">
      <van-grid-item icon="shop-o" text="门店查询" @click="router.push('/customer/stores')" />
      <van-grid-item icon="orders-o" text="购物清单" @click="router.push('/customer/checklist')" />
      <van-grid-item icon="goods-collect-o" text="商品备忘" @click="router.push('/customer/memos')" />
      <van-grid-item icon="warning-o" text="问题上报" @click="router.push('/customer/feedback')" />
      <van-grid-item icon="friends-o" text="客流分析" @click="router.push('/customer/traffic')" />
      <van-grid-item icon="logistics" text="停车计费" @click="router.push('/customer/parking')" />
    </van-grid>

    <!-- 最新动态 (普通公告) -->
    <van-cell-group inset class="!mx-0 !mt-6" v-if="normalNotices.length > 0">
      <template #title>
        <div class="flex justify-between items-center">
          <span>最新动态</span>
          <span v-if="currentStoreName" class="text-xs text-blue-500 font-normal">
            📍 当前: {{ currentStoreName }}
          </span>
        </div>
      </template>
      <van-cell 
        v-for="notice in normalNotices" 
        :key="notice.id"
        :title="notice.title" 
        :label="notice.content.substring(0, 30) + (notice.content.length > 30 ? '...' : '')" 
        is-link 
        @click="openNotice(notice)"
      />
    </van-cell-group>
    
    <!-- 热门活动 -->
    <van-cell-group inset class="!mx-0 !mt-6" v-if="activities.length > 0">
      <template #title>
        <div class="flex justify-between items-center">
          <span>热门活动</span>
          <span v-if="currentStoreName" class="text-xs text-blue-500 font-normal">
            📍 当前: {{ currentStoreName }}
          </span>
        </div>
      </template>
      <div 
        v-for="act in activities" 
        :key="act.id"
        class="bg-white p-4 border-b border-gray-100 last:border-0"
      >
        <h3 class="text-base font-bold mb-1 flex items-center justify-between">
          <span>{{ act.title }}</span>
          <span v-if="act.storeNames && act.storeNames.length > 0" class="text-xs text-blue-500 font-normal bg-blue-50 px-2 py-0.5 rounded ml-2 whitespace-nowrap overflow-hidden text-ellipsis max-w-[50%]">
            📍 {{ act.storeNames.join('、') }}
          </span>
        </h3>
        <p class="text-gray-500 text-sm mb-3 whitespace-pre-wrap">{{ act.content }}</p>
        
        <div 
          class="relative w-full h-40 bg-gray-50 rounded-lg overflow-hidden flex items-center justify-center cursor-pointer"
          @click="openActivityImages(act)"
        >
          <template v-if="getImages(act.images).length > 0">
            <van-image
              lazy-load
              fit="cover"
              class="w-full h-full"
              :src="getImages(act.images)[0]"
            />
            <div class="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">
              共 {{ getImages(act.images).length }} 张
            </div>
          </template>
          <template v-else>
            <van-icon name="photo-o" size="32" color="#dcdee0" />
            <span class="text-gray-400 text-sm ml-2">暂无图片</span>
          </template>
        </div>
      </div>
    </van-cell-group>

    <!-- 公告详情弹窗 -->
    <van-dialog v-model:show="showNoticeDialog" :title="currentNotice?.title" confirm-button-text="知道了">
      <div class="p-4 max-h-[60vh] overflow-y-auto">
        <p class="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{{ currentNotice?.content }}</p>
        <div v-if="currentNotice && getImages(currentNotice.images).length > 0" class="mt-4 space-y-2">
          <img 
            v-for="(img, idx) in getImages(currentNotice.images)" 
            :key="idx" 
            :src="img" 
            class="w-full rounded-md object-cover"
          />
        </div>
        <div class="mt-4 text-xs text-gray-400 text-right">
          发布时间: {{ currentNotice ? new Date(currentNotice.createdAt).toLocaleDateString() : '' }}
        </div>
      </div>
    </van-dialog>
  </div>
</template>

