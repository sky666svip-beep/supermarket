<script setup lang="ts">
// 模块：首页与公告动态
import { ref, onMounted, onUnmounted } from 'vue'
import { showImagePreview } from 'vant'
import { getNotices, getActivities, getStores } from '../api'
import { getCachedLocation, setCachedLocation } from '../utils/location'

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
  parsedImages?: string[]
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
  parsedImages?: string[]
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
const currentAreaName = ref('')
const closestStoreId = ref<number | null>(null)
const loading = ref(true)
const isError = ref(false)
const errorMsg = ref('')

const loadData = async () => {
  loading.value = true
  isError.value = false
  try {
    let loc = getCachedLocation()
    let userLat = loc?.lat
    let userLng = loc?.lng

    if (loc) {
      currentAreaName.value = `${loc.city || ''} ${loc.district || ''}`.trim()
    }

    if (!userLat || !userLng) {
      const coords = await tryBrowserGeolocation()
      if (coords) {
        userLat = coords.lat
        userLng = coords.lng
        setCachedLocation({ ...loc, lat: coords.lat, lng: coords.lng } as any)
      }
    }

    // 1. 获取所有门店并找出最近的门店（作为"当前"门店），以及距离最近的3家门店（用于加载活动）
    const storesRes = await getStores()
    let nearest3StoreIds: number[] = []

    if (userLat && userLng && storesRes.length > 0) {
      const storesWithDist = storesRes.map((s: any) => {
        if (s.latitude && s.longitude) {
          return {
            ...s,
            d: calculateDistance(userLat!, userLng!, parseFloat(String(s.latitude)), parseFloat(String(s.longitude)))
          }
        }
        return { ...s, d: Infinity }
      }).sort((a: any, b: any) => a.d - b.d)

      if (storesWithDist.length > 0 && storesWithDist[0].d !== Infinity) {
        closestStoreId.value = storesWithDist[0].id
        currentStoreName.value = storesWithDist[0].name
        nearest3StoreIds = storesWithDist.slice(0, 3).map((s: any) => s.id)
      }
    }

    const parseImages = (item: any) => {
      item.parsedImages = getImages(item.images)
      return item
    }

    // 2. 获取并过滤公告 (只显示当前门店及全局公告)
    let noticesRes = await getNotices()
    if (closestStoreId.value !== null) {
      noticesRes = noticesRes.filter((n: Notice) => !n.storeId || n.storeId === closestStoreId.value)
    }
    urgentNotices.value = noticesRes.filter((n: Notice) => n.isUrgent).map(parseImages)
    normalNotices.value = noticesRes.filter((n: Notice) => !n.isUrgent).map(parseImages)

    // 3. 加载热门活动（只查最近的3个门店及全局活动，防止爆满）
    const actParams = nearest3StoreIds.length > 0 ? { storeIds: nearest3StoreIds.join(',') } : undefined
    const actRes = await getActivities(actParams)
    activities.value = actRes.map(parseImages)
  } catch (e: any) {
    console.error('Failed to load notices/activities', e)
    isError.value = true
    errorMsg.value = e.message || '加载首页数据失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
  window.addEventListener('location-updated', loadData)
})

onUnmounted(() => {
  window.removeEventListener('location-updated', loadData)
})

const openAreaPopup = () => {
  window.dispatchEvent(new CustomEvent('open-area-popup'))
}

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
  const imgs = activity.parsedImages || []
  if (imgs.length > 0) {
    showImagePreview({
      images: imgs,
      startPosition: 0,
    })
  }
}
</script>

