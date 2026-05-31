<script setup lang="ts">
// 模块：门店查询与展示
import { ref, onMounted } from 'vue'
import { getStores, getRegions } from '../../api/index'
import { showToast } from 'vant'

const selectedRegion = ref('')
const showPicker = ref(false)
const stores = ref<any[]>([])
const searchValue = ref('')
const hasSearched = ref(false)

const columns = ref<any[]>([])

const currentQuery = ref({ city: '', district: '' })

onMounted(async () => {
  try {
    columns.value = await getRegions()
    await fetchStores(true)
  } catch (error) {
    showToast('加载失败')
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

const fetchStores = async (isGlobalSearch = false) => {
  hasSearched.value = true
  try {
    const params = (isGlobalSearch || !currentQuery.value.city) ? {} : currentQuery.value
    const data = await getStores(params)
    if (searchValue.value) {
      stores.value = data.filter((s: any) => s.name.includes(searchValue.value) || s.location.includes(searchValue.value))
    } else {
      stores.value = data
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
    </div>
    
    <div v-if="stores.length === 0" class="flex-1 flex items-center justify-center text-gray-400 text-sm py-12">
      未找到相关门店数据
    </div>

    <div v-else class="mt-4 space-y-3 overflow-y-auto pb-6">
      <div v-for="store in stores" :key="store.id" class="bg-white p-4 rounded-lg shadow-sm">
        <div class="flex justify-between items-center mb-2">
          <h3 class="font-bold text-base">{{ store.name }}</h3>
          <van-tag type="primary" plain>{{ store.district }}</van-tag>
        </div>
        <div class="text-sm text-gray-500 space-y-1">
          <p><van-icon name="location-o" class="mr-1" /> 地址：{{ store.location }}</p>
          <p><van-icon name="clock-o" class="mr-1" /> 营业时间：{{ store.time }}</p>
          <p><van-icon name="phone-o" class="mr-1" /> 联系电话：{{ store.phone }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
