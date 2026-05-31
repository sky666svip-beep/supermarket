<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getNotices } from '../api'

const router = useRouter()

export interface Notice {
  id: number
  title: string
  content: string
  images: string | null
  isUrgent: boolean
  expiresAt: string | null
  createdAt: string
}

const urgentNotices = ref<Notice[]>([])
const normalNotices = ref<Notice[]>([])

onMounted(async () => {
  try {
    const res = await getNotices()
    urgentNotices.value = res.filter((n: Notice) => n.isUrgent)
    normalNotices.value = res.filter((n: Notice) => !n.isUrgent)
  } catch (e) {
    console.error('Failed to load notices', e)
  }
})

const showNoticeDialog = ref(false)
const currentNotice = ref<Notice | null>(null)

const openNotice = (notice: Notice) => {
  currentNotice.value = notice
  showNoticeDialog.value = true
}

const getImages = (imagesStr: string | null) => {
  if (!imagesStr) return []
  try { return JSON.parse(imagesStr) } catch { return [] }
}
</script>

<template>
  <div class="space-y-4">
    <!-- 紧急横幅通知 -->
    <van-notice-bar
      v-if="urgentNotices && urgentNotices.length > 0"
      left-icon="volume-o"
      :text="urgentNotices.map((n) => n.title + ': ' + n.content).join('  |  ')"
      mode="link"
      @click="openNotice(urgentNotices[0])"
      class="mb-2"
    />

    <div class="bg-white p-4 rounded-lg shadow-sm" :class="{ 'mt-2': urgentNotices && urgentNotices.length > 0 }">
      <h2 class="text-lg font-bold mb-2">欢迎来到商场助手</h2>
      <p class="text-gray-500 text-sm">提供门店查询、购物清单和问题上报功能。</p>
    </div>
    
    <van-grid :column-num="4" :border="false" class="bg-white rounded-lg overflow-hidden shadow-sm">
      <van-grid-item icon="shop-o" text="门店查询" @click="router.push('/customer/stores')" />
      <van-grid-item icon="orders-o" text="购物清单" @click="router.push('/customer/checklist')" />
      <van-grid-item icon="goods-collect-o" text="商品备忘" @click="router.push('/customer/memos')" />
      <van-grid-item icon="warning-o" text="问题上报" @click="router.push('/customer/feedback')" />
    </van-grid>

    <!-- 最新动态 (普通公告) -->
    <van-cell-group inset title="最新动态" class="!mx-0 !mt-6" v-if="normalNotices.length > 0">
      <van-cell 
        v-for="notice in normalNotices" 
        :key="notice.id"
        :title="notice.title" 
        :label="notice.content.substring(0, 30) + (notice.content.length > 30 ? '...' : '')" 
        is-link 
        @click="openNotice(notice)"
      />
    </van-cell-group>
    
    <van-cell-group inset title="热门活动" class="!mx-0 !mt-6">
      <van-cell title="周末特惠" label="一楼中庭，全场8折" value="查看详情" is-link />
      <van-cell title="新店开业" label="负一楼B102，星巴克臻选" value="查看详情" is-link />
    </van-cell-group>

    <!-- 公告详情弹窗 -->
    <van-dialog v-model:show="showNoticeDialog" :title="currentNotice?.title" confirm-button-text="知道了">
      <div class="p-4 max-h-[60vh] overflow-y-auto">
        <p class="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{{ currentNotice?.content }}</p>
        <div v-if="currentNotice && getImages(currentNotice.images).length > 0" class="mt-4 space-y-2">
          <img 
            v-for="(img, idx) in getImages(currentNotice.images)" 
            :key="idx" 
            :src="img" 
            class="w-full rounded-md object-cover"
          />
        </div>
        <div class="mt-4 text-xs text-gray-400 text-right">
          发布时间: {{ currentNotice ? new Date(currentNotice.createdAt).toLocaleDateString() : '' }}
        </div>
      </div>
    </van-dialog>
  </div>
</template>
