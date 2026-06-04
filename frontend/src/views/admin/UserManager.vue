<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showConfirmDialog } from 'vant'
import request from '../../api/index'

const router = useRouter()
const users = ref<any[]>([])
const loading = ref(false)
const finished = ref(false)
const page = ref(1)
const limit = 10
const search = ref('')
let debounceTimer: any = null

const showBanActions = ref(false)
const showCustomBan = ref(false)
const customBanDays = ref('')
const selectedUserIndex = ref<number | null>(null)

const banActions = [
  { name: '封禁 1 天', value: 1 },
  { name: '封禁 3 天', value: 3 },
  { name: '封禁 7 天', value: 7 },
  { name: '自定义时长', value: 'custom' },
  { name: '永久封禁', value: null, color: '#ee0a24' },
]

const showEditPopup = ref(false)
const editForm = ref({
  id: 0,
  username: '',
  password: ''
})

const onLoad = async () => {
  try {
    const res = await request.get('/admin/users', {
      params: {
        page: page.value,
        limit,
        search: search.value
      }
    })
    
    if (res.data.success) {
      if (page.value === 1) {
        users.value = res.data.data.list
      } else {
        users.value.push(...res.data.data.list)
      }
      
      if (users.value.length >= res.data.data.total) {
        finished.value = true
      } else {
        page.value++
      }
    }
  } catch (error) {
    showToast('获取数据失败')
    finished.value = true
  } finally {
    loading.value = false
  }
}

const onSearch = () => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    page.value = 1
    finished.value = false
    users.value = []
    loading.value = true
    onLoad()
  }, 300)
}

const toggleBan = async (index: number) => {
  const user = users.value[index]
  if (user.isBanned) {
    try {
      await showConfirmDialog({
        title: '提示',
        message: `确定要解封用户 ${user.username} 吗？`
      })
      const res = await request.post(`/admin/users/${user.id}/ban`, { isBanned: false })
      if (res.data.success) {
        showToast(res.data.message)
        users.value[index] = { ...user, isBanned: false, bannedUntil: null }
      } else {
        showToast(res.data.message || '操作失败')
      }
    } catch (e) {
      // canceled
    }
  } else {
    selectedUserIndex.value = index
    showBanActions.value = true
  }
}

const onBanSelect = (action: any) => {
  showBanActions.value = false
  if (action.value === 'custom') {
    customBanDays.value = ''
    showCustomBan.value = true
  } else {
    executeBan(action.value)
  }
}

const confirmCustomBan = () => {
  const days = parseInt(customBanDays.value)
  if (isNaN(days) || days <= 0) {
    showToast('请输入有效的天数')
    return
  }
  executeBan(days)
}

const executeBan = async (days: number | null) => {
  if (selectedUserIndex.value === null) return
  const index = selectedUserIndex.value
  const user = users.value[index]
  try {
    const res = await request.post(`/admin/users/${user.id}/ban`, { isBanned: true, durationDays: days })
    if (res.data.success) {
      showToast(res.data.message)
      // refresh the current page to get the updated bannedUntil from backend
      onSearch()
    } else {
      showToast(res.data.message || '操作失败')
    }
  } catch (error) {
    showToast('操作失败')
  }
}

