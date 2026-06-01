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
  <div class="bg-white min-h-full flex flex-col">
    <div class="p-4 flex-1 flex flex-col" v-if="rules.length > 0">
      <!-- Store Selector -->
      <div class="mb-4">
        <label class="block text-sm text-gray-500 mb-1">选择门店</label>
        <select v-model="selectedStoreId" class="w-full bg-gray-50 border border-gray-200 text-gray-700 py-2 px-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option v-for="rule in rules" :key="rule.id" :value="rule.storeId">
            {{ rule.storeName }}
          </option>
        </select>
      </div>

      <div v-if="activeStore" class="mb-4 bg-blue-50 p-3 rounded-md text-sm text-blue-800">
        <div class="flex items-center justify-between mb-1">
          <span class="font-bold">车位: {{ activeStore.capacity }}个</span>
          <span>开放时间: {{ activeStore.openingHours }}</span>
        </div>
        <div class="text-xs text-blue-600 mt-2 whitespace-pre-wrap leading-relaxed">{{ activeStore.rawText }}</div>
      </div>

      <!-- Vehicle Type -->
      <div class="mb-4">
        <label class="block text-sm text-gray-500 mb-1">车辆类型</label>
        <div class="flex flex-wrap gap-2">
          <van-tag size="medium" :type="vehicleType === 'small' ? 'primary' : 'default'" @click="vehicleType = 'small'">小型汽车</van-tag>
          <van-tag size="medium" :type="vehicleType === 'medium' ? 'primary' : 'default'" @click="vehicleType = 'medium'">中型汽车</van-tag>
          <van-tag size="medium" :type="vehicleType === 'large' ? 'primary' : 'default'" @click="vehicleType = 'large'">大型汽车</van-tag>
          <van-tag size="medium" :type="vehicleType === 'new_energy' ? 'success' : 'default'" @click="vehicleType = 'new_energy'">新能源(减半)</van-tag>
          <van-tag size="medium" :type="vehicleType === 'military' ? 'danger' : 'default'" @click="vehicleType = 'military'">军警救援(免费)</van-tag>
        </div>
      </div>

      <!-- Time Inputs -->
      <div class="flex flex-col gap-4 mb-6">
        <div class="flex-1">
          <label class="block text-sm text-gray-500 mb-1">入场时间</label>
          <input type="datetime-local" v-model="startTime" class="w-full bg-gray-50 border border-gray-200 text-gray-700 py-2 px-2 rounded-md focus:outline-none" />
        </div>
        <div class="flex-1">
          <label class="block text-sm text-gray-500 mb-1">出场时间</label>
          <input type="datetime-local" v-model="endTime" class="w-full bg-gray-50 border border-gray-200 text-gray-700 py-2 px-2 rounded-md focus:outline-none" />
        </div>
      </div>

      <!-- Result -->
      <div class="mt-6 text-center border-t border-gray-100 pt-4">
        <div class="text-gray-500 text-sm mb-1">预计停车费</div>
        <div class="text-3xl font-bold text-red-500">
          <span v-if="fee !== null">¥ {{ fee }}</span>
          <span v-else class="text-gray-300">-</span>
        </div>
      </div>
    </div>
    
    <div v-else class="p-4 text-center text-gray-400 flex-1">
      暂无支持停车计费的门店
    </div>
  </div>
</template>
