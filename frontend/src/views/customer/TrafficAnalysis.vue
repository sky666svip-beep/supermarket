<!-- 模块：客流分析 -->
<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showLoadingToast } from 'vant'
import { getStores, getStoreTraffic, submitStoreTraffic } from '../../api/index'
import { autoLocate, getCachedLocation, setCachedLocation } from '../../utils/location'

// Floors from -3 to 8
const floors = Array.from({ length: 12 }, (_, i) => i - 3)

const router = useRouter()
const stores = ref<any[]>([])
const closestStoreIds = ref<number[]>([]) // Store the IDs of the 3 closest stores
const currentStoreId = ref<number | null>(null)
const currentFloor = ref<number>(1)
const locating = ref(true)

const trafficData = ref<any[]>([])
const lastUpdatedAt = ref<string | null>(null)
const totalSubmissions = ref<number>(0)
const loadingTraffic = ref(false)
const refreshing = ref(false)

const onRefresh = async () => {
  await getTraffic()
  refreshing.value = false
}

const loadStores = async () => {
  try {
    const res = await getStores()
    stores.value = res || []
  } catch (e) {
    showToast('获取门店失败')
  }
}

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

const getTraffic = async () => {
  if (!currentStoreId.value) return
  loadingTraffic.value = true
  try {
    const res = await getStoreTraffic(currentStoreId.value)
    trafficData.value = res.aggregated || []
    lastUpdatedAt.value = res.lastUpdatedAt
    totalSubmissions.value = res.totalSubmissions
  } catch (e) {
    console.error(e)
  } finally {
    loadingTraffic.value = false
  }
}

onMounted(async () => {
  const toast = showLoadingToast({
    message: '正在定位...',
    forbidClick: true,
    duration: 0
  })
  
  await loadStores()

  try {
    let loc = getCachedLocation()
    if (!loc || !loc.lat || !loc.lng) {
      loc = await autoLocate()
      if(loc) {
        setCachedLocation(loc)
      } else {
        showToast('定位获取失败，已为您展示默认门店')
      }
    }

    if (loc && loc.lat && loc.lng && stores.value.length > 0) {
      // Calculate distances for all stores
      const storesWithDistance = stores.value.map(s => {
        let distance = Infinity
        if (s.latitude && s.longitude) {
          distance = calculateDistance(loc.lat!, loc.lng!, parseFloat(String(s.latitude)), parseFloat(String(s.longitude)))
        }
        return { ...s, distance }
      })

      // Sort by distance and get top 3
      storesWithDistance.sort((a, b) => a.distance - b.distance)
      const top3 = storesWithDistance.slice(0, 3)
      closestStoreIds.value = top3.map(s => s.id)

      if (top3.length > 0) {
        currentStoreId.value = top3[0].id
      }
    }
  } catch (e) {
    showToast('定位失败，请手动选择门店')
  } finally {
    toast.close()
    locating.value = false
    
    // 如果没有最近的，默认选前三个
    if (!currentStoreId.value && stores.value.length > 0) {
      closestStoreIds.value = stores.value.slice(0, 3).map(s => s.id)
      currentStoreId.value = stores.value[0].id
    }
    
    if (currentStoreId.value) {
      getTraffic()
    }
  }
})

watch([currentStoreId], () => {
  getTraffic()
})

const currentFloorTraffic = computed(() => {
  const floorData = trafficData.value.find(t => t.floor === currentFloor.value)
  return floorData ? floorData.level : 0
})

const levelInfo = computed(() => {
  const level = currentFloorTraffic.value
  switch (level) {
    case 1: return { text: '空闲', color: 'text-green-600', bg: 'bg-green-100', icon: 'smile-o' }
    case 2: return { text: '适中', color: 'text-yellow-600', bg: 'bg-yellow-100', icon: 'friends-o' }
    case 3: return { text: '拥挤', color: 'text-orange-600', bg: 'bg-orange-100', icon: 'hot-o' }
    case 4: return { text: '爆满', color: 'text-red-600', bg: 'bg-red-100', icon: 'fire-o' }
    default: return { text: '暂无数据', color: 'text-gray-400', bg: 'bg-gray-50', icon: 'question-o' }
  }
})

const submitLevel = async (level: number) => {
  if (!currentStoreId.value) {
    showToast('请先选择门店')
    return
  }
  const user = localStorage.getItem('user')
  if (!user) {
    showToast('请先登录后使用此功能')
    router.push('/login')
    return
  }
  
  const toast = showLoadingToast({ message: '提交中...', forbidClick: true, duration: 0 })
  try {
    await submitStoreTraffic(currentStoreId.value, currentFloor.value, level)
    toast.close()
    showToast('提交成功，感谢您的反馈！')
    getTraffic()
  } catch (e: any) {
    toast.close()
    if (e.response && e.response.data && e.response.data.error) {
      showToast({ message: e.response.data.error, duration: 1000 })
    } else {
      showToast({ message: '提交失败', duration: 1000 })
    }
  }
}

// 供选择器使用的结构
const storeOptions = computed(() => {
  // Filter only the closest 3 stores
  const closestStores = stores.value.filter(s => closestStoreIds.value.includes(s.id))
  // If location failed entirely and closestStoreIds is empty, just fallback to all or top 3
  const displayStores = closestStores.length > 0 ? closestStores : stores.value.slice(0, 3)
  return displayStores.map(s => ({ text: s.name, value: s.id }))
})
const floorOptions = computed(() => floors.map(f => ({ text: f < 0 ? `B${Math.abs(f)}` : `${f}F`, value: f })))