const formatBannedUntil = (dateStr: string) => {
  if (!dateStr) return '永久封禁'
  const date = new Date(dateStr)
  return `封禁至: ${date.getFullYear()}-${String(date.getMonth()+1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

const deleteUser = async (user: any) => {
  try {
    await showConfirmDialog({
      title: '危险操作',
      message: `确定要彻底物理删除用户 ${user.username} 吗？相关级联数据将一并被删除，此操作不可恢复！`
    })
    
    const res = await request.delete(`/admin/users/${user.id}`)
    if (res.data.success) {
      showToast('删除成功')
      onSearch()
    } else {
      showToast(res.data.message || '删除失败')
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      showToast('删除失败')
    }
  }
}

const openEdit = (user: any) => {
  editForm.value = {
    id: user.id,
    username: user.username,
    password: ''
  }
  showEditPopup.value = true
}

const saveEdit = async () => {
  if (!editForm.value.username) {
    return showToast('用户名不能为空')
  }
  
  try {
    const res = await request.put(`/admin/users/${editForm.value.id}`, {
      username: editForm.value.username,
      password: editForm.value.password || undefined
    })
    
    if (res.data.success) {
      showToast('修改成功')
      showEditPopup.value = false
      onSearch()
    } else {
      showToast(res.data.message || '修改失败')
    }
  } catch (error: any) {
    showToast(error.response?.data?.message || '修改失败')
  }
}

onMounted(() => {
  // First load is triggered by van-list
})
</script>

<template>
  <div class="bg-surface min-h-screen pb-safe">
    <!-- Header -->
    <header class="bg-surface-container-lowest border-b border-surface/10 px-4 py-3 flex items-center justify-center relative shadow-sm sticky top-0 z-10">
      <button 
        @click="router.push('/admin')" 
        class="absolute left-4 p-2 text-primary hover:bg-surface-container-low rounded-full transition-colors flex items-center justify-center"
      >
        <van-icon name="arrow-left" class="text-lg" />
      </button>
      <h1 class="text-lg font-semibold text-on-surface">用户管理</h1>
    </header>

    <div class="p-3">
      <van-search
        v-model="search"
        placeholder="搜索用户名或昵称"
        @search="onSearch"
        @clear="onSearch"
        shape="round"
      />
    </div>

    <!-- Main Content -->
    <main class="px-3 pb-8">
      <van-list
        v-model:loading="loading"
        :finished="finished"
        finished-text="没有更多了"
        @load="onLoad"
      >
        <div v-for="(user, index) in users" :key="user.id" class="bg-surface-container-lowest p-4 mb-3 rounded-xl shadow-sm border border-surface/10">
          <div class="flex justify-between items-start mb-2">
            <div>
              <div class="font-semibold text-base flex items-center gap-2">
                {{ user.username }}
                <van-tag :type="user.role === 'admin' ? 'danger' : (user.role === 'staff' ? 'primary' : 'success')">
                  {{ user.role === 'admin' ? '管理员' : (user.role === 'staff' ? '员工' : '普通用户') }}
                </van-tag>
                <van-tag v-if="user.isBanned" type="warning">封禁中</van-tag>
              </div>
              <div class="text-sm text-gray-500 mt-1">昵称: {{ user.nickname || '未设置' }}</div>
              <div v-if="user.isBanned" class="text-xs text-red-500 mt-1">{{ formatBannedUntil(user.bannedUntil) }}</div>
            </div>
            <div class="text-xs text-gray-400">
              ID: {{ user.id }}
            </div>
          </div>
          
          <!-- Actions -->
          <div class="flex justify-end gap-2 mt-3 pt-3 border-t border-gray-100">
            <van-button size="small" type="primary" plain @click="openEdit(user)">编辑</van-button>
            <van-button 
              size="small" 
              :type="user.isBanned ? 'success' : 'warning'" 
              plain 
              @click="toggleBan(index)"
              :disabled="user.role === 'admin'"
            >
              {{ user.isBanned ? '解封' : '封禁' }}
            </van-button>
            <van-button 
              size="small" 
              type="danger" 
              plain 
              @click="deleteUser(user)"
              :disabled="user.role === 'admin'"
            >
              删除
            </van-button>
          </div>
        </div>
      </van-list>
    </main>

    <!-- Edit Popup -->
    <van-popup v-model:show="showEditPopup" round position="bottom" :style="{ height: '50%' }">
      <div class="p-4 flex flex-col h-full">
        <h2 class="text-lg font-semibold mb-4 text-center">编辑用户信息</h2>
        <div class="flex-1 overflow-y-auto">
          <van-field
            v-model="editForm.username"
            label="用户名"
            placeholder="请输入用户名"
            required
            class="mb-3 border rounded-lg"
          />
          <van-field
            v-model="editForm.password"
            label="新密码"
            type="password"
            placeholder="留空则不修改密码"
            class="mb-3 border rounded-lg"
          />
        </div>
        <div class="mt-auto pt-4 flex gap-3">
          <van-button block plain @click="showEditPopup = false">取消</van-button>
          <van-button block type="primary" @click="saveEdit">保存</van-button>
        </div>
      </div>
    </van-popup>

    <!-- Ban Action Sheet -->
    <van-action-sheet
      v-model:show="showBanActions"
      :actions="banActions"
      cancel-text="取消"
      description="选择封禁时长"
      @select="onBanSelect"
      close-on-click-action
    />

    <!-- Custom Ban Dialog -->
    <van-dialog 
      v-model:show="showCustomBan" 
      title="自定义封禁天数" 
      show-cancel-button 
      @confirm="confirmCustomBan"
    >
      <div class="p-4">
        <van-field 
          v-model="customBanDays" 
          type="digit" 
          placeholder="请输入封禁天数" 
          class="border rounded-lg"
          center
        >
          <template #button>天</template>
        </van-field>
      </div>
    </van-dialog>
  </div>
</template>
