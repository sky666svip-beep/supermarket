<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getMyPosts, deletePost } from '../../api/index'
import { showToast, showConfirmDialog } from 'vant'

const router = useRouter()
const posts = ref<any[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    const res = await getMyPosts()
    if (res.success) {
      posts.value = res.data
    } else {
      showToast(res.message || '获取失败')
    }
  } catch (error) {
    showToast('获取异常')
  } finally {
    loading.value = false
  }
})

const goDetail = (id: number) => {
  router.push(`/community/post/${id}`)
}

const onEdit = (id: number) => {
  router.push(`/community/publish?id=${id}`)
}

const onDelete = (id: number) => {
  showConfirmDialog({
    title: '删除帖子',
    message: '确定要删除这条帖子吗？此操作不可恢复。',
  }).then(async () => {
    try {
      const res = await deletePost(id)
      if (res.success) {
        showToast('删除成功')
        posts.value = posts.value.filter(p => p.id !== id)
      } else {
        showToast(res.message || '删除失败')
      }
    } catch (error) {
      showToast('删除异常')
    }
  }).catch(() => {})
}
</script>

<template>
  <div class="my-posts-container min-h-screen bg-gray-50 pb-4">
    <van-nav-bar title="我的帖子" left-arrow @click-left="router.back()" fixed placeholder />
    
    <van-loading v-if="loading" class="mt-10 text-center" />
    
    <div v-else-if="posts.length === 0" class="mt-20 text-center text-gray-400">
      <van-empty description="还没发过帖子哦" />
      <van-button type="primary" size="small" class="mt-4" @click="router.push('/community/publish')">去发帖</van-button>
    </div>
    
    <div v-else class="p-3">
      <div v-for="post in posts" :key="post.id" class="bg-white rounded-lg p-4 mb-3 shadow-sm border border-gray-100" @click="goDetail(post.id)">
        <div class="flex justify-between items-center mb-2">
          <van-tag :type="post.status === 'approved' ? 'success' : post.status === 'rejected' ? 'danger' : 'warning'">
            {{ post.status === 'approved' ? '已发布' : post.status === 'rejected' ? '被拒绝' : '审核中' }}
          </van-tag>
          <span class="text-xs text-gray-400">{{ new Date(post.createdAt).toLocaleDateString() }}</span>
        </div>
        <h3 class="text-base font-bold text-gray-900 mb-1 line-clamp-1">{{ post.title }}</h3>
        <p class="text-sm text-gray-600 line-clamp-2 mb-2">{{ post.content }}</p>
        <div class="flex items-center text-xs text-gray-500 gap-4 mt-2">
          <span>阅读 {{ post.viewCount }}</span>
          <span>点赞 {{ post.likeCount }}</span>
          <span>评论 {{ post.commentCount }}</span>
        </div>
        <div class="flex justify-end gap-2 mt-3 pt-3 border-t border-gray-50" @click.stop>
          <van-button size="mini" type="primary" plain @click="onEdit(post.id)">编辑</van-button>
          <van-button size="mini" type="danger" plain @click="onDelete(post.id)">删除</van-button>
        </div>
      </div>
    </div>
  </div>
</template>
