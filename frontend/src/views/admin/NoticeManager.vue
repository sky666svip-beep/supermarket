<script setup lang="ts">
// 模块：公告与资讯管理
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showConfirmDialog } from 'vant'
import api from '../../api'

const router = useRouter()


interface Notice {
  id: number
  title: string
  content: string
  images: string | null
  isUrgent: boolean
  expiresAt: string | null
  isActive: boolean
  createdAt: string
}

const notices = ref<Notice[]>([])
const stores = ref<any[]>([])
const loading = ref(false)

const fetchNotices = async () => {
  loading.value = true
  try {
    const res = await api.get('/notice/admin')
    notices.value = res.data
  } catch (error) {
    showToast('Failed to load notices')
  } finally {
    loading.value = false
  }
}

const fetchStores = async () => {
  try {
    const res = await api.get('/admin/stores')
    stores.value = res.data
  } catch (e) {
    console.error('Failed to load stores', e)
  }
}

onMounted(() => {
  fetchNotices()
  fetchStores()
})

const storeColumns = computed(() => {
  return [
    { text: '全门店', value: null },
    ...stores.value.map(s => ({ text: s.name, value: s.id }))
  ]
})

const showDialog = ref(false)
const isEditing = ref(false)
const formData = ref({
  id: 0,
  storeId: null as number | null,
  storeName: '',
  title: '',
  content: '',
  images: [] as any[], // Using van-uploader format
  isUrgent: false,
  expiresAt: '',
  isActive: true
})

const showStorePicker = ref(false)
const onStoreConfirm = ({ selectedOptions }: any) => {
  formData.value.storeId = selectedOptions[0].value
  formData.value.storeName = selectedOptions[0].text
  showStorePicker.value = false
}

const openCreate = () => {
  isEditing.value = false
  formData.value = {
    id: 0,
    storeId: null,
    storeName: '',
    title: '',
    content: '',
    images: [],
    isUrgent: false,
    expiresAt: '',
    isActive: true
  }
  showDialog.value = true
}

