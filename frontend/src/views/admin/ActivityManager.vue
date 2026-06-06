<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showConfirmDialog } from 'vant'
import api from '../../api'

const router = useRouter()

interface Activity {
  id: number
  title: string
  content: string
  images: string | null
  startTime: string | null
  endTime: string | null
  isAllStores: boolean
  isActive: boolean
  createdAt: string
  storeIds: number[]
}

const activities = ref<Activity[]>([])
const stores = ref<any[]>([])
const loading = ref(false)

const fetchActivities = async () => {
  loading.value = true
  try {
    const res = await api.get('/admin/activities')
    activities.value = res.data.data || []
  } catch (error) {
    showToast('Failed to load activities')
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
  fetchActivities()
  fetchStores()
})

const showDialog = ref(false)
const isEditing = ref(false)

const formData = ref({
  id: 0,
  title: '',
  content: '',
  images: [] as any[],
  startTime: '',
  endTime: '',
  isAllStores: false,
  isActive: true,
  storeIds: [] as number[]
})

const showStoreSelector = ref(false)
const checkboxRefs = ref<any[]>([])

const toggleStore = (index: number) => {
  if (checkboxRefs.value[index]) {
    checkboxRefs.value[index].toggle()
  }
}

const openCreate = () => {
  isEditing.value = false
  formData.value = {
    id: 0,
    title: '',
    content: '',
    images: [],
    startTime: '',
    endTime: '',
    isAllStores: false,
    isActive: true,
    storeIds: []
  }
  showDialog.value = true
}

const formatDateLocal = (dateStr: string | null) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const openEdit = (act: Activity) => {
  isEditing.value = true
  let parsedImages = []
  try {
    if (act.images) {
      const urls = JSON.parse(act.images)
      parsedImages = urls.map((url: string) => ({ url, isImage: true }))
    }
  } catch (e) {}

  formData.value = {
    ...act,
    images: parsedImages,
    startTime: formatDateLocal(act.startTime),
    endTime: formatDateLocal(act.endTime),
    storeIds: act.storeIds ? [...act.storeIds] : []
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
    const uploadFormData = new FormData()
    uploadFormData.append('file', compressed)

    const res = await api.post('/upload', uploadFormData, { timeout: 40000 })
    file.status = 'done'
    file.url = res.data.url
  } catch (error: any) {
    file.status = 'failed'
    file.message = error?.response?.data?.error || error?.message || '上传失败'
    showToast(file.message)
  }
}

const saveActivity = async () => {
  if (!formData.value.title || !formData.value.content) {
    showToast('标题和内容为必填项')
    return false
  }

  const imageUrls = formData.value.images.map(img => img.url).filter(Boolean)
  
  const payload = {
    title: formData.value.title,
    content: formData.value.content,
    images: imageUrls.length ? imageUrls : null,
    startTime: formData.value.startTime ? new Date(formData.value.startTime).toISOString() : null,
    endTime: formData.value.endTime ? new Date(formData.value.endTime).toISOString() : null,
    isAllStores: formData.value.isAllStores,
    isActive: formData.value.isActive,
    storeIds: formData.value.storeIds
  }

  try {
    if (isEditing.value) {
      await api.put(`/admin/activities/${formData.value.id}`, payload)
      showToast('更新成功')
    } else {
      await api.post('/admin/activities', payload)
      showToast('创建成功')
    }
    showDialog.value = false
    fetchActivities()
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
      await api.delete(`/admin/activities/${id}`)
      showToast('删除成功')
      fetchActivities()
    } catch (error) {
      showToast('删除失败')
    }
  }).catch(() => {})
}

const toggleActive = async (act: Activity) => {
  try {
    await api.put(`/admin/activities/${act.id}`, { ...act, isActive: !act.isActive })
    showToast('状态已更新')
    fetchActivities()
  } catch (error) {
    showToast('更新失败')
  }
}

const getStoreNames = (ids: number[]) => {
  return ids.map(id => stores.value.find(s => s.id === id)?.name).filter(Boolean).join(', ')
}
</script>

