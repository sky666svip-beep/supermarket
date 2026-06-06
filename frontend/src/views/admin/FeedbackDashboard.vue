<script setup lang="ts">
// 模块：管理员工作台
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getAdminFeedbacks, updateAdminFeedbackStatus, replyAdminFeedback, deleteAdminFeedback } from '../../api'
import { getThumbnailUrl } from '../../utils/image'
import { showToast } from 'vant'

const router = useRouter()
const feedbacks = ref<any[]>([])

const fetchFeedbacks = async () => {
  try {
    const data = await getAdminFeedbacks()
    feedbacks.value = data.map((item: any) => {
      let parsedImages = []
      if (item.images) {
        try {
          parsedImages = typeof item.images === 'string' ? JSON.parse(item.images) : item.images
        } catch { /* ignore */ }
      }
      return { ...item, parsedImages }
    })
  } catch (e: any) {
    showToast(e.response?.data?.error || '加载数据失败')
  }
}

onMounted(() => {
  fetchFeedbacks()
})

const getStatusTag = (status: string) => {
  const map: any = {
    pending: { type: 'danger', text: '待处理' },
    processing: { type: 'warning', text: '处理中' },
    resolved: { type: 'success', text: '已解决' }
  }
  return map[status] || map.pending
}

const showAction = ref(false)
const currentItem = ref<any>(null)
const actions = [
  { name: '待处理', value: 'pending', color: '#ee0a24' },
  { name: '处理中', value: 'processing', color: '#ff976a' },
  { name: '已解决', value: 'resolved', color: '#07c160' }
]

const openAction = (item: any) => {
  currentItem.value = item
  showAction.value = true
}

const onSelect = async (action: any) => {
  showAction.value = false
  try {
    const res = await updateAdminFeedbackStatus(currentItem.value.id, action.value)
    if (res.error) {
      showToast(res.error)
      return
    }
    showToast('状态已更新')
    fetchFeedbacks()
  } catch (e: any) {
    showToast(e.response?.data?.error || '状态更新失败')
  }
}

// Reply dialog
const showReplyDialog = ref(false)
const replyText = ref('')
const replyTarget = ref<any>(null)

const openReply = (item: any) => {
  replyTarget.value = item
  replyText.value = item.adminReply || ''
  showReplyDialog.value = true
}

const onSaveReply = async () => {
  if (!replyText.value.trim()) {
    showToast('请输入回复内容')
    return false
  }
  try {
    const res = await replyAdminFeedback(replyTarget.value.id, replyText.value.trim())
    if (res.error) {
      showToast(res.error)
      return false
    }
    showToast('回复已保存')
    fetchFeedbacks()
    return true
  } catch (e: any) {
    showToast(e.response?.data?.error || '回复失败')
    return false
  }
}

// Image preview
const showImagePreview = ref(false)
const previewImages = ref<string[]>([])

const openImages = (images: string[] | string) => {
  try {
    previewImages.value = typeof images === 'string' ? JSON.parse(images) : images
    showImagePreview.value = true
  } catch { /* ignore */ }
}

const onDelete = (id: number) => {
  import('vant').then(({ showConfirmDialog }) => {
    showConfirmDialog({
      title: '确认删除',
      message: '确定要删除此工单吗？删除后不可恢复。'
    }).then(async () => {
      try {
        const res = await deleteAdminFeedback(id)
        if (res.error) {
          showToast(res.error)
          return
        }
        showToast('删除成功')
        fetchFeedbacks()
      } catch (e: any) {
        showToast(e.response?.data?.error || '删除失败')
      }
    }).catch(() => {})
  })
}
</script>

<template>
  <div class="h-full flex flex-col bg-gray-50">
    <van-nav-bar
      title="后台工单管理"
      left-text="返回"
      left-arrow
      @click-left="router.back()"
      class="flex-shrink-0"
    />
    <div class="flex-1 overflow-y-auto p-4 space-y-4 pb-20">
      <div v-for="item in feedbacks" :key="item.id" class="bg-white rounded-lg p-4 shadow-sm border-l-4" :class="item.status === 'resolved' ? 'border-green-500' : (item.status === 'processing' ? 'border-orange-400' : 'border-red-500')">
        <div class="flex justify-between items-start mb-2">
          <div>
            <h3 class="font-bold text-gray-800 text-base">{{ item.facilityType }}</h3>
            <p class="text-xs text-gray-400 mt-1">报告人: {{ item.nickname || item.username }}</p>
            <p v-if="item.storeName" class="text-xs text-blue-500 mt-1 flex items-center">
              <van-icon name="shop-o" class="mr-1" /> {{ item.storeName }}
            </p>
          </div>
          <van-tag :type="getStatusTag(item.status).type" size="medium" @click="openAction(item)">
            {{ getStatusTag(item.status).text }} <van-icon name="edit" class="ml-1" />
          </van-tag>
        </div>
        <p class="text-sm text-gray-700 mt-3 whitespace-pre-wrap bg-gray-50 p-2 rounded">{{ item.message }}</p>

        <!-- Images -->
        <div v-if="item.parsedImages && item.parsedImages.length > 0" class="mt-3">
          <p class="text-xs text-gray-500 mb-1">用户附图：</p>
          <div class="flex gap-2 flex-wrap">
            <van-image
              v-for="(img, idx) in item.parsedImages"
              :key="idx"
              :src="getThumbnailUrl(img)"
              width="60"
              height="60"
              fit="cover"
              radius="4"
              @click="openImages(item.parsedImages)"
            />
          </div>
        </div>

        <!-- Admin Reply -->
        <div v-if="item.adminReply" class="mt-3 bg-blue-50 border border-blue-200 p-2 rounded text-sm text-blue-800">
          <van-icon name="manager-o" class="mr-1" /><strong>回复：</strong>{{ item.adminReply }}
        </div>

        <div class="flex justify-between items-center mt-3">
          <p class="text-xs text-gray-400">{{ new Date(item.createdAt).toLocaleString() }}</p>
          <div class="flex gap-2">
            <van-button v-if="item.status === 'resolved'" size="mini" plain type="danger" icon="delete-o" @click="onDelete(item.id)">
              删除
            </van-button>
            <van-button size="mini" plain type="primary" icon="chat-o" @click="openReply(item)">
              {{ item.adminReply ? '修改回复' : '回复' }}
            </van-button>
          </div>
        </div>
      </div>
      
      <van-empty v-if="feedbacks.length === 0" description="暂无待处理工单" />
    </div>

    <van-action-sheet
      v-model:show="showAction"
      :actions="actions"
      cancel-text="取消"
      close-on-click-action
      @select="onSelect"
      description="请选择工单新的处理状态"
    />

    <van-dialog v-model:show="showReplyDialog" title="回复工单" show-cancel-button :before-close="(action: any) => action === 'confirm' ? onSaveReply() : true">
      <div class="p-4">
        <p class="text-xs text-gray-500 mb-2">工单: {{ replyTarget?.facilityType }}</p>
        <van-field v-model="replyText" rows="3" autosize type="textarea" placeholder="请输入回复内容（用户可见）" />
      </div>
    </van-dialog>

    <!-- Image Preview -->
    <van-image-preview v-model:show="showImagePreview" :images="previewImages" />
  </div>
</template>