const openEdit = (notice: Notice) => {
  isEditing.value = true
  
  let parsedImages = []
  try {
    if (notice.images) {
      const urls = JSON.parse(notice.images)
      parsedImages = urls.map((url: string) => ({ url, isImage: true }))
    }
  } catch (e) {
    // ignore
  }

  // format datetime to YYYY-MM-DDThh:mm
  let formattedDate = ''
  if (notice.expiresAt) {
    const d = new Date(notice.expiresAt)
    const pad = (n: number) => n.toString().padStart(2, '0')
    formattedDate = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  formData.value = {
    ...notice,
    storeId: (notice as any).storeId || null,
    storeName: (notice as any).storeName || '',
    images: parsedImages,
    expiresAt: formattedDate
  }
  showDialog.value = true
}

const afterRead = async (file: any) => {
  file.status = 'uploading'
  file.message = '压缩中...'

  try {
    const { compressImage } = await import('../../utils/compress')
    const compressed = await compressImage(file.file)

    file.message = '上传中...'
    const formData = new FormData()
    formData.append('file', compressed)

    const res = await api.post('/upload', formData, { timeout: 40000 })
    file.status = 'done'
    file.url = res.data.url
  } catch (error: any) {
    file.status = 'failed'
    file.message = error?.response?.data?.error || error?.message || '上传失败'
    showToast(file.message)
  }
}

const saveNotice = async () => {
  if (!formData.value.title || !formData.value.content || formData.value.storeName === '') {
    showToast('标题、内容和店铺为必填项')
    return false
  }

  const imageUrls = formData.value.images.map(img => img.url).filter(Boolean)
  
  const payload = {
    title: formData.value.title,
    content: formData.value.content,
    storeId: formData.value.storeId,
    images: imageUrls.length ? imageUrls : null,
    isUrgent: formData.value.isUrgent,
    expiresAt: formData.value.expiresAt ? new Date(formData.value.expiresAt).toISOString() : null,
    isActive: formData.value.isActive
  }

  try {
    if (isEditing.value) {
      await api.put(`/notice/${formData.value.id}`, payload)
      showToast('更新成功')
    } else {
      await api.post('/notice', payload)
      showToast('创建成功')
    }
    showDialog.value = false
    fetchNotices()
    return true
  } catch (error) {
    showToast('保存失败')
    return false
  }
}

const confirmDelete = (id: number) => {
  showConfirmDialog({
    title: '确认删除',
    message: '删除后无法恢复，确定要删除吗？'
  }).then(async () => {
    try {
      await api.delete(`/notice/${id}`)
      showToast('删除成功')
      fetchNotices()
    } catch (error) {
      showToast('删除失败')
    }
  }).catch(() => {})
}

// Toggle active status quickly
const toggleActive = async (notice: Notice) => {
  try {
    await api.put(`/notice/${notice.id}`, { isActive: !notice.isActive })
    showToast('状态已更新')
    fetchNotices()
  } catch (error) {
    showToast('更新失败')
  }
}

</script>

<template>
  <div class="notice-manager" style="padding: 16px; background-color: #f7f8fa; min-height: 100vh;">
    <van-nav-bar 
      title="公告管理" 
      left-arrow 
      @click-left="router.push('/admin')" 
    />
    
    <div style="margin: 16px 0;">
      <van-button type="primary" block @click="openCreate">发布新公告</van-button>
    </div>

    <van-skeleton title :row="3" :loading="loading">
      <div v-if="notices.length === 0" style="text-align: center; color: #999; padding: 32px 0;">
        暂无公告
      </div>
      <div 
        v-for="notice in notices" 
        :key="notice.id" 
        style="background: #fff; border-radius: 8px; padding: 16px; margin-bottom: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);"
      >
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <h3 style="margin: 0; font-size: 16px; display: flex; align-items: center; gap: 8px;">
              {{ notice.title }}
              <van-tag v-if="notice.isUrgent" type="danger">紧急/横幅</van-tag>
              <van-tag v-if="!notice.isActive" type="warning">已下线</van-tag>
            </h3>
            <div style="font-size: 12px; color: #1989fa; margin-top: 4px;" v-if="(notice as any).storeName">
              📍 {{(notice as any).storeName}}
            </div>
            <p style="margin: 8px 0; font-size: 14px; color: #666; white-space: pre-wrap;">{{ notice.content }}</p>
            
            <div v-if="notice.expiresAt" style="font-size: 12px; color: #999; margin-bottom: 8px;">
              过期时间: {{ new Date(notice.expiresAt).toLocaleString() }}
            </div>
          </div>
        </div>

        <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 12px; border-top: 1px solid #eee; padding-top: 12px;">
          <van-button size="small" :type="notice.isActive ? 'warning' : 'success'" @click="toggleActive(notice)">
            {{ notice.isActive ? '下线' : '上线' }}
          </van-button>
          <van-button size="small" type="primary" plain @click="openEdit(notice)">编辑</van-button>
          <van-button size="small" type="danger" plain @click="confirmDelete(notice.id)">删除</van-button>
        </div>
      </div>
    </van-skeleton>

    <!-- Create/Edit Dialog -->
    <van-dialog 
      v-model:show="showDialog" 
      :title="isEditing ? '编辑公告' : '发布新公告'" 
      show-cancel-button 
      :before-close="(action) => action === 'confirm' ? saveNotice() : true"
    >
      <van-form style="padding: 16px;">
        <van-field
          v-model="formData.storeName"
          is-link
          readonly
          label="选择店铺"
          placeholder="请选择"
          required
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
          v-model="formData.title"
          label="标题"
          placeholder="请输入标题"
          required
        />
        <van-field
          v-model="formData.content"
          label="内容"
          type="textarea"
          rows="3"
          placeholder="请输入公告详情"
          required
        />
        <van-field name="uploader" label="附图 (最多3张)">
          <template #input>
            <van-uploader v-model="formData.images" :after-read="afterRead" :max-count="3" />
          </template>
        </van-field>
        <van-field label="紧急横幅">
          <template #input>
            <van-switch v-model="formData.isUrgent" size="20" />
            <span style="font-size: 12px; color: #999; margin-left: 8px;">开启后将在前台首页顶部横幅显示</span>
          </template>
        </van-field>
        <van-field label="过期时间">
          <template #input>
            <input type="datetime-local" v-model="formData.expiresAt" style="border: 1px solid #ebedf0; border-radius: 4px; padding: 4px; width: 100%;" />
          </template>
        </van-field>
        <div v-if="isEditing">
          <van-field label="是否上线">
            <template #input>
              <van-switch v-model="formData.isActive" size="20" />
            </template>
          </van-field>
        </div>
      </van-form>
    </van-dialog>
  </div>
</template>
