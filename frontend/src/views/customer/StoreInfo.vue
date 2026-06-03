<!-- 模块：门店查询 -->
<script setup lang="ts">
// 模块：门店查询与展示（Leaflet 地图 + 多图源降级）
import { ref, onMounted, nextTick, onUnmounted, watch } from 'vue'
import { getStores, getRegions } from '../../api/index'
import { showToast, showDialog } from 'vant'
import { getCachedLocation, setCachedLocation } from '../../utils/location'
import { wgs84togcj02, gcj02towgs84 } from '../../utils/coordTransform'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const selectedRegion = ref('')
const showPicker = ref(false)
const stores = ref<any[]>([])
const searchValue = ref('')
const hasSearched = ref(false)

const showNavSheet = ref(false)
const currentNavActions = ref<any[]>([])
const onSelectNav = (action: any) => {
  window.open(action.url, '_blank')
  showNavSheet.value = false
}

const columns = ref<any[]>([])

const currentQuery = ref({ city: '', district: '' })
const isExplicitRegion = ref(false)

const userLocation = ref<{ lat: number; lng: number } | null>(null)
const viewMode = ref<'list' | 'map'>('list')
const loading = ref(false)
let mapInstance: L.Map | null = null
let isDestroyed = false

const redSvg = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="52"><path fill="%23e74c3c" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z"/></svg>'
const blueSvg = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="52"><path fill="%233498db" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z"/></svg>'

// 红色图标（用户位置）
const redIcon = L.icon({
  iconUrl: redSvg,
  iconSize: [42, 62],
  iconAnchor: [16, 52],
  popupAnchor: [1, -44]
})

// 蓝色图标（门店位置）
const blueIcon = L.icon({
  iconUrl: blueSvg,
  iconSize: [42, 62],
  iconAnchor: [16, 52],
  popupAnchor: [1, -44]
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
    if (isDestroyed) return
    
    const loc = getCachedLocation()
    if (loc) {
      if (loc.lat && loc.lng) {
        userLocation.value = { lat: loc.lat, lng: loc.lng }
      } else {
        const coords = await tryBrowserGeolocation()
        if (isDestroyed) return
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
      if (isDestroyed) return
      if (coords) {
        userLocation.value = coords
      }
      showDialog({
        title: "提示",
        message: "未能获取到您的位置信息，暂不能查询门店信息。为了更好的体验，请开启定位权限。",
        confirmButtonText: "我知道了"
      })
    }
    
    await fetchStores(!loc?.city)
  } catch (error: any) {
    if (!isDestroyed) showToast('加载失败: ' + (error?.message || '网络异常'))
  }
})

onUnmounted(() => {
  isDestroyed = true
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
    isExplicitRegion.value = true
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
  try {
    loading.value = true
    const params: any = (isGlobalSearch || !currentQuery.value.city) ? {} : { city: currentQuery.value.city }
    // 如果明确选择了具体的区，且非全局搜索，则传入 district 筛选
    if (!isGlobalSearch && currentQuery.value.district && isExplicitRegion.value) {
      params.district = currentQuery.value.district
    }
    
    let data = await getStores(params)
    if (isDestroyed) return
    
    if (searchValue.value) {
      data = data.filter((s: any) => s.name.includes(searchValue.value) || s.location.includes(searchValue.value))
    }
    
    if (userLocation.value) {
      const { lat, lng } = userLocation.value
      data = data.map((s: any) => {
        if (s.latitude && s.longitude) {
          const sLat = parseFloat(s.latitude)
          const sLng = parseFloat(s.longitude)
          if (!isNaN(sLat) && !isNaN(sLng)) {
            const d = calculateDistance(lat, lng, sLat, sLng)
            return { ...s, distance: parseFloat(d.toFixed(2)) }
          }
        }
        return { ...s, distance: Infinity }
      }).sort((a: any, b: any) => a.distance - b.distance)
      
      // 仅在无搜索词且未明确选定具体的区时，才截断推荐最近 5 家
      if (!isGlobalSearch && !searchValue.value && !isExplicitRegion.value) {
        data = data.slice(0, 5)
      }
    }
    
    stores.value = data
    hasSearched.value = true
    if (viewMode.value === 'map') {
      initOrUpdateMap()
    }
  } catch (error: any) {
    if (!isDestroyed) showToast('获取门店失败: ' + (error?.message || '请求异常'))
    console.error('Fetch stores error:', error)
  } finally {
    if (!isDestroyed) loading.value = false
  }
}

const onSearch = () => {
  if (!searchValue.value.trim()) {
    fetchStores(false)
    return
  }
  fetchStores(true)
}

watch(searchValue, (val) => {
  if (!val.trim() && hasSearched.value) {
    fetchStores(false)
  }
})

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
      subdomains: '0123', maxZoom: 18, attribution: '&copy; 腾讯地图'
    }
  },
  {
    name: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    options: { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }
  }
]

