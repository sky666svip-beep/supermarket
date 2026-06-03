<!-- 模块：发布帖子 -->
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
    const id = parseInt(route.query.id as string)
    if (!isNaN(id)) {
      isEdit.value = true
      postId.value = id
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
            try {
              const imgs = JSON.parse(p.images)
              if (Array.isArray(imgs)) {
                fileList.value = imgs.map((url: string) => ({ url, status: 'done', isImage: true }))
              }
            } catch (e) {}
          }
        } else {
          showToast('获取帖子失败')
        }
      } catch(e) {
        showToast('获取异常')
      }
      closeToast()
    }
  }
})

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
  const images = fileList.value.filter(item => item.status === 'done' && item.url).map(item => item.url)

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
  <div class="bg-background text-on-background min-h-screen font-body-md selection:bg-primary-container selection:text-white flex flex-col">
    <!-- Top App Bar -->
    <header class="bg-surface w-full top-0 sticky flex flex-col z-20 shadow-sm transition-colors">
      <div class="flex items-center justify-between px-margin-mobile h-16 w-full max-w-2xl mx-auto">
        <button type="button" @click="router.back()" class="flex items-center justify-center text-primary hover:bg-surface-container-low w-10 h-10 rounded-full transition-colors active:scale-95">
          <span class="material-symbols-outlined">arrow_back_ios_new</span>
        </button>
        <h1 class="font-headline-sm text-headline-sm font-bold text-on-surface absolute left-1/2 transform -translate-x-1/2 truncate max-w-[50%] text-center">
          {{ isEdit ? '编辑帖子' : '发布帖子' }}
        </h1>
        <div class="w-10 h-10"></div>
      </div>
    </header>

    <main class="flex-1 w-full max-w-2xl mx-auto px-margin-mobile pt-4 pb-12">
      <form @submit.prevent="onSubmit" class="flex flex-col gap-5">
        
        <!-- Store Picker Trigger -->
        <div class="flex flex-col gap-1.5">
          <label class="font-label-md text-sm text-on-surface-variant px-1">相关门店</label>
          <button 
            type="button" 
            @click="showStorePicker = true"
            class="w-full bg-surface-container-lowest border border-surface-variant/50 rounded-xl p-4 flex items-center justify-between shadow-[0_2px_8px_rgba(0,0,0,0.02)] active:scale-[0.99] transition-transform"
          >
            <span :class="storeName ? 'text-on-surface' : 'text-on-surface-variant opacity-70'">
              {{ storeName || '选择相关门店' }}
            </span>
            <span class="material-symbols-outlined text-on-surface-variant">chevron_right</span>
          </button>
        </div>
        <van-popup v-model:show="showStorePicker" position="bottom" round safe-area-inset-bottom>
          <van-picker :columns="storeColumns" @confirm="onStoreConfirm" @cancel="showStorePicker = false" />
        </van-popup>

        <!-- Category Picker Trigger -->
        <div class="flex flex-col gap-1.5">
          <label class="font-label-md text-sm text-on-surface-variant px-1">帖子分类</label>
          <button 
            type="button" 
            @click="showPicker = true"
            class="w-full bg-surface-container-lowest border border-surface-variant/50 rounded-xl p-4 flex items-center justify-between shadow-[0_2px_8px_rgba(0,0,0,0.02)] active:scale-[0.99] transition-transform"
          >
            <span :class="category ? 'text-on-surface' : 'text-on-surface-variant opacity-70'">
              {{ category || '选择帖子分类' }}
            </span>
            <span class="material-symbols-outlined text-on-surface-variant">chevron_right</span>
          </button>
        </div>
        <van-popup v-model:show="showPicker" position="bottom" round safe-area-inset-bottom>
          <van-picker :columns="categoryColumns" @confirm="onConfirmCategory" @cancel="showPicker = false" />
        </van-popup>

        <!-- Title Input -->
        <div class="flex flex-col gap-1.5">
          <label class="font-label-md text-sm text-on-surface-variant px-1">标题</label>
          <input 
            v-model="title"
            type="text"
            maxlength="20"
            placeholder="加个精彩的标题吧"
            class="w-full bg-surface-container-lowest border border-surface-variant/50 rounded-xl p-4 text-on-surface font-body-md placeholder:text-on-surface-variant/50 shadow-[0_2px_8px_rgba(0,0,0,0.02)] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
          />
        </div>

        <!-- Content Input -->
        <div class="flex flex-col gap-1.5">
          <div class="flex items-center justify-between px-1">
            <label class="font-label-md text-sm text-on-surface-variant">正文</label>
            <span class="text-xs text-on-surface-variant/70">{{ content.length }}/300</span>
          </div>
          <textarea 
            v-model="content"
            rows="6"
            maxlength="300"
            placeholder="分享你的购物心得、评价商品..."
            class="w-full bg-surface-container-lowest border border-surface-variant/50 rounded-xl p-4 text-on-surface font-body-md placeholder:text-on-surface-variant/50 shadow-[0_2px_8px_rgba(0,0,0,0.02)] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors resize-none"
          ></textarea>
        </div>

        <!-- Image Uploader -->
        <div class="flex flex-col gap-1.5 bg-surface-container-lowest border border-surface-variant/50 rounded-xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
          <label class="font-label-md text-sm text-on-surface-variant mb-2">添加图片 (可选)</label>
          <van-uploader 
            v-model="fileList" 
            :after-read="afterRead" 
            multiple 
            :max-count="9"
          />
        </div>

        <!-- Submit Button -->
        <div class="mt-4">
          <button 
            type="submit" 
            class="w-full bg-primary text-white py-3.5 rounded-full font-headline-sm text-base font-bold shadow-md active:scale-[0.98] transition-transform"
            style="color: #ffffff !important;"
          >
            {{ isEdit ? '保存修改' : '发布' }}
          </button>
        </div>
      </form>
    </main>
  </div>
</template>