const showStorePicker = ref(false)
const onStoreConfirm = ({ selectedOptions }: any) => {
  currentStoreId.value = selectedOptions[0].value
  showStorePicker.value = false
}

const showFloorPicker = ref(false)
const onFloorConfirm = ({ selectedOptions }: any) => {
  currentFloor.value = selectedOptions[0].value
  showFloorPicker.value = false
}

const formatTime = (timeStr: string | null) => {
  if (!timeStr) return '-'
  const d = new Date(timeStr)
  return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0')
}

const currentStoreName = computed(() => {
  return stores.value.find(s => s.id === currentStoreId.value)?.name || '请选择门店'
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 pb-20">
    <van-nav-bar title="客流量分析" left-arrow @click-left="router.back()" fixed placeholder />

    <van-pull-refresh v-model="refreshing" @refresh="onRefresh" class="min-h-[calc(100vh-46px)]">
    <div class="p-4 space-y-4">
      <!-- 选择区域 -->
      <div class="bg-white rounded-xl shadow-sm p-2 flex flex-col gap-2">
        <van-cell title="当前门店" is-link @click="showStorePicker = true">
          <template #value>
            <span class="text-gray-800 font-medium">{{ currentStoreName }}</span>
          </template>
        </van-cell>
        <van-cell title="选择楼层" is-link @click="showFloorPicker = true">
          <template #value>
            <span class="text-gray-800 font-medium">{{ currentFloor < 0 ? `B${Math.abs(currentFloor)}` : `${currentFloor}F` }}</span>
          </template>
        </van-cell>
      </div>

      <!-- 客流状态展示 -->
      <div class="bg-white rounded-xl shadow-sm p-6 text-center">
        <div class="mb-4">
          <h2 class="text-lg font-bold text-gray-700">实时客流指数</h2>
          <p class="text-xs text-gray-400 mt-1">数据来自周边用户 1 小时内反馈</p>
        </div>
        
        <div 
          class="w-40 h-40 mx-auto rounded-full flex flex-col items-center justify-center transition-colors duration-300 shadow-inner"
          :class="levelInfo.bg"
        >
          <van-icon :name="levelInfo.icon" :class="levelInfo.color" size="48" class="mb-2" />
          <span class="text-3xl font-extrabold" :class="levelInfo.color">{{ levelInfo.text }}</span>
        </div>

        <div class="mt-6 flex justify-around text-sm text-gray-500">
          <div class="flex flex-col items-center">
            <span class="font-semibold text-gray-700">{{ totalSubmissions }} 人</span>
            <span class="text-xs">近期提交</span>
          </div>
          <div class="w-px h-8 bg-gray-200"></div>
          <div class="flex flex-col items-center">
            <span class="font-semibold text-gray-700">{{ formatTime(lastUpdatedAt) }}</span>
            <span class="text-xs">最新更新</span>
          </div>
        </div>
      </div>

      <!-- 提交反馈 -->
      <div class="bg-white rounded-xl shadow-sm p-5">
        <h3 class="text-base font-bold text-gray-800 mb-4 flex items-center before:w-1 before:h-4 before:bg-blue-500 before:mr-2 before:rounded-full">
          分享您看到的客流情况
        </h3>
        
        <div class="grid grid-cols-2 gap-3">
          <button 
            @click="submitLevel(1)"
            class="py-3 px-2 rounded-lg bg-green-50 text-green-700 font-medium border border-transparent hover:border-green-200 active:bg-green-100 transition-colors flex items-center justify-center gap-1"
          >
            <van-icon name="smile-o" size="18" /> 空闲畅通
          </button>
          <button 
            @click="submitLevel(2)"
            class="py-3 px-2 rounded-lg bg-yellow-50 text-yellow-700 font-medium border border-transparent hover:border-yellow-200 active:bg-yellow-100 transition-colors flex items-center justify-center gap-1"
          >
            <van-icon name="friends-o" size="18" /> 人流适中
          </button>
          <button 
            @click="submitLevel(3)"
            class="py-3 px-2 rounded-lg bg-orange-50 text-orange-700 font-medium border border-transparent hover:border-orange-200 active:bg-orange-100 transition-colors flex items-center justify-center gap-1"
          >
            <van-icon name="hot-o" size="18" /> 比较拥挤
          </button>
          <button 
            @click="submitLevel(4)"
            class="py-3 px-2 rounded-lg bg-red-50 text-red-700 font-medium border border-transparent hover:border-red-200 active:bg-red-100 transition-colors flex items-center justify-center gap-1"
          >
            <van-icon name="fire-o" size="18" /> 爆满排队
          </button>
        </div>
        
        <p class="text-xs text-gray-400 mt-4 text-center">
          * 成为第一个分享的人，帮助大家避开拥堵！每人每小时限提交1次。
        </p>
      </div>
    </div>
    </van-pull-refresh>

    <!-- Pickers -->
    <van-popup v-model:show="showStorePicker" position="bottom" round>
      <van-picker
        :columns="storeOptions"
        @confirm="onStoreConfirm"
        @cancel="showStorePicker = false"
        show-toolbar
        title="选择门店"
      />
    </van-popup>

    <van-popup v-model:show="showFloorPicker" position="bottom" round>
      <van-picker
        :columns="floorOptions"
        @confirm="onFloorConfirm"
        @cancel="showFloorPicker = false"
        show-toolbar
        title="选择楼层"
      />
    </van-popup>
  </div>
</template>

<style scoped>
</style>