const activeTileIndex = ref(0)

const getMarkerCoords = (lat: number, lng: number, isStore: boolean): [number, number] => {
  const isWgs84Map = activeTileIndex.value === 2 // OSM 是 WGS84，高德腾讯是 GCJ02
  
  if (isStore) {
    // 门店坐标默认是 GCJ02 (后台存储)
    if (isWgs84Map) {
      const [wLng, wLat] = gcj02towgs84(lng, lat)
      return [wLat, wLng]
    }
    return [lat, lng]
  } else {
    // 用户坐标默认是 WGS84 (浏览器定位)
    if (isWgs84Map) {
      return [lat, lng]
    }
    const [cLng, cLat] = wgs84togcj02(lng, lat)
    return [cLat, cLng]
  }
}

const createTileLayer = (index: number): L.TileLayer => {
  const cfg = tileLayers[index]
  const layer = L.tileLayer(cfg.url, cfg.options as any)
  
  let hasSwitched = false
  layer.on('tileerror', () => {
    // 瓦片加载失败，尝试下一个图源
    // 这里的 hasSwitched 在闭包中是每个图层实例独有的，
    // 因此如果同一图层上同时出现多个瓦片失败事件，
    // 只有第一个事件能进入这里执行，后续事件都会被拦截，不存在导致多次 init 的并发竞态条件。
    if (!hasSwitched && index + 1 < tileLayers.length && mapInstance) {
      hasSwitched = true
      console.warn(`${cfg.name}加载失败，切换到${tileLayers[index + 1].name}`)
      mapInstance.removeLayer(layer)
      activeTileIndex.value = index + 1
      createTileLayer(index + 1).addTo(mapInstance)
      initOrUpdateMap() // 重新渲染 marker 适配新坐标系
    }
  })
  
  return layer
}

