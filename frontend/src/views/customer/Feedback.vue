<!-- 模块：问题上报 -->
<script setup lang="ts">
// 模块：顾客问题反馈（提交表单）
import { ref, onMounted } from 'vue'
import { showSuccessToast, showFailToast } from 'vant'
import { useRouter } from 'vue-router'
import { submitFeedback, getStores, uploadImage } from '../../api/index'
import { getCachedLocation } from '../../utils/location'

const router = useRouter()
const facilityType = ref('问题上报-设备故障')
const pickerValue = ref(['问题上报', '设备故障'])
const showPicker = ref(false)

const storeId = ref<number | null>(null)
const storeName = ref('')
const showStorePicker = ref(false)
const storeColumns = ref<any[]>([])

const message = ref('')
const fileList = ref<any[]>([])

const columns = [
  {
    text: '意见反馈',
    value: '意见反馈',
    children: [
      { text: '服务态度', value: '服务态度' },
      { text: '商品建议', value: '商品建议' },
      { text: '改进建议', value: '改进建议' },
      { text: '其他', value: '其他' },
    ],
  },
  {
    text: '问题上报',
    value: '问题上报',
    children: [
      { text: '设备故障', value: '设备故障' },
      { text: '环境卫生', value: '环境卫生' },
      { text: '安全隐患', value: '安全隐患' },
      { text: '其他', value: '其他' },
    ],
  },
]

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

onMounted(async () => {
  try {
    const loc = getCachedLocation()
    const stores = await getStores(loc?.city ? { city: loc.city } : undefined)
    let processedStores = stores
    if (loc && loc.lat && loc.lng) {
      processedStores = stores.map((s: any) => {
        if (s.latitude && s.longitude) {
          const d = calculateDistance(loc.lat!, loc.lng!, parseFloat(s.latitude), parseFloat(s.longitude))
          return { ...s, distance: parseFloat(d.toFixed(2)) }
        }
        return { ...s, distance: Infinity }
      }).sort((a: any, b: any) => a.distance - b.distance).slice(0, 3)
    } else {
      processedStores = processedStores.slice(0, 3)
    }
    
    storeColumns.value = processedStores.map((s: any) => ({
      text: s.distance !== Infinity ? `${s.name} (距您 ${s.distance} km)` : s.name,
      value: s.id,
      name: s.name
    }))
  } catch(e) {}
})

const onConfirm = ({ selectedOptions }: any) => {
  if (selectedOptions) {
    facilityType.value = selectedOptions.map((o: any) => o.text).join('-')
  }
  showPicker.value = false
}

const onStoreConfirm = ({ selectedOptions }: any) => {
  if (selectedOptions && selectedOptions[0]) {
    storeId.value = selectedOptions[0].value
    storeName.value = selectedOptions[0].name
  }
  showStorePicker.value = false
}

const afterRead = async (file: any) => {
  if (!file.file) return
  file.status = 'uploading'
  file.message = '上传中...'
  try {
    const res = await uploadImage(file.file)
    if (res.success) {
      file.status = 'done'
      file.url = res.url
    } else {
      file.status = 'failed'
      file.message = '上传失败'
    }
  } catch (error) {
    file.status = 'failed'
    file.message = '上传失败'
  }
}

const onSubmit = async () => {
  if (!storeId.value) {
    showFailToast('请选择相关门店')
    return
  }
  
  try {
    const images = fileList.value.filter(item => item.status === 'done' && item.url).map(item => item.url)
    
    await submitFeedback(storeId.value, facilityType.value, message.value, images)
    showSuccessToast('提交成功，感谢您的反馈')
    setTimeout(() => {
      router.back()
    }, 1500)
  } catch (error) {
    console.error(error)
    showFailToast('提交失败，请重试')
  }
}
</script>

<template>
  <div class="space-y-4">
    <van-form @submit="onSubmit">
      <van-cell-group inset class="!mx-0 shadow-sm">
        <van-field
          v-model="storeName"
          is-link
          readonly
          name="storePicker"
          label="相关门店"
          placeholder="点击选择门店"
          :rules="[{ required: true, message: '请选择相关门店' }]"
          @click="showStorePicker = true"
        />
        <van-popup v-model:show="showStorePicker" position="bottom">
          <van-picker
            :columns="storeColumns"
            @confirm="onStoreConfirm"
            @cancel="showStorePicker = false"
          />
        </van-popup>
        
        <van-field
          v-model="facilityType"
          is-link
          readonly
          name="picker"
          label="反馈分类"
          placeholder="点击选择分类"
          @click="showPicker = true"
        />
        <van-popup v-model:show="showPicker" position="bottom">
          <van-picker
            v-model="pickerValue"
            :columns="columns"
            @confirm="onConfirm"
            @cancel="showPicker = false"
          />
        </van-popup>

        <van-field
          v-model="message"
          rows="3"
          autosize
          label="问题描述"
          type="textarea"
          placeholder="请输入您遇到的问题详细描述"
          :rules="[{ required: true, message: '请填写问题描述' }]"
        />

        <div class="px-4 py-3 bg-white">
          <p class="text-sm text-gray-600 mb-2">图片上传 (选填)</p>
          <van-uploader v-model="fileList" multiple :max-count="3" :after-read="afterRead" />
        </div>
      </van-cell-group>
      
      <div class="mt-8 px-4">
        <van-button round block type="primary" native-type="submit">
          提交反馈
        </van-button>
      </div>
    </van-form>
  </div>
</template>
