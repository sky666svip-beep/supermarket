<!-- 模块：问题上报历史 -->
<script setup lang="ts">
// 模块：我的反馈记录（历史查看）
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { getFeedbackHistory } from '../../api/index'
import { showToast } from 'vant'

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
  <div class="h-full flex flex-col bg-gray-50">
    <van-nav-bar
      title="我的反馈记录"
      left-text="返回"
      left-arrow
      @click-left="router.back()"
      class="flex-shrink-0"
    >
      <template #right>
        <van-icon name="plus" size="20" @click="router.push('/customer/feedback/new')" />
      </template>
    </van-nav-bar>

    <div class="flex-1 overflow-y-auto p-4 space-y-3 pb-20">
      <div
        v-for="item in records"
        :key="item.id"
        class="bg-white rounded-lg p-4 shadow-sm border-l-4 active:bg-gray-50"
        :class="item.status === 'resolved' ? 'border-green-500' : (item.status === 'processing' ? 'border-orange-400' : 'border-red-500')"
        @click="openDetail(item)"
      >
        <div class="flex justify-between items-center mb-2">
          <h3 class="font-bold text-gray-800 text-sm">
            {{ item.facilityType }}
            <span v-if="item.storeName" class="text-xs text-blue-500 font-normal ml-2 bg-blue-50 px-1 rounded">{{ item.storeName }}</span>
          </h3>
          <van-tag :type="getStatusTag(item.status).type" size="medium">
            {{ getStatusTag(item.status).text }}
          </van-tag>
        </div>
        <p class="text-sm text-gray-600 line-clamp-2">{{ item.message }}</p>
        <div class="flex justify-between items-center mt-2">
          <span class="text-xs text-gray-400">{{ new Date(item.createdAt).toLocaleString() }}</span>
          <van-icon name="arrow" size="14" color="#999" />
        </div>
      </div>

      <van-empty v-if="records.length === 0" description="暂无反馈记录">
        <van-button round type="primary" size="small" @click="router.push('/customer/feedback/new')">去提交反馈</van-button>
      </van-empty>
    </div>

    <!-- Detail Popup -->
    <van-popup v-model:show="showDetail" position="bottom" round :style="{ maxHeight: '85vh' }">
      <div v-if="detailItem" class="p-5">
        <h3 class="text-lg font-bold mb-1">{{ detailItem.facilityType }}</h3>
        <van-tag :type="getStatusTag(detailItem.status).type" class="mb-4">
          {{ getStatusTag(detailItem.status).text }}
        </van-tag>

        <van-divider content-position="left">反馈内容</van-divider>
        <p class="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded mb-3">{{ detailItem.message }}</p>

        <div v-if="detailImages.length > 0" class="mb-3">
          <p class="text-xs text-gray-500 mb-2">附带图片：</p>
          <div class="flex gap-2 flex-wrap">
            <van-image
              v-for="(img, idx) in detailImages"
              :key="idx"
              :src="img"
              width="80"
              height="80"
              fit="cover"
              radius="4"
              @click="() => {}"
            />
          </div>
        </div>

        <van-divider content-position="left">管理员回复</van-divider>
        <div v-if="detailItem.adminReply" class="bg-blue-50 border border-blue-200 p-3 rounded text-sm text-blue-800">
          <van-icon name="manager-o" class="mr-1" />{{ detailItem.adminReply }}
        </div>
        <p v-else class="text-sm text-gray-400">暂无回复</p>

        <div class="flex justify-between items-center mt-4">
          <van-button 
            v-if="detailItem.status === 'resolved'" 
            type="danger" 
            plain 
            size="small" 
            @click="onDelete(detailItem.id)"
          >
            删除工单
          </van-button>
          <p class="text-xs text-gray-400 text-right flex-1">提交时间: {{ new Date(detailItem.createdAt).toLocaleString() }}</p>
        </div>
      </div>
    </van-popup>
  </div>
</template>
