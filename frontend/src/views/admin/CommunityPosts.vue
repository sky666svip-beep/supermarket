<script setup lang="ts">
// 模块：社区帖子管理
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getAdminPosts, updatePostStatus, updatePostAttributes } from '../../api'
import { getThumbnailUrl, SMALL_THUMB_PARAMS } from '../../utils/image'
import { showToast, showConfirmDialog } from 'vant'

const router = useRouter()
const activeTab = ref('pending')
const posts = ref<any[]>([])
const loading = ref(false)

const loadPosts = async () => {
  loading.value = true
  try {
    const res = await getAdminPosts(activeTab.value === 'all' ? undefined : activeTab.value)
    if (res.success) {
      posts.value = res.data.map((item: any) => {
        let parsedImages = []
        if (item.post.images) {
          try {
            parsedImages = typeof item.post.images === 'string' ? JSON.parse(item.post.images) : item.post.images
          } catch (e) {
            console.error('Failed to parse images', e)
          }
        }
        item.post.parsedImages = parsedImages
        return item
      })
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
  loadPosts()
})

const onTabChange = () => {
  loadPosts()
}

const handleApprove = async (id: number) => {
  try {
    const res = await updatePostStatus(id, 'approved')
    if (res.success) {
      showToast('已通过审核')
      loadPosts()
    }
  } catch (error) {
    showToast('操作失败')
  }
}

const handleReject = (id: number) => {
  showConfirmDialog({
    title: '拒绝帖子',
    message: '确定要拒绝该帖子并将其下架吗？',
  }).then(async () => {
    try {
      const res = await updatePostStatus(id, 'rejected')
      if (res.success) {
        showToast('已拒绝')
        loadPosts()
      }
    } catch (error) {
      showToast('操作失败')
    }
  }).catch(() => {})
}

const toggleTop = async (item: any) => {
  try {
    const res = await updatePostAttributes(item.post.id, { isTop: !item.post.isTop })
    if (res.success) {
      item.post.isTop = !item.post.isTop
      showToast(item.post.isTop ? '已置顶' : '已取消置顶')
    }
  } catch (error) {
    showToast('操作失败')
  }
}

const toggleElite = async (item: any) => {
  try {
    const res = await updatePostAttributes(item.post.id, { isElite: !item.post.isElite })
    if (res.success) {
      item.post.isElite = !item.post.isElite
      showToast(item.post.isElite ? '已加精' : '已取消加精')
    }
  } catch (error) {
    showToast('操作失败')
  }
}
</script>

<template>
  <div class="admin-posts-container min-h-screen bg-gray-50 pb-4">
    <van-nav-bar title="帖子审核与管理" left-arrow @click-left="router.back()" fixed placeholder />
    
    <van-tabs v-model:active="activeTab" @change="onTabChange" sticky offset-top="46">
      <van-tab title="待审核" name="pending"></van-tab>
      <van-tab title="已通过" name="approved"></van-tab>
      <van-tab title="已拒绝" name="rejected"></van-tab>
      <van-tab title="全部" name="all"></van-tab>
    </van-tabs>

    <van-loading v-if="loading" class="mt-10 text-center" />
    
    <div v-else-if="posts.length === 0" class="mt-20 text-center text-gray-400">
      <van-empty description="暂无帖子数据" />
    </div>
    
    <div v-else class="p-3">
      <div v-for="item in posts" :key="item.post.id" class="bg-white rounded-lg p-4 mb-3 shadow-sm border border-gray-100">
        <div class="flex justify-between items-center mb-2">
          <div class="flex items-center">
            <span class="text-sm font-bold text-gray-800">{{ item.author.nickname }}</span>
            <van-tag type="primary" plain class="ml-2">{{ item.post.category }}</van-tag>
          </div>
          <van-tag :type="item.post.status === 'approved' ? 'success' : item.post.status === 'rejected' ? 'danger' : 'warning'">
            {{ item.post.status === 'approved' ? '正常' : item.post.status === 'rejected' ? '被拒绝' : '待审核' }}
          </van-tag>
        </div>
        
        <h3 class="text-base font-bold text-gray-900 mb-1">{{ item.post.title }}</h3>
        <p class="text-sm text-gray-600 mb-2 line-clamp-3">{{ item.post.content }}</p>
        
        <div class="flex gap-2 mb-3" v-if="item.post.parsedImages && item.post.parsedImages.length > 0">
          <van-image 
            v-for="(img, idx) in item.post.parsedImages.slice(0,3)" 
            :key="idx" 
            :src="getThumbnailUrl(img, SMALL_THUMB_PARAMS)" 
            width="60" 
            height="60" 
            class="rounded"
          />
          <span v-if="item.post.parsedImages.length > 3" class="text-xs text-gray-400 self-end mb-1">等{{ item.post.parsedImages.length }}张</span>
        </div>
        
        <div class="text-xs text-gray-400 mb-3 border-b border-gray-50 pb-2">
          发布于: {{ new Date(item.post.createdAt).toLocaleString() }}
        </div>
        
        <div class="flex justify-between items-center">
          <div class="flex gap-2">
            <van-button 
              size="mini" 
              :type="item.post.isTop ? 'primary' : 'default'" 
              @click="toggleTop(item)">
              {{ item.post.isTop ? '取消置顶' : '置顶' }}
            </van-button>
            <van-button 
              size="mini" 
              :type="item.post.isElite ? 'warning' : 'default'" 
              @click="toggleElite(item)">
              {{ item.post.isElite ? '取消精华' : '加精' }}
            </van-button>
          </div>
          
          <div class="flex gap-2" v-if="item.post.status === 'pending' || item.post.status === 'rejected'">
            <van-button size="small" type="success" @click="handleApprove(item.post.id)">通过审核</van-button>
          </div>
          <div class="flex gap-2" v-if="item.post.status === 'pending' || item.post.status === 'approved'">
             <van-button size="small" type="danger" @click="handleReject(item.post.id)">拒绝/下架</van-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
