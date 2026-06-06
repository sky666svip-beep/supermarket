<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { getParkingRules } from '../api'
import { calculateFee } from '../utils/parkingCalculator'
import type { ParkingRule, VehicleType } from '../utils/parkingCalculator'

const props = defineProps<{
  initialStoreId?: number | null
}>()

const rules = ref<ParkingRule[]>([])
const selectedStoreId = ref<number | null>(null)

// Default times: start = now, end = now + 2 hours
const now = new Date()
const defaultEnd = new Date(now.getTime() + 2 * 60 * 60 * 1000)

const formatDateTimeLocal = (d: Date) => {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const startTime = ref<string>(formatDateTimeLocal(now))
const endTime = ref<string>(formatDateTimeLocal(defaultEnd))
const vehicleType = ref<VehicleType>('small')

const fee = ref<number | null>(null)

const activeStore = computed(() => {
  return rules.value.find(r => r.storeId === selectedStoreId.value)
})

const calculate = () => {
  if (!activeStore.value || !startTime.value || !endTime.value) {
    fee.value = null
    return
  }
  const start = new Date(startTime.value)
  const end = new Date(endTime.value)
  
  fee.value = calculateFee(activeStore.value, start, end, vehicleType.value)
}

watch([selectedStoreId, startTime, endTime, vehicleType], () => {
  calculate()
})

import { getCachedLocation } from '../utils/location'

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

onMounted(async () => {
  try {
    const data = await getParkingRules()
    rules.value = data
    if (props.initialStoreId && rules.value.find(r => r.storeId === props.initialStoreId)) {
      selectedStoreId.value = props.initialStoreId
    } else if (rules.value.length > 0) {
      // Find closest
      let closestId = rules.value[0].storeId
      let loc = getCachedLocation()
      if (loc && loc.lat && loc.lng) {
        let minDist = Infinity
        for (const r of rules.value) {
          if (r.latitude && r.longitude) {
            const d = calculateDistance(loc.lat, loc.lng, parseFloat(String(r.latitude)), parseFloat(String(r.longitude)))
            if (d < minDist) {
              minDist = d
              closestId = r.storeId
            }
          }
        }
      }
      selectedStoreId.value = closestId
    }
    calculate()
  } catch (e) {
    console.error(e)
  }
})

watch(() => props.initialStoreId, (newId) => {
  if (newId && !selectedStoreId.value && rules.value.find(r => r.storeId === newId)) {
    selectedStoreId.value = newId
    calculate()
  }
})
</script>

<template>
  <main v-if="rules.length > 0" class="px-margin-mobile py-md max-w-2xl mx-auto space-y-md h-full">
    <!-- Store Selection -->
    <section class="space-y-sm">
      <label class="font-body-md text-body-md text-on-surface-variant">选择门店</label>
      <div class="relative">
        <select v-model="selectedStoreId" class="w-full appearance-none bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-3 font-body-lg text-body-lg text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors">
          <option v-for="rule in rules" :key="rule.id" :value="rule.storeId">{{ rule.storeName }}</option>
        </select>
        <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-on-surface-variant">
          <i-material-symbols-expand-more></i-material-symbols-expand-more>
        </div>
      </div>
    </section>

    <!-- Parking Info Card -->
    <div v-if="activeStore" class="bg-primary-container/10 rounded-lg p-md border border-[#165DFF]/20 space-y-md">
      <div class="flex justify-between items-center text-[#165DFF]">
        <span class="font-headline-sm text-headline-sm font-bold">车位: {{ activeStore.capacity }}个</span>
        <span class="font-body-md text-body-md">开放时间: {{ activeStore.openingHours }}</span>
      </div>
      <div class="font-body-md text-body-md text-[#165DFF]/80 space-y-2 whitespace-pre-wrap leading-relaxed">
        {{ activeStore.rawText }}
      </div>
    </div>

    <!-- Vehicle Type Selection -->
    <section class="space-y-sm">
      <label class="font-body-md text-body-md text-on-surface-variant">车辆类型</label>
      <div class="flex flex-wrap gap-2">
        <button @click="vehicleType = 'small'" :class="vehicleType === 'small' ? 'bg-[#165DFF] !text-white shadow-sm' : 'bg-surface-variant text-on-surface-variant hover:bg-surface-container-highest'" class="font-label-md text-xs px-3 py-1.5 rounded-DEFAULT active:scale-95 transition-all">小型汽车</button>
        <button @click="vehicleType = 'medium'" :class="vehicleType === 'medium' ? 'bg-[#165DFF] !text-white shadow-sm' : 'bg-surface-variant text-on-surface-variant hover:bg-surface-container-highest'" class="font-label-md text-xs px-3 py-1.5 rounded-DEFAULT active:scale-95 transition-all">中型汽车</button>
        <button @click="vehicleType = 'large'" :class="vehicleType === 'large' ? 'bg-[#165DFF] !text-white shadow-sm' : 'bg-surface-variant text-on-surface-variant hover:bg-surface-container-highest'" class="font-label-md text-xs px-3 py-1.5 rounded-DEFAULT active:scale-95 transition-all">大型汽车</button>
        <button @click="vehicleType = 'new_energy'" :class="vehicleType === 'new_energy' ? 'bg-[#165DFF] !text-white shadow-sm' : 'bg-surface-variant text-on-surface-variant hover:bg-surface-container-highest'" class="font-label-md text-xs px-3 py-1.5 rounded-DEFAULT active:scale-95 transition-all">新能源(减半)</button>
        <button @click="vehicleType = 'military'" :class="vehicleType === 'military' ? 'bg-[#165DFF] !text-white shadow-sm' : 'bg-surface-variant text-on-surface-variant hover:bg-surface-container-highest'" class="font-label-md text-xs px-3 py-1.5 rounded-DEFAULT active:scale-95 transition-all">军警救援(免费)</button>
      </div>
    </section>

    <!-- Time Pickers -->
    <section class="space-y-sm">
      <label class="font-body-md text-body-md text-on-surface-variant">入场时间</label>
      <div class="relative">
        <input type="datetime-local" v-model="startTime" class="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-3 font-body-lg text-body-lg text-on-surface focus:outline-none focus:border-primary transition-colors cursor-pointer" />
      </div>
    </section>

    <section class="space-y-sm">
      <label class="font-body-md text-body-md text-on-surface-variant">出场时间</label>
      <div class="relative">
        <input type="datetime-local" v-model="endTime" class="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-3 font-body-lg text-body-lg text-on-surface focus:outline-none focus:border-primary transition-colors cursor-pointer" />
      </div>
    </section>

    <!-- Divider -->
    <hr class="border-t border-outline-variant/30 my-lg"/>

    <!-- Estimated Fee -->
    <section class="text-center space-y-sm py-md">
      <p class="font-body-md text-body-md text-on-surface-variant">预计停车费</p>
      <div class="text-error font-bold flex items-baseline justify-center gap-1">
        <template v-if="fee !== null">
          <span class="text-2xl">¥</span>
          <span class="text-5xl tracking-tight">{{ fee }}</span>
        </template>
        <template v-else>
          <span class="text-5xl tracking-tight text-outline-variant">-</span>
        </template>
      </div>
    </section>
  </main>
  
  <div v-else class="p-4 text-center text-on-surface-variant flex-1 h-full flex items-center justify-center font-body-md">
    暂无支持停车计费的门店
  </div>
</template>
