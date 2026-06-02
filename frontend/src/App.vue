<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { areaList } from '@vant/area-data'
import { showToast } from 'vant'
import { autoLocate, getCachedLocation, setCachedLocation, clearCachedLocation, type LocationInfo } from './utils/location'

const active = ref(0)
const route = useRoute()

const currentLocation = ref<LocationInfo | null>(null)
const showAreaPopup = ref(false)
const isRelocating = ref(false)

const onAreaConfirm = ({ selectedOptions }: any) => {
  if (selectedOptions && selectedOptions.length >= 2) {
    const loc: LocationInfo = {
      province: selectedOptions[0]?.text || '',
      city: selectedOptions[1]?.text || selectedOptions[0]?.text || '',
      district: selectedOptions[2]?.text || '',
      source: 'manual'
    }
    currentLocation.value = loc
    setCachedLocation(loc)
    showAreaPopup.value = false
  }
}

const forceRelocate = async () => {
  if (isRelocating.value) return
  isRelocating.value = true
  clearCachedLocation()
  currentLocation.value = null
  try {
    const loc = await autoLocate()
    currentLocation.value = loc
    setCachedLocation(loc)
    showToast('定位更新成功')
  } catch (e) {
    console.warn('Auto locate failed', e)
    showToast('定位失败，请手动选择')
    showAreaPopup.value = true
  } finally {
    isRelocating.value = false
  }
}

onMounted(async () => {
  const cached = getCachedLocation()
  if (cached) {
    currentLocation.value = cached
    // 缓存中缺少经纬度时重新定位以补充坐标
    if (!cached.lat || !cached.lng) {
      try {
        const loc = await autoLocate()
        currentLocation.value = loc
        setCachedLocation(loc)
      } catch (_) {}
    }
  } else {
    try {
      const loc = await autoLocate()
      currentLocation.value = loc
      setCachedLocation(loc)
    } catch (e) {
      console.warn('Auto locate failed, showing manual picker')
      showAreaPopup.value = true
    }
  }
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 pb-16">
    <van-nav-bar v-if="route.meta && !route.meta.customNav" title="商场助手" fixed placeholder>
      <template #left v-if="route.name === 'home'">
        <div class="flex items-center text-gray-700 text-sm font-medium">
          <div class="flex items-center" @click="showAreaPopup = true">
            <van-icon name="location-o" class="mr-1 text-blue-500 text-lg" />
            <span v-if="currentLocation" class="max-w-[65px] truncate">{{ currentLocation.city }} {{ currentLocation.district }}</span>
            <span v-else>定位中...</span>
            <van-icon name="arrow-down" class="ml-1 text-gray-400 text-xs" />
          </div>
          <!-- 重新定位按钮 -->
          <van-icon 
            name="aim" 
            class="text-blue-500 text-lg ml-1.5" 
            :class="{ 'animate-spin': isRelocating }"
            @click="forceRelocate" 
          />
        </div>
      </template>
    </van-nav-bar>
    
    <main :class="(route.meta && !route.meta.customNav) ? 'p-4' : ''">
      <router-view />
    </main>
    
    <van-tabbar v-model="active" route fixed>
      <van-tabbar-item icon="home-o" replace to="/">顾客服务</van-tabbar-item>
      <van-tabbar-item icon="chat-o" replace to="/community">社区</van-tabbar-item>
      <van-tabbar-item icon="user-o" replace to="/profile">我的</van-tabbar-item>
    </van-tabbar>

    <van-popup v-model:show="showAreaPopup" position="bottom" round>
      <van-area 
        title="请选择所在地区" 
        :area-list="areaList" 
        @confirm="onAreaConfirm"
        @cancel="showAreaPopup = false"
      />
    </van-popup>
  </div>
</template>
