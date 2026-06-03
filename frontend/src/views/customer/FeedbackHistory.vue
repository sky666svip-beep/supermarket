<!-- 模块：问题上报历史 -->
<script setup lang="ts">
// 模块：我的反馈记录（历史查看）
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { getFeedbackHistory } from '../../api/index'
import { showToast, showImagePreview } from 'vant'

const router = useRouter()
const records = ref<any[]>([])

onMounted(async () => {
  try {
    records.value = await getFeedbackHistory()
  } catch (e) {
    showToast('加载反馈记录失败')
  }
})

const getStatusTag = (status: string) => {
  const map: any = {
    pending: { type: 'danger', text: '待处理' },
    processing: { type: 'warning', text: '处理中' },
    resolved: { type: 'success', text: '已解决' }
  }
  return map[status] || map.pending
}

const showDetail = ref(false)
const detailItem = ref<any>(null)
const openDetail = (item: any) => {
  detailItem.value = item
  showDetail.value = true
}

const detailImages = computed(() => {
  if (!detailItem.value?.images) return []
  try { return JSON.parse(detailItem.value.images) } catch { return [] }
})

const previewImage = (images: string[], index: number) => {
  showImagePreview({
    images,
    startPosition: index
  })
}

const onDelete = async (id: number) => {
  import('vant').then(({ showConfirmDialog }) => {
    showConfirmDialog({
      title: '确认删除',
      message: '您确定要删除这条反馈工单吗？删除后无法恢复。',
    })
      .then(async () => {
        try {
          const { deleteFeedback } = await import('../../api/index')
          await deleteFeedback(id)
          showToast('删除成功')
          showDetail.value = false
          records.value = records.value.filter(r => r.id !== id)
        } catch (e: any) {
          showToast(e.response?.data?.error || '删除失败')
        }
      })
      .catch(() => {
        // Cancelled
      })
  })
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
          我的反馈记录
        </h1>
        <button type="button" @click="router.push('/customer/feedback/new')" class="flex items-center justify-center text-primary hover:bg-surface-container-low w-10 h-10 rounded-full transition-colors active:scale-95">
          <span class="material-symbols-outlined">add</span>
        </button>
      </div>
    </header>

    <main class="flex-1 w-full max-w-2xl mx-auto px-margin-mobile pt-4 pb-20 space-y-4">
      <div
        v-for="item in records"
        :key="item.id"
        class="bg-surface-container-lowest border border-surface-variant/50 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow active:scale-[0.99] cursor-pointer flex flex-col gap-3 relative overflow-hidden"
        @click="openDetail(item)"
      >
        <!-- Status indicator line on the left -->
        <div class="absolute left-0 top-0 bottom-0 w-1" :class="item.status === 'resolved' ? 'bg-[#10b981]' : (item.status === 'processing' ? 'bg-[#f59e0b]' : 'bg-[#ef4444]')"></div>
        
        <div class="flex justify-between items-start pl-2">
          <div class="flex flex-col gap-1">
            <h3 class="font-headline-sm text-base font-bold text-on-surface flex items-center gap-2">
              {{ item.facilityType }}
              <span v-if="item.storeName" class="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded-sm font-medium">{{ item.storeName }}</span>
            </h3>
          </div>
          <van-tag :type="getStatusTag(item.status).type" round size="medium" class="font-medium px-2 py-0.5 text-[10px]">
            {{ getStatusTag(item.status).text }}
          </van-tag>
        </div>
        
        <p class="text-sm text-on-surface-variant line-clamp-2 pl-2">{{ item.message }}</p>
        
        <div class="flex justify-between items-center mt-1 pt-3 border-t border-surface-variant/30 pl-2">
          <span class="text-xs text-on-surface-variant/70 font-medium">{{ new Date(item.createdAt).toLocaleString() }}</span>
          <span class="material-symbols-outlined text-[16px] text-on-surface-variant">chevron_right</span>
        </div>
      </div>

      <div v-if="records.length === 0" class="py-12 flex flex-col items-center justify-center text-center">
        <div class="w-32 h-32 mb-4 opacity-70">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full text-surface-variant"><path d="M20 4H4C2.89543 4 2 4.89543 2 6V18C2 19.1046 2.89543 20 4 20H20C21.1046 20 22 19.1046 22 18V6C22 4.89543 21.1046 4 20 4ZM20 18H4V6H20V18Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 12C12 12 13 14 16 14C19 14 20 12 20 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 12C4 12 5 14 8 14C11 14 12 12 12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <p class="text-sm text-on-surface-variant mb-6 font-medium">暂无反馈记录</p>
        <button @click="router.push('/customer/feedback/new')" class="bg-primary text-white px-6 py-2.5 rounded-full font-label-lg font-bold shadow-sm active:scale-95 transition-transform" style="color: #ffffff !important;">
          去提交反馈
        </button>
      </div>
    </main>

    <!-- Detail Popup -->
    <van-popup v-model:show="showDetail" position="bottom" round safe-area-inset-bottom :style="{ maxHeight: '90vh' }">
      <div v-if="detailItem" class="p-5 pb-8 flex flex-col gap-6">
        
        <div class="flex flex-col gap-2 relative">
          <div class="absolute right-0 top-0">
             <van-tag :type="getStatusTag(detailItem.status).type" round size="medium" class="font-medium">
              {{ getStatusTag(detailItem.status).text }}
            </van-tag>
          </div>
          <h3 class="font-headline-md text-xl font-bold text-on-surface pr-16">{{ detailItem.facilityType }}</h3>
          <p class="text-xs text-on-surface-variant font-medium">提交时间: {{ new Date(detailItem.createdAt).toLocaleString() }}</p>
        </div>

        <div class="flex flex-col gap-3">
          <h4 class="font-title-sm text-sm font-bold text-on-surface flex items-center gap-1.5 border-b border-surface-variant/30 pb-2">
            <span class="material-symbols-outlined text-[18px] text-primary">description</span> 反馈内容
          </h4>
          <p class="text-sm text-on-surface leading-relaxed whitespace-pre-wrap bg-surface-container-lowest p-4 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.02)] border border-surface-variant/50">{{ detailItem.message }}</p>
        </div>

        <div v-if="detailImages.length > 0" class="flex flex-col gap-3">
          <h4 class="font-title-sm text-sm font-bold text-on-surface flex items-center gap-1.5 border-b border-surface-variant/30 pb-2">
            <span class="material-symbols-outlined text-[18px] text-primary">image</span> 附带图片
          </h4>
          <div class="flex gap-3 flex-wrap">
            <div 
              v-for="(img, idx) in detailImages" 
              :key="idx" 
              class="w-20 h-20 rounded-xl overflow-hidden shadow-sm border border-surface-variant/50 cursor-pointer active:scale-95 transition-transform"
              @click="previewImage(detailImages, Number(idx))"
            >
              <van-image :src="img" width="100%" height="100%" fit="cover" />
            </div>
          </div>
        </div>

        <div class="flex flex-col gap-3">
          <h4 class="font-title-sm text-sm font-bold text-on-surface flex items-center gap-1.5 border-b border-surface-variant/30 pb-2">
            <span class="material-symbols-outlined text-[18px] text-primary">forum</span> 管理员回复
          </h4>
          <div v-if="detailItem.adminReply" class="bg-primary/5 border border-primary/20 p-4 rounded-xl text-sm text-on-surface shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
            {{ detailItem.adminReply }}
          </div>
          <p v-else class="text-sm text-on-surface-variant/70 italic bg-surface-container-lowest p-4 rounded-xl border border-surface-variant/50 text-center">暂无回复</p>
        </div>

        <div class="mt-4 flex justify-end" v-if="detailItem.status === 'resolved'">
          <button 
            @click="onDelete(detailItem.id)"
            class="text-error border border-error/50 bg-error/5 px-6 py-2 rounded-full font-label-md font-bold hover:bg-error/10 active:scale-95 transition-colors"
          >
            删除工单
          </button>
        </div>
      </div>
    </van-popup>
  </div>
</template>