const initOrUpdateMap = async () => {
  if (viewMode.value !== 'map') return

  await nextTick()

  const container = document.getElementById('map-container')
  if (!container) return

  const defaultCenterWgs84: [number, number] = [34.746599, 113.625368] // 郑州
  let centerLat = userLocation.value ? userLocation.value.lat : defaultCenterWgs84[0]
  let centerLng = userLocation.value ? userLocation.value.lng : defaultCenterWgs84[1]
  const center = getMarkerCoords(centerLat, centerLng, false)

  if (!mapInstance) {
    activeTileIndex.value = 0
    mapInstance = L.map(container, {
      center,
      zoom: 12,
      zoomControl: true,
    })
    // 从第一优先级图源开始加载
    createTileLayer(0).addTo(mapInstance)
  } else {
    mapInstance.invalidateSize()
    mapInstance.setView(center, mapInstance.getZoom(), { animate: false })
  }

  // 清除旧标记
  mapInstance.eachLayer((layer: L.Layer) => {
    if (layer instanceof L.Marker) {
      mapInstance!.removeLayer(layer)
    }
  })

  const bounds = L.latLngBounds([])

  // 用户位置标记（红色）
  if (userLocation.value) {
    const userCoords = getMarkerCoords(userLocation.value.lat, userLocation.value.lng, false)
    const myMarker = L.marker(userCoords, { icon: redIcon, zIndexOffset: 1000 })
      .addTo(mapInstance)
      .bindPopup('<div style="font-weight:bold;font-size:14px;">📍 我的位置</div>')
    bounds.extend(myMarker.getLatLng())
  }

  // 门店标记（蓝色）
  const storesWithCoords = stores.value.filter(s => s.latitude && s.longitude)
  storesWithCoords.forEach(s => {
    const lat = parseFloat(s.latitude)
    const lng = parseFloat(s.longitude)
    const storeCoords = getMarkerCoords(lat, lng, true)
    
    const distText = s.distance && s.distance !== Infinity
      ? `<div style="color:#1989fa;font-size:12px;margin:2px 0;">距离您 ${s.distance} 公里</div>`
      : ''
    const amapUrl = `https://uri.amap.com/navigation?to=${lng},${lat},${encodeURIComponent(s.name)}&mode=car&callnative=1`
    const tencentUrl = `https://apis.map.qq.com/uri/v1/routeplan?type=drive&to=${encodeURIComponent(s.name)}&tocoord=${lat},${lng}&policy=1`
    
    const popupDiv = document.createElement('div')
    popupDiv.innerHTML = `
      <div style="min-width:180px;">
        <div style="font-weight:bold;font-size:14px;margin-bottom:4px;">${s.name}</div>
        <div style="font-size:12px;color:#666;">${s.location}</div>
        <div style="font-size:12px;color:#666;">营业时间：${s.time}</div>
        ${distText}
        <button style="display:inline-block;margin-top:6px;padding:4px 12px;background:#1989fa;color:#fff;border-radius:4px;font-size:12px;border:none;cursor:pointer;">
          🧭 导航到这里
        </button>
      </div>
    `
    const navBtn = popupDiv.querySelector('button')
    if (navBtn) {
      navBtn.onclick = () => {
        currentNavActions.value = [
          { name: '高德地图', url: amapUrl },
          { name: '腾讯地图', url: tencentUrl }
        ]
        showNavSheet.value = true
      }
    }

    const marker = L.marker(storeCoords, { icon: blueIcon })
      .addTo(mapInstance!)
      .bindPopup(popupDiv)
    bounds.extend(marker.getLatLng())
  })

  // 自动适配视野
  if (bounds.isValid()) {
    mapInstance.fitBounds(bounds, { padding: [40, 40] })
  }
}
</script>