<template>
  <div class="activity-manager" style="padding: 16px; background-color: #f7f8fa; min-height: 100vh;">
    <van-nav-bar 
      title="活动管理" 
      left-arrow 
      @click-left="router.push('/admin')" 
    />
    
    <div style="margin: 16px 0;">
      <van-button type="primary" block @click="openCreate">发布新活动</van-button>
    </div>

    <van-skeleton title :row="3" :loading="loading">
      <div v-if="activities.length === 0" style="text-align: center; color: #999; padding: 32px 0;">
        暂无活动
      </div>
      <div 
        v-for="act in activities" 
        :key="act.id" 
        style="background: #fff; border-radius: 8px; padding: 16px; margin-bottom: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);"
      >
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <h3 style="margin: 0; font-size: 16px; display: flex; align-items: center; gap: 8px;">
              {{ act.title }}
              <van-tag v-if="act.isAllStores" type="success">全门店</van-tag>
              <van-tag v-if="!act.isActive" type="warning">已下线</van-tag>
            </h3>
            <div style="font-size: 12px; color: #1989fa; margin-top: 4px;" v-if="!act.isAllStores && act.storeIds && act.storeIds.length > 0">
              📍 {{ getStoreNames(act.storeIds || []) }}
            </div>
            <p style="margin: 8px 0; font-size: 14px; color: #666; white-space: pre-wrap;">{{ act.content }}</p>
            
            <div style="font-size: 12px; color: #999; margin-bottom: 8px;">
              时间: {{ act.startTime ? new Date(act.startTime).toLocaleString() : '无限制' }} - {{ act.endTime ? new Date(act.endTime).toLocaleString() : '无限制' }}
            </div>
          </div>
        </div>

        <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 12px; border-top: 1px solid #eee; padding-top: 12px;">
          <van-button size="small" :type="act.isActive ? 'warning' : 'success'" @click="toggleActive(act)">
            {{ act.isActive ? '下线' : '上线' }}
          </van-button>
          <van-button size="small" type="primary" plain @click="openEdit(act)">编辑</van-button>
          <van-button size="small" type="danger" plain @click="confirmDelete(act.id)">删除</van-button>
        </div>
      </div>
    </van-skeleton>

    <van-dialog 
      v-model:show="showDialog" 
      :title="isEditing ? '编辑活动' : '发布新活动'" 
      show-cancel-button 
      :before-close="(action) => action === 'confirm' ? saveActivity() : true"
    >
      <van-form style="padding: 16px; max-height: 70vh; overflow-y: auto;">
        <van-field v-model="formData.title" label="标题" placeholder="请输入活动标题" required />
        <van-field v-model="formData.content" label="文案" type="textarea" rows="3" placeholder="请输入活动详情" required />
        
        <van-field name="uploader" label="活动配图">
          <template #input>
            <van-uploader v-model="formData.images" :after-read="afterRead" :max-count="9" multiple />
          </template>
        </van-field>

        <van-field label="开始时间">
          <template #input>
            <input type="datetime-local" v-model="formData.startTime" style="border: 1px solid #ebedf0; border-radius: 4px; padding: 4px; width: 100%;" />
          </template>
        </van-field>

        <van-field label="结束时间">
          <template #input>
            <input type="datetime-local" v-model="formData.endTime" style="border: 1px solid #ebedf0; border-radius: 4px; padding: 4px; width: 100%;" />
          </template>
        </van-field>

        <van-field label="全门店通用">
          <template #input>
            <van-switch v-model="formData.isAllStores" size="20" />
          </template>
        </van-field>

        <div v-if="!formData.isAllStores">
          <van-field
            is-link
            readonly
            label="选择店铺"
            :placeholder="formData.storeIds.length ? `已选择 ${formData.storeIds.length} 家店铺` : '点击选择'"
            @click="showStoreSelector = true"
          />
          <van-popup v-model:show="showStoreSelector" position="bottom" style="height: 50%;">
            <div style="padding: 16px;">
              <div style="font-weight: bold; margin-bottom: 16px;">选择关联店铺</div>
              <van-checkbox-group v-model="formData.storeIds">
                <van-cell-group>
                  <van-cell
                    v-for="(store, index) in stores"
                    clickable
                    :key="store.id"
                    :title="store.name"
                    @click="toggleStore(index)"
                  >
                    <template #right-icon>
                      <van-checkbox :name="store.id" :ref="el => checkboxRefs[index] = el" @click.stop />
                    </template>
                  </van-cell>
                </van-cell-group>
              </van-checkbox-group>
            </div>
          </van-popup>
        </div>

        <van-field label="是否上线">
          <template #input>
            <van-switch v-model="formData.isActive" size="20" />
          </template>
        </van-field>

      </van-form>
    </van-dialog>
  </div>
</template>
