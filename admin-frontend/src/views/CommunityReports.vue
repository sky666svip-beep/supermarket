<script setup lang="ts">
// 模块：社区举报处理
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getAdminReports, updateReportStatus, deleteAdminReport } from '../api'
import { showToast, showConfirmDialog } from 'vant'

const router = useRouter()
const activeTab = ref('pending')
const reports = ref<any[]>([])
const loading = ref(false)

const loadReports = async () => {
  loading.value = true
  try {
    const res = await getAdminReports()
    if (res.success) {
      if (activeTab.value === 'pending') {
        reports.value = res.data.filter((r: any) => r.report.status === 'pending')
      } else {
        reports.value = res.data.filter((r: any) => r.report.status !== 'pending')
      }
    } else {
      showToast(res.message || '获取失败')
    }
  } catch (error) {
    showToast('获取异常')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadReports()
})

const onTabChange = () => {
  loadReports()
}

const handleProcess = (id: number, status: string, actionDesc: string) => {
  showConfirmDialog({
    title: '处理举报',
    message: `确定要标记为【${actionDesc}】吗？${status === 'resolved' ? '（帖子若达3次举报已被自动下架）' : ''}`,
  }).then(async () => {
    try {
      const res = await updateReportStatus(id, status)
      if (res.success) {
        showToast('处理成功')
        loadReports()
      }
    } catch (error) {
      showToast('操作失败')
    }
  }).catch(() => {})
}

const handleDelete = (id: number) => {
  showConfirmDialog({
    title: '删除举报',
    message: '确定要删除这条举报记录吗？此操作不可恢复。',
  }).then(async () => {
    try {
      const res = await deleteAdminReport(id)
      if (res.success) {
        showToast('删除成功')
        loadReports()
      }
    } catch (error) {
      showToast('删除失败')
    }
  }).catch(() => {})
}
</script>

<template>
  <div class="admin-reports-container min-h-screen bg-gray-50 pb-4">
    <van-nav-bar title="举报管理" left-arrow @click-left="router.back()" fixed placeholder />
    
    <van-tabs v-model:active="activeTab" @change="onTabChange" sticky offset-top="46">
      <van-tab title="待处理" name="pending"></van-tab>
      <van-tab title="已处理" name="processed"></van-tab>
    </van-tabs>

    <van-loading v-if="loading" class="mt-10 text-center" />
    
    <div v-else-if="reports.length === 0" class="mt-20 text-center text-gray-400">
      <van-empty description="暂无举报数据" />
    </div>
    
    <div v-else class="p-3">
      <div v-for="item in reports" :key="item.report.id" class="bg-white rounded-lg p-4 mb-3 shadow-sm border border-gray-100">
        <div class="flex justify-between items-center mb-2">
          <van-tag type="danger">举报类型: {{ item.report.reason }}</van-tag>
          <span class="text-xs text-gray-400">{{ new Date(item.report.createdAt).toLocaleString() }}</span>
        </div>
        
        <div class="bg-gray-50 p-2 text-sm text-gray-800 mb-3 rounded">
          <strong>举报说明:</strong> {{ item.report.description || '无详细说明' }}
        </div>
        
        <div class="border border-dashed border-gray-300 p-2 mb-3 rounded">
          <div class="text-xs text-gray-500 mb-1">被举报对象 ({{ item.report.targetType === 'post' ? '帖子' : '评论' }} ID: {{ item.report.targetId }})</div>
          <div class="text-sm line-clamp-2" v-if="item.targetPost">
            <strong>帖子: </strong>{{ item.targetPost.title }}
          </div>
          <div class="text-sm line-clamp-2" v-if="item.targetComment">
            <strong>评论: </strong>{{ item.targetComment.content }}
          </div>
        </div>
        
        <div class="flex justify-end gap-2" v-if="item.report.status === 'pending'">
          <van-button size="small" type="primary" plain @click="handleProcess(item.report.id, 'rejected', '无效举报')">无效举报</van-button>
          <van-button size="small" type="danger" @click="handleProcess(item.report.id, 'resolved', '举报属实')">举报属实</van-button>
          <van-button size="small" type="default" @click="handleDelete(item.report.id)">删除</van-button>
        </div>
        <div v-else class="flex justify-between items-center mt-2">
          <span class="text-sm text-gray-500">
            状态: <span :class="item.report.status === 'resolved' ? 'text-red-500' : 'text-green-500'">{{ item.report.status === 'resolved' ? '已按属实处理 (内容已隐藏/删除)' : '已标记为无效' }}</span>
          </span>
          <van-button size="small" type="default" @click="handleDelete(item.report.id)">删除记录</van-button>
        </div>
      </div>
    </div>
  </div>
</template>
