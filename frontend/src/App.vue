<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { areaList } from '@vant/area-data'
import { showToast } from 'vant'
import { autoLocate, getCachedLocation, setCachedLocation, type LocationInfo } from './utils/location'

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
    window.dispatchEvent(new CustomEvent('location-updated'))
  }
}

const forceRelocate = async () => {
  if (isRelocating.value) return
  isRelocating.value = true
  const oldLoc = currentLocation.value
  
  try {
    const loc = await autoLocate()
    currentLocation.value = loc
    setCachedLocation(loc)
    showToast('定位更新成功')
  } catch (e) {
    console.warn('Auto locate failed', e)
    if (!oldLoc) {
      showToast('定位失败，请手动选择')
      showAreaPopup.value = true
    } else {
      showToast('定位失败，已恢复上次位置')
      currentLocation.value = oldLoc
    }
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
      } catch (e) {
        showToast('获取精准坐标失败，部分功能可能受限')
      }
    }
  } else {
    try {
      const loc = await autoLocate()
      currentLocation.value = loc
      setCachedLocation(loc)
    } catch (e) {
      console.warn('Auto locate failed, showing manual picker')
      showToast('定位失败，请手动选择所在地区')
      showAreaPopup.value = true
    }
  }

  // Listen for event from Home.vue or other components to manually open popup
  window.addEventListener('open-area-popup', () => {
    showAreaPopup.value = true
  })
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
    
    <nav class="fixed bottom-0 w-full z-50 flex justify-around items-center px-2 py-3 pb-safe bg-surface/70 dark:bg-inverse-surface/70 backdrop-blur-md shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
      <router-link to="/" custom v-slot="{ navigate, isActive }">
        <div @click="navigate" :class="isActive ? 'bg-blue-500 text-white shadow-sm' : 'text-secondary hover:bg-surface-container-high'" class="flex flex-col items-center justify-center rounded-full px-6 py-1.5 active:scale-90 transition-all duration-150 cursor-pointer">
          <span class="material-symbols-outlined" :style="isActive ? 'font-variation-settings: \'FILL\' 1;' : ''">home</span>
          <span class="font-label-md text-label-md mt-1">顾客服务</span>
        </div>
      </router-link>
      
      <router-link to="/community" custom v-slot="{ navigate, isActive }">
        <div @click="navigate" :class="isActive ? 'bg-blue-500 text-white shadow-sm' : 'text-secondary hover:bg-surface-container-high'" class="flex flex-col items-center justify-center rounded-full px-6 py-1.5 active:scale-90 transition-all duration-150 cursor-pointer">
          <span class="material-symbols-outlined" :style="isActive ? 'font-variation-settings: \'FILL\' 1;' : ''">forum</span>
          <span class="font-label-md text-label-md mt-1">社区</span>
        </div>
      </router-link>

      <router-link to="/profile" custom v-slot="{ navigate, isActive }">
        <div @click="navigate" :class="isActive ? 'bg-blue-500 text-white shadow-sm' : 'text-secondary hover:bg-surface-container-high'" class="flex flex-col items-center justify-center rounded-full px-6 py-1.5 active:scale-90 transition-all duration-150 cursor-pointer">
          <span class="material-symbols-outlined" :style="isActive ? 'font-variation-settings: \'FILL\' 1;' : ''">person</span>
          <span class="font-label-md text-label-md mt-1">我的</span>
        </div>
      </router-link>
    </nav>

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
