<script setup lang="ts">
// 模块：首页与公告动态
import { ref, onMounted, onUnmounted } from 'vue'
import { showImagePreview } from 'vant'
import { getNotices, getActivities, getStores } from '../api'
import { getCachedLocation, setCachedLocation, autoLocate, clearCachedLocation } from '../utils/location'
import { getThumbnailUrl } from '../utils/image'

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


const urgentNotices = ref<Notice[]>([])
const normalNotices = ref<Notice[]>([])
const activities = ref<Activity[]>([])
const currentStoreName = ref('')
const currentAreaName = ref('')
const closestStoreId = ref<number | null>(null)
const loading = ref(true)
const refreshing = ref(false)
const isError = ref(false)
const errorMsg = ref('')

const loadData = async () => {
  loading.value = true
  isError.value = false
  try {
    let loc = getCachedLocation()

    if (!loc) {
      try {
        loc = await autoLocate()
        setCachedLocation(loc)
      } catch (e) {
        console.warn('Initial autoLocate failed:', e)
      }
    }

    let userLat = loc?.lat
    let userLng = loc?.lng

    if (loc) {
      let area = `${loc.city || ''} ${loc.district || ''}`.trim()
      if (area.length > 5 && loc.city) {
        area = loc.city
      }
      currentAreaName.value = area
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
    noticesRes = noticesRes.map((n: Notice) => {
      if (n.storeId) {
        const s = storesRes.find((st: any) => st.id === n.storeId)
        if (s) n.storeName = s.name
      } else {
        n.storeName = '全门店'
      }
      return n
    })
    if (closestStoreId.value !== null) {
      noticesRes = noticesRes.filter((n: Notice) => !n.storeId || n.storeId === closestStoreId.value)
    } else {
      noticesRes = noticesRes.filter((n: Notice) => !n.storeId)
    }
    urgentNotices.value = noticesRes.filter((n: Notice) => n.isUrgent).map(parseImages)
    let normal = noticesRes.filter((n: Notice) => !n.isUrgent).map(parseImages)
    
    // 排序：全门店通用优先，其次是发布时间
    normal.sort((a: Notice, b: Notice) => {
      const aGlobal = !a.storeId
      const bGlobal = !b.storeId
      if (aGlobal && !bGlobal) return -1
      if (!aGlobal && bGlobal) return 1
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
    normalNotices.value = normal

    // 3. 加载热门活动（只查最近的3个门店及全局活动，防止爆满）
    const actParams = nearest3StoreIds.length > 0 ? { storeIds: nearest3StoreIds.join(',') } : undefined
    const actRes = await getActivities(actParams)
    let acts = actRes.map(parseImages)
    
    // 排序：全门店通用优先，其次是发布时间
    acts.sort((a: Activity, b: Activity) => {
      const aGlobal = a.isAllStores
      const bGlobal = b.isAllStores
      if (aGlobal && !bGlobal) return -1
      if (!aGlobal && bGlobal) return 1
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
    activities.value = acts
  } catch (e: any) {
    console.error('Failed to load notices/activities', e)
    isError.value = true
    errorMsg.value = e.message || '加载首页数据失败'
  } finally {
    loading.value = false
  }
}

const onRefresh = async () => {
  await loadData()
  refreshing.value = false
}

onMounted(() => {
  loadData()
  window.addEventListener('location-updated', loadData)
})

onUnmounted(() => {
  window.removeEventListener('location-updated', loadData)
})

const manualRefreshLocation = async () => {
  currentAreaName.value = '定位中...'
  loading.value = true
  clearCachedLocation()
  try {
    const loc = await autoLocate()
    setCachedLocation(loc)
    await loadData()
  } catch (e) {
    currentAreaName.value = '定位失败'
    loading.value = false
  }
}

const openAreaPopup = () => {
  window.dispatchEvent(new CustomEvent('open-area-popup'))
}

const showNoticeDialog = ref(false)
const currentNotice = ref<Notice | null>(null)

const showAllNotices = ref(false)
const showAllActivities = ref(false)

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
    <header class="docked full-width top-0 bg-surface shadow-sm z-50 flex items-center justify-between px-margin-mobile h-14 w-full relative">
      <!-- Left side: Location selector -->
      <div class="flex items-center gap-1 z-10">
        <div @click="openAreaPopup" class="flex items-center gap-1 text-[#FF7070] cursor-pointer active:scale-95 transition-transform duration-200">
          <i-material-symbols-location-on-outline class="text-[22px] text-[#FF7070] text-[10]px]"></i-material-symbols-location-on-outline>
          <span class="text-[18px] font-semibold max-w-[120px] truncate block">{{ currentAreaName || '定位中...' }}</span>
          <i-material-symbols-expand-more class="text-[22px]"></i-material-symbols-expand-more>
        </div>
      </div>
      
      <!-- Right side: Relocate button -->
      <div class="z-10 flex items-center">
        <i-material-symbols-my-location-outline @click="manualRefreshLocation"   title="重新定位" class="text-[#FF7070] text-[30px] cursor-pointer active:scale-95 bg-surface-container-low rounded-full p-1.5 hover:bg-primary-container hover:text-white transition-colors"></i-material-symbols-my-location-outline>
      </div>

      <!-- Center absolute title -->
      <h1 class="font-headline-sm text-headline-sm font-semibold text-[#EB4C4C] absolute left-1/2 -translate-x-1/2 w-full text-center pointer-events-none">
        大张助手
      </h1>
    </header>

    <!-- Main Content Canvas -->
    <main class="flex-1 overflow-y-auto hide-scrollbar pb-24 md:pb-8 md:pt-6 w-full max-w-7xl mx-auto md:px-margin-desktop">
      <van-pull-refresh v-model="refreshing" @refresh="onRefresh" class="min-h-full">
        <van-loading v-if="loading && !refreshing" class="mt-20 text-center block mx-auto" />
      
        <div v-else-if="isError && !refreshing" class="mt-20 text-center text-gray-400">
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
          <div class="rounded-xl overflow-hidden shadow-sm border border-surface-variant">
            <img src="../assets/image/Greeting.jpg" alt="Welcome to Mall Assistant" class="w-full h-auto block" />
          </div>
        </section>

        <!-- Quick Action Grid -->
        <section class="px-margin-mobile mt-4">
          <div class="grid grid-cols-4 md:grid-cols-8 gap-y-3 gap-x-xs">
            <div @click="$router.push('/customer/stores')" class="flex flex-col items-center gap-sm cursor-pointer group">
              <div class="w-14 h-14 rounded-full bg-background flex items-center justify-center text-primary group-hover:bg-primary-container group-hover:text-white transition-colors duration-200">
                <!-- Option 2: SVG Icon -->
                <i-material-symbols-storefront-outline style="font-size: 32px;" />
              </div>
              <span class="font-body-md text-body-lg font-medium text-on-surface-variant text-center whitespace-nowrap">门店查询</span>
            </div>
            <div @click="$router.push('/customer/checklist')" class="flex flex-col items-center gap-sm cursor-pointer group">
              <div class="w-14 h-14 rounded-full bg-background flex items-center justify-center text-primary group-hover:bg-primary-container group-hover:text-white transition-colors duration-200">
                <!-- Option 2: SVG Icon -->
                <i-material-symbols-shopping-bag-outline style="font-size: 32px;" />
              </div>
              <span class="font-body-md text-body-lg font-medium text-on-surface-variant text-center whitespace-nowrap">购物清单</span>
            </div>
            <div @click="$router.push('/customer/memos')" class="flex flex-col items-center gap-sm cursor-pointer group">
              <div class="w-14 h-14 rounded-full bg-background flex items-center justify-center text-primary group-hover:bg-primary-container group-hover:text-white transition-colors duration-200">
                <!-- Option 2: SVG Icon -->
                <i-material-symbols-edit-note-outline style="font-size: 32px;" />
              </div>
              <span class="font-body-md text-body-lg font-medium text-on-surface-variant text-center whitespace-nowrap">商品备忘</span>
            </div>
            <div @click="$router.push('/customer/feedback')" class="flex flex-col items-center gap-sm cursor-pointer group">
              <div class="w-14 h-14 rounded-full bg-background flex items-center justify-center text-primary group-hover:bg-primary-container group-hover:text-white transition-colors duration-200">
                <!-- Option 2: SVG Icon -->
                <i-material-symbols-warning-outline style="font-size: 32px;" />
              </div>
              <span class="font-body-md text-body-lg font-medium text-on-surface-variant text-center whitespace-nowrap">问题上报</span>
            </div>
            <div @click="$router.push('/customer/traffic')" class="flex flex-col items-center gap-sm cursor-pointer group">
              <div class="w-14 h-14 rounded-full bg-background flex items-center justify-center text-primary group-hover:bg-primary-container group-hover:text-white transition-colors duration-200">
                <!-- Option 2: SVG Icon -->
                <i-material-symbols-analytics-outline style="font-size: 32px;" />
              </div>
              <span class="font-body-md text-body-lg font-medium text-on-surface-variant text-center whitespace-nowrap">客流分析</span>
            </div>
            <div @click="$router.push('/customer/parking')" class="flex flex-col items-center gap-sm cursor-pointer group">
              <div class="w-14 h-14 rounded-full bg-background flex items-center justify-center text-primary group-hover:bg-primary-container group-hover:text-white transition-colors duration-200">
                <!-- Option 2: SVG Icon -->
                <i-material-symbols-local-parking style="font-size: 32px;" />
              </div>
              <span class="font-body-md text-body-lg font-medium text-on-surface-variant text-center whitespace-nowrap">停车计费</span>
            </div>
            <div @click="$router.push('/customer/mutual-help')" class="flex flex-col items-center gap-sm cursor-pointer group">
              <div class="w-14 h-14 rounded-full bg-background flex items-center justify-center text-primary group-hover:bg-primary-container group-hover:text-white transition-colors duration-200">
                <!-- Option 2: SVG Icon -->
                <i-material-symbols-diversity-3 style="font-size: 32px;" />
              </div>
              <span class="font-body-md text-body-lg font-medium text-on-surface-variant text-center whitespace-nowrap">同店互助</span>
            </div>
            <div @click="$router.push('/customer/jobs')" class="flex flex-col items-center gap-sm cursor-pointer group">
              <div class="w-14 h-14 rounded-full bg-background flex items-center justify-center text-primary group-hover:bg-primary-container group-hover:text-white transition-colors duration-200">
                <!-- Option 2: SVG Icon -->
                <i-material-symbols-handshake-outline style="font-size: 32px;" />
              </div>
              <span class="font-body-md text-body-lg font-medium text-on-surface-variant text-center whitespace-nowrap">加入我们</span>
            </div>
          </div>
        </section>

        <!-- 活动快讯 -->
        <section v-if="normalNotices.length > 0" class="px-margin-mobile mt-lg">
          <div class="flex justify-between items-center mb-md">
            <h3 class="font-headline-sm text-headline-sm text-on-background">活动快讯</h3>
            <span v-if="normalNotices.length > 2" @click="showAllNotices = true" class="font-label-md text-label-md text-red-400 cursor-pointer hover:underline">更多</span>
          </div>
          <div v-for="notice in normalNotices.slice(0, 2)" :key="notice.id" @click="openNotice(notice)" class="bg-surface-container-lowest rounded-xl p-md shadow-sm border border-surface-variant flex items-start gap-md cursor-pointer hover:bg-surface-container-low transition-colors mb-3">
            <div class="bg-error-container text-on-error-container p-2 rounded-lg flex-shrink-0">
              <i-material-symbols-campaign-outline></i-material-symbols-campaign-outline>
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
            <h3 class="font-headline-sm text-headline-sm text-on-background">热门活动</h3>
            <span v-if="activities.length > 2" @click="showAllActivities = true" class="font-label-md text-label-md text-red-500 cursor-pointer hover:underline">更多</span>
          </div>
          <div v-for="act in activities.slice(0, 2)" :key="act.id" @click="openActivityImages(act)" class="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm border border-surface-variant group cursor-pointer mb-4 relative">
            <div v-if="act.parsedImages && act.parsedImages.length > 0" class="h-40 w-full relative bg-surface-container">
              <img :src="getThumbnailUrl(act.parsedImages[0])" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
              <div class="absolute top-md right-md bg-tertiary-container/90 backdrop-blur text-on-tertiary-container px-3 py-1 rounded-full font-label-md text-label-md">
                  Hot
              </div>
            </div>
            <div class="p-md">
              <div class="flex justify-between items-start gap-2 mb-2">
                <h4 class="font-body-lg text-body-lg font-semibold text-on-surface line-clamp-2">{{ act.title }}</h4>
                <div v-if="!act.parsedImages || act.parsedImages.length === 0" class="bg-tertiary-container/90 text-on-tertiary-container px-3 py-1 rounded-full font-label-md text-label-md shrink-0">
                  Hot
                </div>
              </div>
              <div class="flex items-center gap-xs text-secondary font-body-md text-body-md mt-1">
                <i-material-symbols-location-on-outline  class="text-sm"></i-material-symbols-location-on-outline>
                <span>{{ (act.storeNames && act.storeNames.length > 0) ? act.storeNames.join('、') : '全局活动' }}</span>
              </div>
            </div>
          </div>
        </section>
        </template>
      </van-pull-refresh>
    </main>

    <!-- 活动快讯 全部列表弹窗 -->
    <van-popup v-model:show="showAllNotices" position="bottom" :style="{ height: '80%' }" round closeable>
      <div class="p-4 flex flex-col h-full bg-background rounded-t-xl">
        <h3 class="text-xl font-bold mb-4 mt-2 text-center">更多活动快讯</h3>
        <div class="flex-1 overflow-y-auto pb-8 hide-scrollbar">
          <div v-for="notice in normalNotices.slice(2)" :key="notice.id" @click="openNotice(notice)" class="bg-surface-container-lowest rounded-xl p-md shadow-sm border border-surface-variant flex items-start gap-md cursor-pointer hover:bg-surface-container-low transition-colors mb-3">
            <div class="bg-error-container text-on-error-container p-2 rounded-lg flex-shrink-0">
              <i-material-symbols-campaign-outline></i-material-symbols-campaign-outline>
            </div>
            <div class="flex-1">
              <h4 class="font-body-lg text-body-lg font-semibold text-on-surface mb-1 truncate">{{ notice.title }}</h4>
              <p class="font-body-md text-body-md text-secondary line-clamp-2">
                  {{ notice.content }}
              </p>
              <div class="mt-2 text-xs text-secondary flex items-center gap-1">
                <i-material-symbols-storefront-outline style="font-size: 14px;"></i-material-symbols-storefront-outline>
                {{ notice.storeName }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </van-popup>

    <!-- 热门活动 全部列表弹窗 -->
    <van-popup v-model:show="showAllActivities" position="bottom" :style="{ height: '80%' }" round closeable>
      <div class="p-4 flex flex-col h-full bg-background rounded-t-xl">
        <h3 class="text-xl font-bold mb-4 mt-2 text-center">更多热门活动</h3>
        <div class="flex-1 overflow-y-auto pb-8 hide-scrollbar">
          <div v-for="act in activities.slice(2)" :key="act.id" @click="openActivityImages(act)" class="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm border border-surface-variant group cursor-pointer mb-4 relative">
            <div v-if="act.parsedImages && act.parsedImages.length > 0" class="h-40 w-full relative bg-surface-container">
              <img :src="getThumbnailUrl(act.parsedImages[0])" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
              <div class="absolute top-md right-md bg-tertiary-container/90 backdrop-blur text-on-tertiary-container px-3 py-1 rounded-full font-label-md text-label-md">
                  Hot
              </div>
            </div>
            <div class="p-md">
              <div class="flex justify-between items-start gap-2 mb-2">
                <h4 class="font-body-lg text-body-lg font-semibold text-on-surface line-clamp-2">{{ act.title }}</h4>
                <div v-if="!act.parsedImages || act.parsedImages.length === 0" class="bg-tertiary-container/90 text-on-tertiary-container px-3 py-1 rounded-full font-label-md text-label-md shrink-0">
                  Hot
                </div>
              </div>
              <div class="flex items-center gap-xs text-secondary font-body-md text-body-md mt-1">
                <i-material-symbols-location-on-outline  class="text-sm"></i-material-symbols-location-on-outline>
                <span>{{ (act.storeNames && act.storeNames.length > 0) ? act.storeNames.join('、') : '全局活动' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </van-popup>

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