<template>
  <div class="flex-grow w-full max-w-screen-md mx-auto flex flex-col bg-background font-body-md text-on-background min-h-screen">
    
    <!-- Popups/Overlays -->
    <van-popup v-model:show="showPicker" position="bottom" teleport="body">
      <van-picker
        :columns="columns"
        @confirm="onConfirm"
        @cancel="showPicker = false"
      />
    </van-popup>

    <van-action-sheet
      v-model:show="showNavSheet"
      :actions="currentNavActions"
      cancel-text="取消"
      description="请选择导航应用"
      close-on-click-action
      @select="onSelectNav"
      teleport="body"
    />

    <!-- Fixed Header & Controls -->
    <div class="bg-surface shadow-sm z-10 sticky top-0 px-margin-mobile pt-4 pb-4">
      <section class="bg-surface-container-lowest rounded-xl p-4 shadow-sm border border-surface-variant flex flex-col gap-4">
        <!-- Region Selector -->
        <div @click="showPicker = true" class="flex items-center justify-between py-2 border-b border-surface-variant cursor-pointer active:bg-surface-container-low transition-colors rounded-lg px-2">
          <span class="font-body-md text-on-surface-variant">选择区域</span>
          <div class="flex items-center gap-2 text-on-surface">
            <span class="font-body-md font-medium">{{ selectedRegion || '请选择省市区' }}</span>
            <span class="material-symbols-outlined text-outline">chevron_right</span>
          </div>
        </div>
        
        <!-- Search Bar -->
        <div class="flex gap-2">
          <div class="relative flex-grow">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span class="material-symbols-outlined text-outline text-sm">search</span>
            </div>
            <input 
              v-model="searchValue"
              @keyup.enter="onSearch"
              class="w-full pl-10 pr-4 py-2 bg-surface-container-low border border-surface-variant rounded-lg font-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-outline-variant" 
              placeholder="全局搜索: 输入门店名称或位置" 
              type="text"
            />
            <div v-show="searchValue" @click="searchValue = ''; fetchStores(false)" class="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer text-outline hover:text-on-surface">
              <span class="material-symbols-outlined text-sm">close</span>
            </div>
          </div>
          <button @click="onSearch" class="bg-primary text-white px-4 py-2 rounded-lg font-body-md font-medium hover:bg-primary-container hover:text-white transition-colors active:scale-95">搜索</button>
        </div>

        <!-- Mode Toggle -->
        <div class="flex rounded-lg overflow-hidden border border-primary mt-2">
          <button 
            @click="viewMode = 'list'; initOrUpdateMap()" 
            class="flex-1 py-2 font-body-md font-medium text-center transition-colors"
            :class="viewMode === 'list' ? 'bg-primary text-white' : 'bg-surface-container-lowest text-primary hover:bg-surface-container-low'"
          >
            列表模式
          </button>
          <button 
            @click="viewMode = 'map'; initOrUpdateMap()" 
            class="flex-1 py-2 font-body-md font-medium text-center transition-colors"
            :class="viewMode === 'map' ? 'bg-primary text-white' : 'bg-surface-container-lowest text-primary hover:bg-surface-container-low'"
          >
            地图模式
          </button>
        </div>
      </section>
    </div>

    <div v-if="loading && viewMode === 'list'" class="flex-1 flex items-center justify-center py-12">
      <van-loading type="spinner" color="#1989fa" vertical>加载门店中...</van-loading>
    </div>

    <div v-else-if="stores.length === 0 && hasSearched && viewMode === 'list'" class="flex-1 flex items-center justify-center text-gray-400 text-sm py-12">
      未找到相关门店数据
    </div>

    <!-- Store List -->
    <main v-else-if="viewMode === 'list'" class="flex-grow w-full max-w-screen-md mx-auto px-margin-mobile pt-2 pb-24 flex flex-col gap-4">
      <article v-for="store in stores" :key="store.id" class="bg-surface-container-lowest rounded-xl p-md shadow-[0px_4px_12px_rgba(0,0,0,0.05)] border border-surface-variant hover:border-primary-fixed-dim transition-colors cursor-pointer group">
        <div class="flex justify-between items-start mb-4">
          <h2 class="font-headline-sm text-headline-sm text-on-surface group-hover:text-primary transition-colors">{{ store.name }}</h2>
          <div class="flex flex-col items-end gap-1">
            <span class="px-2 py-0.5 rounded border border-primary/30 text-primary font-label-md text-[10px] bg-primary/5">{{ store.district }}</span>
            <span v-if="store.distance && store.distance !== Infinity" class="font-body-md text-sm text-primary">距离您 {{ store.distance }} 公里</span>
          </div>
        </div>
        <div class="flex flex-col gap-2">
          <div class="flex items-start gap-2 text-on-surface-variant">
            <span class="material-symbols-outlined text-[18px] mt-0.5" style="font-variation-settings: 'FILL' 1;">location_on</span>
            <span class="font-body-md text-sm">地址: {{ store.location }}</span>
          </div>
          <div class="flex items-center gap-2 text-on-surface-variant">
            <span class="material-symbols-outlined text-[18px]">schedule</span>
            <span class="font-body-md text-sm">营业时间: {{ store.time }}</span>
          </div>
          <div class="flex items-center gap-2 text-on-surface-variant">
            <span class="material-symbols-outlined text-[18px]">call</span>
            <span class="font-body-md text-sm">联系电话: {{ store.phone }}</span>
          </div>
        </div>
      </article>
    </main>

    <!-- Map View -->
    <div v-show="viewMode === 'map'" id="map-container" style="width: 100%; height: calc(100vh - 240px);" class="z-0"></div>
  </div>
</template>
