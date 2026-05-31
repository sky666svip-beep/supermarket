<script setup lang="ts">
// 模块：门店查询与展示（Leaflet 地图 + 多图源降级）
import { ref, onMounted, nextTick, onUnmounted } from 'vue'
import { getStores, getRegions } from '../../api/index'
import { showToast, showDialog } from 'vant'
import { getCachedLocation, setCachedLocation } from '../../utils/location'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const selectedRegion = ref('')
const showPicker = ref(false)
const stores = ref<any[]>([])
const searchValue = ref('')
const hasSearched = ref(false)

const columns = ref<any[]>([])

const currentQuery = ref({ city: '', district: '' })

const userLocation = ref<{ lat: number; lng: number } | null>(null)
const viewMode = ref<'list' | 'map'>('list')
let mapInstance: L.Map | null = null

// 红色图标（用户位置）
const redIcon = L.icon({
  iconUrl: 'https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

// 蓝色图标（门店位置）
const blueIcon = L.icon({
  iconUrl: 'https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

// 尝试用浏览器 Geolocation 获取精确坐标
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

onMounted(async () => {
  try {
    columns.value = await getRegions()
    
    const loc = getCachedLocation()
    if (loc) {
      if (loc.lat && loc.lng) {
        userLocation.value = { lat: loc.lat, lng: loc.lng }
      } else {
        const coords = await tryBrowserGeolocation()
        if (coords) {
          userLocation.value = coords
          setCachedLocation({ ...loc, lat: coords.lat, lng: coords.lng })
        }
      }
      if (loc.city) {
        currentQuery.value = { city: loc.city, district: loc.district || '' }
        selectedRegion.value = `${loc.city} ${loc.district || ''}`.trim()
      }
    } else {
      const coords = await tryBrowserGeolocation()
      if (coords) {
        userLocation.value = coords
      }
      showDialog({
        title: '提示',
        message: '未能获取到您的位置信息，暂不能使用附近门店推荐和地图打点。为了更好的体验，请开启定位权限。',
        confirmButtonText: '我知道了'
      })
    }
    
    await fetchStores(!loc?.city)
  } catch (error) {
    showToast('加载失败')
  }
})

onUnmounted(() => {
  if (mapInstance) {
    mapInstance.remove()
    mapInstance = null
  }
})

const onConfirm = ({ selectedOptions }: any) => {
  showPicker.value = false
  if (selectedOptions.length === 3) {
    const city = selectedOptions[1].text
    const district = selectedOptions[2].text
    selectedRegion.value = `${city} ${district}`
    currentQuery.value = { city, district }
    fetchStores(false)
  }
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

const fetchStores = async (isGlobalSearch = false) => {
  hasSearched.value = true
  try {
    // 忽略 district 进行查询，以便能查到同城其他区更近的店铺
    const params = (isGlobalSearch || !currentQuery.value.city) ? {} : { city: currentQuery.value.city }
    let data = await getStores(params)
    
    if (searchValue.value) {
      data = data.filter((s: any) => s.name.includes(searchValue.value) || s.location.includes(searchValue.value))
    }
    
    if (userLocation.value) {
      const { lat, lng } = userLocation.value
      data = data.map((s: any) => {
        if (s.latitude && s.longitude) {
          const d = calculateDistance(lat, lng, parseFloat(s.latitude), parseFloat(s.longitude))
          return { ...s, distance: parseFloat(d.toFixed(2)) }
        }
        return { ...s, distance: Infinity }
      }).sort((a: any, b: any) => a.distance - b.distance)
      
      // 截取最近的 5 个店铺
      data = data.slice(0, 5)
    }
    
    stores.value = data
    if (viewMode.value === 'map') {
      initOrUpdateMap()
    }
  } catch (error) {
    showToast('获取门店失败')
  }
}

const onSearch = () => {
  if (!searchValue.value.trim()) {
    fetchStores(false)
    return
  }
  fetchStores(true)
}

// 多图源瓦片图层，按优先级降级
const tileLayers = [
  {
    name: '高德地图',
    url: 'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
    options: { subdomains: '1234', maxZoom: 18, attribution: '&copy; 高德地图' }
  },
  {
    name: '腾讯地图',
    url: 'https://rt{s}.map.gtimg.com/tile?z={z}&x={x}&y={y}&type=vector&styleid=0',
    options: {
      subdomains: '0123', maxZoom: 18, attribution: '&copy; 腾讯地图',
      // 腾讯地图 Y 轴需要翻转
      tms: true
    }
  },
  {
    name: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    options: { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }
  }
]

const createTileLayer = (index: number): L.TileLayer => {
  const cfg = tileLayers[index]
  const layer = L.tileLayer(cfg.url, cfg.options as any)
  
  layer.on('tileerror', () => {
    // 瓦片加载失败，尝试下一个图源
    if (index + 1 < tileLayers.length && mapInstance) {
      console.warn(`${cfg.name}加载失败，切换到${tileLayers[index + 1].name}`)
      mapInstance.removeLayer(layer)
      createTileLayer(index + 1).addTo(mapInstance)
    }
  })
  
  return layer
}

const initOrUpdateMap = async () => {
  if (viewMode.value !== 'map') return

  await nextTick()

  const container = document.getElementById('map-container')
  if (!container) return

  const defaultCenter: [number, number] = [34.746599, 113.625368] // 郑州
  const center: [number, number] = userLocation.value
    ? [userLocation.value.lat, userLocation.value.lng]
    : defaultCenter

  if (!mapInstance) {
    mapInstance = L.map(container, {
      center,
      zoom: 12,
      zoomControl: true,
    })
    // 从第一优先级图源开始加载
    createTileLayer(0).addTo(mapInstance)
  } else {
    mapInstance.invalidateSize()
  }

  // 清除旧标记
  mapInstance.eachLayer((layer) => {
    if (layer instanceof L.Marker) {
      mapInstance!.removeLayer(layer)
    }
  })

  const bounds = L.latLngBounds([])

  // 用户位置标记（红色）
  if (userLocation.value) {
    const myMarker = L.marker([userLocation.value.lat, userLocation.value.lng], { icon: redIcon, zIndexOffset: 1000 })
      .addTo(mapInstance)
      .bindPopup('<div style="font-weight:bold;font-size:14px;">📍 我的位置</div>')
    bounds.extend(myMarker.getLatLng())
  }

  // 门店标记（蓝色）
  const storesWithCoords = stores.value.filter(s => s.latitude && s.longitude)
  storesWithCoords.forEach(s => {
    const lat = parseFloat(s.latitude)
    const lng = parseFloat(s.longitude)
    const distText = s.distance && s.distance !== Infinity
      ? `<div style="color:#1989fa;font-size:12px;margin:2px 0;">距离您 ${s.distance} 公里</div>`
      : ''
    const navUrl = `https://uri.amap.com/navigation?to=${lng},${lat},${encodeURIComponent(s.name)}&mode=car&callnative=1`
    const popupContent = `
      <div style="min-width:180px;">
        <div style="font-weight:bold;font-size:14px;margin-bottom:4px;">${s.name}</div>
        <div style="font-size:12px;color:#666;">${s.location}</div>
        <div style="font-size:12px;color:#666;">营业时间：${s.time}</div>
        ${distText}
        <a href="${navUrl}" target="_blank"
           style="display:inline-block;margin-top:6px;padding:4px 12px;background:#1989fa;color:#fff;border-radius:4px;font-size:12px;text-decoration:none;">
          🧭 导航到这里
        </a>
      </div>
    `
    const marker = L.marker([lat, lng], { icon: blueIcon })
      .addTo(mapInstance!)
      .bindPopup(popupContent)
    bounds.extend(marker.getLatLng())
  })

  // 自动适配视野
  if (bounds.isValid()) {
    mapInstance.fitBounds(bounds, { padding: [40, 40] })
  }
}
</script>

<template>
  <div class="h-full flex flex-col">
    <div class="bg-white shadow-sm z-10 relative">
      <van-field
        v-model="selectedRegion"
        is-link
        readonly
        label="选择区域"
        placeholder="请选择省市区"
        @click="showPicker = true"
      />
      <van-popup v-model:show="showPicker" position="bottom">
        <van-picker
          :columns="columns"
          @confirm="onConfirm"
          @cancel="showPicker = false"
        />
      </van-popup>

      <van-search 
        v-model="searchValue" 
        placeholder="全局搜索：输入门店名称或位置" 
        @search="onSearch" 
        @clear="fetchStores(false)" 
        class="!px-0" 
      />
      <div class="px-4 pb-2 bg-white flex justify-center">
        <van-tabs v-model:active="viewMode" type="card" @change="initOrUpdateMap" class="w-full">
          <van-tab title="列表模式" name="list"></van-tab>
          <van-tab title="地图模式" name="map"></van-tab>
        </van-tabs>
      </div>
    </div>
    
    <div v-if="stores.length === 0" class="flex-1 flex items-center justify-center text-gray-400 text-sm py-12">
      未找到相关门店数据
    </div>

    <!-- List View -->
    <div v-show="viewMode === 'list'" class="flex-1 mt-4 space-y-3 overflow-y-auto pb-6 px-4">
      <div v-for="store in stores" :key="store.id" class="bg-white p-4 rounded-lg shadow-sm">
        <div class="flex justify-between items-center mb-2">
          <h3 class="font-bold text-base">{{ store.name }}</h3>
          <div class="text-right">
             <van-tag type="primary" plain class="mb-1">{{ store.district }}</van-tag>
             <div v-if="store.distance && store.distance !== Infinity" class="text-xs text-blue-500">
               距离您 {{ store.distance }} 公里
             </div>
          </div>
        </div>
        <div class="text-sm text-gray-500 space-y-1">
          <p><van-icon name="location-o" class="mr-1" /> 地址：{{ store.location }}</p>
          <p><van-icon name="clock-o" class="mr-1" /> 营业时间：{{ store.time }}</p>
          <p><van-icon name="phone-o" class="mr-1" /> 联系电话：{{ store.phone }}</p>
        </div>
      </div>
    </div>

    <!-- Map View -->
    <div v-show="viewMode === 'map'" id="map-container" style="width: 100%; height: calc(100vh - 180px);"></div>
  </div>
</template>
