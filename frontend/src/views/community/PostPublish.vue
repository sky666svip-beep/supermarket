<script setup lang="ts">
// 模块：社区发帖与编辑
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { publishPost, updatePost, getPostDetail, uploadImage, getStores } from '../../api/index'
import { getCachedLocation } from '../../utils/location'
import { showToast, closeToast } from 'vant'

const router = useRouter()
const route = useRoute()

const isEdit = ref(false)
const postId = ref(0)


const title = ref('')
const content = ref('')
const category = ref('商品评价')
const fileList = ref<any[]>([])

const storeId = ref<number | null>(null)
const storeName = ref('')
const showStorePicker = ref(false)
const storeColumns = ref<any[]>([])

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

const categoryColumns = [
  { text: '商品评价', value: '商品评价' },
  { text: '购物分享', value: '购物分享' }
]

const showPicker = ref(false)

const onConfirmCategory = (selectedOptions: any) => {
  category.value = selectedOptions.selectedValues[0]
  showPicker.value = false
}

const onStoreConfirm = ({ selectedOptions }: any) => {
  if (selectedOptions && selectedOptions[0]) {
    storeId.value = selectedOptions[0].value
    storeName.value = selectedOptions[0].name
  }
  showStorePicker.value = false
}


onMounted(async () => {
  // Fetch Stores
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

  if (route.query.id) {
    isEdit.value = true
    postId.value = parseInt(route.query.id as string)
    showToast({ type: 'loading', message: '加载中...', duration: 0 })
    try {
      const res = await getPostDetail(postId.value)
      if (res.success && res.data && res.data.post) {
        const p = res.data.post
        title.value = p.title
        content.value = p.content
        category.value = p.category
        if (p.storeId) {
          storeId.value = p.storeId
          storeName.value = res.data.storeName || ''
        }
        if (p.images) {
          const imgs = JSON.parse(p.images)
          fileList.value = imgs.map((url: string) => ({ url, status: 'done', isImage: true }))
        }
      } else {
        showToast('获取帖子失败')
      }
    } catch(e) {
      showToast('获取异常')
    }
    closeToast()
  }
})

const afterRead = async (file: any) => {
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
    showToast('请选择相关门店')
    return
  }

  if (!title.value.trim() || !content.value.trim()) {
    showToast('标题和正文不能为空')
    return
  }

  // 禁止输入链接的正则表达式
  const linkRegex = /(http[s]?:\/\/|www\.)|([a-zA-Z0-9\-\_]+\.(com|cn|net|org|io|me|cc|co))/i
  if (linkRegex.test(title.value) || linkRegex.test(content.value)) {
    showToast('根据社区规范，发布内容禁止包含网页链接')
    return
  }

  // 提取上传成功的图片
  const images = fileList.value.filter(item => item.status === 'done' || item.url).map(item => item.url)

  try {
    showToast({ type: 'loading', message: isEdit.value ? '保存中...' : '发布中...', forbidClick: true, duration: 0 })
    let res
    if (isEdit.value) {
      res = await updatePost(postId.value, {
        storeId: storeId.value,
        title: title.value,
        content: content.value,
        category: category.value,
        images
      })
    } else {
      res = await publishPost({
        storeId: storeId.value,
        title: title.value,
        content: content.value,
        category: category.value,
        images
      })
    }
    
    if (res.success) {
      showToast(isEdit.value ? '修改成功' : '发布成功，请等待审核')
      setTimeout(() => {
        router.back()
      }, 1500)
    } else {
      showToast(res.message || '操作失败')
    }
  } catch (error) {
    showToast('操作异常')
  }
}
</script>

<template>
  <div class="post-publish-container bg-white min-h-screen">
    <van-nav-bar 
      :title="isEdit ? '编辑帖子' : '发布帖子'" 
      left-arrow 
      @click-left="router.back()" 
      fixed 
      placeholder 
    />

    <van-form @submit="onSubmit" class="mt-2">
      <van-field
        v-model="storeName"
        is-link
        readonly
        name="storePicker"
        label="相关门店"
        placeholder="选择相关门店"
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

      <!-- 帖子分类 (固定的，按照用户需求不允许自定义) -->
      <van-field
        v-model="category"
        is-link
        readonly
        name="category"
        label="帖子分类"
        placeholder="选择帖子分类"
        @click="showPicker = true"
      />
      <van-popup v-model:show="showPicker" position="bottom">
        <van-picker
          :columns="categoryColumns"
          @confirm="onConfirmCategory"
          @cancel="showPicker = false"
        />
      </van-popup>

      <van-field
        v-model="title"
        name="title"
        label="标题"
        placeholder="加个吸睛的标题吧"
        maxlength="40"
        :rules="[{ required: true, message: '请填写标题' }]"
      />
      
      <van-field
        v-model="content"
        rows="6"
        autosize
        label="正文"
        type="textarea"
        maxlength="300"
        placeholder="分享你的购物心得、评价商品..."
        show-word-limit
        :rules="[{ required: true, message: '请填写正文' }]"
        class="border-b border-gray-100"
      />
      
      <div class="p-4">
        <p class="text-sm text-gray-500 mb-2">添加图片 (可选)</p>
        <van-uploader 
          v-model="fileList" 
          :after-read="afterRead" 
          multiple 
          :max-count="9"
          class="mb-4"
        />
      </div>
      
      <div class="p-4 mt-4">
        <van-button round block type="primary" native-type="submit" class="bg-blue-600 shadow-md">
          {{ isEdit ? '保存修改' : '发布' }}
        </van-button>
      </div>
    </van-form>
  </div>
</template>