<template>
  <div class="bg-background text-on-background antialiased min-h-screen flex flex-col font-body-lg">
    <!-- TopAppBar -->
    <header class="docked full-width top-0 bg-surface shadow-sm z-50 flex items-center px-margin-mobile h-14 w-full relative">
      <div @click="openAreaPopup" class="flex items-center gap-1 text-primary cursor-pointer active:scale-95 transition-transform duration-200 z-10">
        <span class="material-symbols-outlined">location_on</span>
        <span class="font-body-md text-body-md font-semibold max-w-[120px] truncate block">{{ currentAreaName || '定位中...' }}</span>
        <span class="material-symbols-outlined text-sm">expand_more</span>
      </div>
      <h1 class="font-headline-sm text-headline-sm font-semibold text-primary absolute left-1/2 -translate-x-1/2 w-full text-center pointer-events-none">
        Mall Assistant
      </h1>
    </header>

    <!-- Main Content Canvas -->
    <main class="flex-1 overflow-y-auto hide-scrollbar pb-24 md:pb-8 md:pt-6 w-full max-w-7xl mx-auto md:px-margin-desktop">
      <van-loading v-if="loading" class="mt-20 text-center block mx-auto" />
    
      <div v-else-if="isError" class="mt-20 text-center text-gray-400">
        <van-empty description="加载失败" />
        <div class="text-xs text-red-400 mt-2 px-4">{{ errorMsg }}</div>
        <van-button size="small" type="primary" class="mt-4" @click="loadData">重试</van-button>
      </div>

      <template v-else>
        <!-- Urgent Notice -->
        <van-notice-bar
          v-if="urgentNotices && urgentNotices.length > 0"
          left-icon="volume-o"
          :text="urgentNotices.map((n) => (n.storeName ? `[${n.storeName}] ` : '') + n.title + ': ' + n.content).join('  |  ')"
          mode="link"
          @click="openNotice(urgentNotices[0])"
          class="mb-2 mx-4 mt-2"
        />

        <!-- Hero/Greeting Card -->
        <section class="px-margin-mobile mt-4 md:mt-0">
          <div class="bg-surface-container-lowest rounded-xl p-md shadow-sm border border-surface-variant relative overflow-hidden">
            <div class="relative z-10">
              <h2 class="font-headline-md text-headline-md text-primary mb-2">Welcome to Mall Assistant</h2>
              <p class="font-body-md text-body-md text-secondary">
                  Your comprehensive guide for Store Query, Shopping List, and Issue Reporting.
              </p>
            </div>
            <!-- Decorative background elements -->
            <div class="absolute -right-8 -top-8 w-32 h-32 bg-primary-container/20 rounded-full blur-2xl"></div>
            <div class="absolute -bottom-12 right-12 w-24 h-24 bg-tertiary-container/10 rounded-full blur-xl"></div>
          </div>
        </section>

        <!-- Quick Action Grid -->
        <section class="px-margin-mobile mt-lg">
          <div class="grid grid-cols-4 md:grid-cols-8 gap-y-lg gap-x-xs">
            <div @click="$router.push('/customer/stores')" class="flex flex-col items-center gap-sm cursor-pointer group">
              <div class="w-14 h-14 rounded-full bg-surface-container-low flex items-center justify-center text-primary group-hover:bg-primary-container group-hover:text-white transition-colors duration-200">
                <span class="material-symbols-outlined" style="font-size: 30px; font-variation-settings: 'wght' 200;">storefront</span>
              </div>
              <span class="font-body-md text-body-lg font-medium text-on-surface-variant text-center whitespace-nowrap">门店查询</span>
            </div>
            <div @click="$router.push('/customer/checklist')" class="flex flex-col items-center gap-sm cursor-pointer group">
              <div class="w-14 h-14 rounded-full bg-surface-container-low flex items-center justify-center text-primary group-hover:bg-primary-container group-hover:text-white transition-colors duration-200">
                <span class="material-symbols-outlined" style="font-size: 30px; font-variation-settings: 'wght' 200;">shopping_bag</span>
              </div>
              <span class="font-body-md text-body-lg font-medium text-on-surface-variant text-center whitespace-nowrap">购物清单</span>
            </div>
            <div @click="$router.push('/customer/memos')" class="flex flex-col items-center gap-sm cursor-pointer group">
              <div class="w-14 h-14 rounded-full bg-surface-container-low flex items-center justify-center text-primary group-hover:bg-primary-container group-hover:text-white transition-colors duration-200">
                <span class="material-symbols-outlined" style="font-size: 30px; font-variation-settings: 'wght' 200;">edit_note</span>
              </div>
              <span class="font-body-md text-body-lg font-medium text-on-surface-variant text-center whitespace-nowrap">商品备忘</span>
            </div>
            <div @click="$router.push('/customer/feedback')" class="flex flex-col items-center gap-sm cursor-pointer group">
              <div class="w-14 h-14 rounded-full bg-surface-container-low flex items-center justify-center text-primary group-hover:bg-primary-container group-hover:text-white transition-colors duration-200">
                <span class="material-symbols-outlined" style="font-size: 30px; font-variation-settings: 'wght' 200;">report_problem</span>
              </div>
              <span class="font-body-md text-body-lg font-medium text-on-surface-variant text-center whitespace-nowrap">问题上报</span>
            </div>
            <div @click="$router.push('/customer/traffic')" class="flex flex-col items-center gap-sm cursor-pointer group">
              <div class="w-14 h-14 rounded-full bg-surface-container-low flex items-center justify-center text-primary group-hover:bg-primary-container group-hover:text-white transition-colors duration-200">
                <span class="material-symbols-outlined" style="font-size: 30px; font-variation-settings: 'wght' 200;">analytics</span>
              </div>
              <span class="font-body-md text-body-lg font-medium text-on-surface-variant text-center whitespace-nowrap">客流分析</span>
            </div>
            <div @click="$router.push('/customer/parking')" class="flex flex-col items-center gap-sm cursor-pointer group">
              <div class="w-14 h-14 rounded-full bg-surface-container-low flex items-center justify-center text-primary group-hover:bg-primary-container group-hover:text-white transition-colors duration-200">
                <span class="material-symbols-outlined" style="font-size: 30px; font-variation-settings: 'wght' 200;">local_parking</span>
              </div>
              <span class="font-body-md text-body-lg font-medium text-on-surface-variant text-center whitespace-nowrap">停车计费</span>
            </div>
            <div @click="$router.push('/customer/mutual-help')" class="flex flex-col items-center gap-sm cursor-pointer group">
              <div class="w-14 h-14 rounded-full bg-surface-container-low flex items-center justify-center text-primary group-hover:bg-primary-container group-hover:text-white transition-colors duration-200">
                <span class="material-symbols-outlined" style="font-size: 30px; font-variation-settings: 'wght' 200;">diversity_3</span>
              </div>
              <span class="font-body-md text-body-lg font-medium text-on-surface-variant text-center whitespace-nowrap">同店互助</span>
            </div>
            <div @click="$router.push('/customer/jobs')" class="flex flex-col items-center gap-sm cursor-pointer group">
              <div class="w-14 h-14 rounded-full bg-surface-container-low flex items-center justify-center text-primary group-hover:bg-primary-container group-hover:text-white transition-colors duration-200">
                <span class="material-symbols-outlined" style="font-size: 30px; font-variation-settings: 'wght' 200;">handshake</span>
              </div>
              <span class="font-body-md text-body-lg font-medium text-on-surface-variant text-center whitespace-nowrap">加入我们</span>
            </div>
          </div>
        </section>

        <!-- Latest News -->
        <section v-if="normalNotices.length > 0" class="px-margin-mobile mt-lg">
          <div class="flex justify-between items-center mb-md">
            <h3 class="font-headline-sm text-headline-sm text-on-background">Latest News</h3>
            <span class="font-label-md text-label-md text-primary cursor-pointer hover:underline">View All</span>
          </div>
          <div v-for="notice in normalNotices.slice(0, 3)" :key="notice.id" @click="openNotice(notice)" class="bg-surface-container-lowest rounded-xl p-md shadow-sm border border-surface-variant flex items-start gap-md cursor-pointer hover:bg-surface-container-low transition-colors mb-3">
            <div class="bg-error-container text-on-error-container p-2 rounded-lg flex-shrink-0">
              <span class="material-symbols-outlined">campaign</span>
            </div>
            <div class="flex-1">
              <h4 class="font-body-lg text-body-lg font-semibold text-on-surface mb-1 truncate">{{ notice.title }}</h4>
              <p class="font-body-md text-body-md text-secondary line-clamp-2">
                  {{ notice.content }}
              </p>
            </div>
          </div>
        </section>

        <!-- Hot Activities -->
        <section v-if="activities.length > 0" class="px-margin-mobile mt-lg">
          <div class="flex justify-between items-center mb-md">
            <h3 class="font-headline-sm text-headline-sm text-on-background">Hot Activities</h3>
            <span class="font-label-md text-label-md text-primary cursor-pointer hover:underline">View All</span>
          </div>
          <div v-for="act in activities" :key="act.id" @click="openActivityImages(act)" class="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm border border-surface-variant group cursor-pointer mb-4">
            <div class="h-40 w-full relative bg-surface-container">
              <img v-if="act.parsedImages && act.parsedImages.length > 0" :src="act.parsedImages[0]" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
              <div v-else class="w-full h-full flex flex-col items-center justify-center text-gray-400">
                <span class="material-symbols-outlined text-4xl mb-2">image</span>
                <span class="text-sm">暂无图片</span>
              </div>
              <div class="absolute top-md right-md bg-tertiary-container/90 backdrop-blur text-on-tertiary-container px-3 py-1 rounded-full font-label-md text-label-md">
                  Hot
              </div>
            </div>
            <div class="p-md">
              <h4 class="font-body-lg text-body-lg font-semibold text-on-surface mb-2">{{ act.title }}</h4>
              <div class="flex items-center gap-xs text-secondary font-body-md text-body-md">
                <span class="material-symbols-outlined text-sm">location_on</span>
                <span>{{ (act.storeNames && act.storeNames.length > 0) ? act.storeNames.join('、') : '全局活动' }}</span>
              </div>
            </div>
          </div>
        </section>
      </template>
    </main>

    <!-- 公告详情弹窗 -->
    <van-dialog v-model:show="showNoticeDialog" :title="currentNotice?.title" confirm-button-text="知道了">
      <div class="p-4 max-h-[60vh] overflow-y-auto">
        <p class="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{{ currentNotice?.content }}</p>
        <div v-if="currentNotice && currentNotice.parsedImages && currentNotice.parsedImages.length > 0" class="mt-4 space-y-2">
          <img 
            v-for="(img, idx) in currentNotice.parsedImages" 
            :key="idx" 
            :src="img" 
            loading="lazy"
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

