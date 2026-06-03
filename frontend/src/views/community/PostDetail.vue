<!-- 模块：社区帖子详情 -->
<script setup lang="ts">
// 模块：社区帖子详情
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getPostDetail, getComments, publishComment, likePost, collectPost, getPostInteraction, likeComment, reportPost, reportComment, deletePost } from '../../api/index'
import { showToast, showImagePreview, showConfirmDialog } from 'vant'

const route = useRoute()
const router = useRouter()
const postId = parseInt(route.params.id as string)

const post = ref<any>(null)
const comments = ref<any[]>([])
const loading = ref(true)
const interaction = ref({ liked: false, collected: false })
const currentUserId = ref<number | null>(null)

const commentContent = ref('')
const showCommentPopup = ref(false)
const replyTo = ref<any>(null)

const showReportPopup = ref(false)
const reportTarget = ref<'post' | 'comment'>('post')
const reportTargetId = ref<number>(0)
const reportReason = ref('')
const reportDesc = ref('')

const isMutualHelpPost = computed(() => {
  if (!post.value) return false
  const cat = post.value.post.category
  return cat === '寻物问答' || cat === '拼车互助'
})

const isAuthor = computed(() => {
  if (!post.value || !currentUserId.value) return false
  return post.value.post.userId === currentUserId.value
})

const postImages = computed(() => {
  if (!post.value?.post?.images) return []
  try {
    const parsed = JSON.parse(post.value.post.images)
    return Array.isArray(parsed) ? parsed : []
  } catch (e) {
    return []
  }
})

onMounted(async () => {
  await fetchPost()
  await fetchComments()
  
  const userStr = localStorage.getItem('user')
  if (userStr) {
    try {
      const user = JSON.parse(userStr)
      currentUserId.value = user.id
    } catch (e) {}
  }
  
  // 互助贴不需要点赞收藏状态查询，也防止了未登录用户的 401 报错
  if (userStr && post.value && !isMutualHelpPost.value) {
    await fetchInteraction()
  }
})

const fetchPost = async () => {
  try {
    const res = await getPostDetail(postId)
    if (res.success) {
      post.value = res.data
    } else {
      showToast(res.message || '获取帖子详情失败')
    }
  } catch (error) {
    showToast('获取异常')
  } finally {
    loading.value = false
  }
}

const fetchComments = async () => {
  try {
    const res = await getComments(postId)
    if (res.success) {
      comments.value = res.data
    }
  } catch (error) {
    console.error(error)
  }
}

const fetchInteraction = async () => {
  try {
    const res = await getPostInteraction(postId)
    if (res.success) {
      interaction.value = res.data
    }
  } catch (error) {}
}

const toggleLike = async () => {
  if (!currentUserId.value) {
    showToast('请先登录再操作')
    router.push('/login')
    return
  }
  if (!post.value) return
  try {
    const res = await likePost(postId)
    if (res.success) {
      interaction.value.liked = res.data.liked
      post.value.post.likeCount += res.data.liked ? 1 : -1
    } else {
      showToast(res.message || '操作失败')
    }
  } catch (error) {
    showToast('操作异常')
  }
}

const toggleCollect = async () => {
  if (!currentUserId.value) {
    showToast('请先登录再操作')
    router.push('/login')
    return
  }
  if (!post.value) return
  try {
    const res = await collectPost(postId)
    if (res.success) {
      interaction.value.collected = res.data.collected
    } else {
      showToast(res.message || '操作失败')
    }
  } catch (error) {
    showToast('操作异常')
  }
}

const handleLikeComment = async (commentNode: any) => {
  if (!currentUserId.value) {
    showToast('请先登录再操作')
    router.push('/login')
    return
  }
  try {
    const res = await likeComment(commentNode.comment.id)
    if (res.success) {
      const original = comments.value.find(c => c.comment.id === commentNode.comment.id)
      if (original) {
        original.comment.likeCount += res.data.liked ? 1 : -1
      }
    }
  } catch (error) {
    showToast('操作失败')
  }
}

const openComment = (item?: any) => {
  if (!currentUserId.value) {
    showToast('请先登录再操作')
    router.push('/login')
    return
  }
  replyTo.value = item || null
  showCommentPopup.value = true
}

const onSubmitComment = async () => {
  if (!commentContent.value.trim()) {
    showToast('请输入内容')
    return
  }

  const linkRegex = /(http[s]?:\/\/|www\.)|([a-zA-Z0-9\-\_]+\.(com|cn|net|org|io|me|cc|co))/i
  if (linkRegex.test(commentContent.value)) {
    showToast('根据社区规范，禁止发布危害信息')
    return
  }
  try {
    const res = await publishComment({
      postId,
      parentId: replyTo.value ? replyTo.value.comment.id : null,
      content: commentContent.value
    })
    if (res.success) {
      showToast('评论成功')
      commentContent.value = ''
      showCommentPopup.value = false
      fetchComments()
      post.value.post.commentCount++
    } else {
      showToast(res.message || '评论失败')
    }
  } catch (error) {
    showToast('评论异常')
  }
}

const previewImage = (images: string[], startPosition: number) => {
  showImagePreview({
    images,
    startPosition,
  })
}

const handleMarkSolved = () => {
  showConfirmDialog({
    title: '标记已解决并删除',
    message: '确认此互助问题已得到解决吗？确认后帖子将自动删除，不可恢复。',
  }).then(async () => {
    try {
      const res = await deletePost(postId)
      if (res.success) {
        showToast('问题已解决，互助贴已成功删除！')
        setTimeout(() => {
          router.back()
        }, 1500)
      } else {
        showToast(res.message || '操作失败')
      }
    } catch (e) {
      showToast('操作异常')
    }
  }).catch(() => {})
}

const openReport = (type: 'post' | 'comment', id: number) => {
  if (!currentUserId.value) {
    showToast('请先登录再操作')
    router.push('/login')
    return
  }
  reportTarget.value = type
  reportTargetId.value = id
  reportReason.value = ''
  reportDesc.value = ''
  showReportPopup.value = true
}

const submitReport = async () => {
  if (!reportReason.value) {
    showToast('请选择举报原因')
    return
  }
  
  try {
    const apiCall = reportTarget.value === 'post' ? reportPost : reportComment
    const res = await apiCall(reportTargetId.value, {
      reason: reportReason.value,
      description: reportDesc.value
    })
    
    if (res.success) {
      showToast('举报成功，我们将尽快核实处理')
      showReportPopup.value = false
    } else {
      showToast(res.message || '举报失败')
    }
  } catch (error) {
    showToast('操作异常')
  }
}

// 简单的平铺转树形
const commentTree = computed(() => {
  const map = new Map()
  comments.value.forEach(item => {
    map.set(item.comment.id, { ...item, children: [] })
  })
  const tree: any[] = []
  map.forEach(node => {
    if (node.comment.parentId) {
      const parent = map.get(node.comment.parentId)
      if (parent) {
        parent.children.push(node)
      } else {
        tree.push(node) // fallback
      }
    } else {
      tree.push(node)
    }
  })
  return tree
})

const formatTime = (timeStr: string) => {
  const d = new Date(timeStr)
  return `${d.getMonth() + 1}-${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}
</script>

<template>
  <div class="post-detail-container pb-16 bg-gray-50 min-h-screen">
    <van-nav-bar title="帖子详情" left-arrow @click-left="router.back()" fixed placeholder />
    
    <van-loading v-if="loading" class="mt-10 text-center" />
    
    <div v-else-if="post" class="content">
      <!-- 帖子主要内容 -->
      <div class="bg-white p-4 mb-2 shadow-sm">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center">
            <van-image round width="40" height="40" :src="post.author.avatar || 'https://fastly.jsdelivr.net/npm/@vant/assets/cat.jpeg'" />
            <div class="ml-3">
              <div class="text-sm font-bold text-gray-800">{{ post.author.nickname || post.author.username }}</div>
              <div class="text-xs text-gray-400">{{ formatTime(post.post.createdAt) }}</div>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <van-tag type="primary" plain>{{ post.post.category }}</van-tag>
            <div @click="openReport('post', post.post.id)" class="text-gray-400 flex flex-col items-center justify-center">
              <van-icon name="warning-o" size="18" />
            </div>
          </div>
        </div>
        
        <h1 class="text-lg font-bold mb-3 text-gray-900">{{ post.post.title }}</h1>
        <div class="text-base text-gray-700 leading-relaxed whitespace-pre-wrap mb-4">{{ post.post.content }}</div>
        
        <div class="flex flex-col gap-2 mb-4" v-if="postImages.length > 0">
          <van-image 
            v-for="(img, idx) in postImages" 
            :key="idx" 
            :src="img.startsWith('/uploads') ? '/api' + img : img" 
            width="100%" 
            radius="8"
            class="shadow-sm block"
            @click="previewImage(postImages, Number(idx))"
          />
        </div>
        <div class="flex items-center text-xs text-gray-400 gap-4 mt-4">
          <span>阅读 {{ post.post.viewCount }}</span>
        </div>
      </div>

      <!-- 评论区 -->
      <div class="bg-white p-4 shadow-sm min-h-[300px]">
        <h3 class="font-bold text-gray-800 mb-4 flex items-center">
          <span class="w-1 h-4 bg-blue-500 rounded mr-2"></span>评论 {{ post.post.commentCount }}
        </h3>
        
        <div v-if="comments.length === 0" class="text-center text-gray-400 py-8">
          暂无评论，快来抢沙发吧~
        </div>
        
        <div v-else>
          <div v-for="node in commentTree" :key="node.comment.id" class="mb-4 border-b border-gray-50 pb-4">
            <div class="flex items-start">
              <van-image round width="32" height="32" :src="node.author.avatar || 'https://fastly.jsdelivr.net/npm/@vant/assets/cat.jpeg'" class="mt-1" />
              <div class="ml-2 flex-1">
                <div class="flex justify-between items-center">
                  <span class="text-sm text-gray-600 font-medium">{{ node.author.nickname || node.author.username }}</span>
                  <div class="flex items-center text-gray-400" @click="handleLikeComment(node)">
                    <span class="text-xs mr-1">{{ node.comment.likeCount || '' }}</span>
                    <van-icon name="good-job-o" />
                  </div>
                </div>
                <div class="text-sm text-gray-800 mt-1 whitespace-pre-wrap">{{ node.comment.content }}</div>
                <div class="flex items-center mt-2 text-xs text-gray-400">
                  <span class="mr-4">{{ formatTime(node.comment.createdAt) }}</span>
                  <span class="text-blue-500 mr-4" @click="openComment(node)">回复</span>
                  <span class="text-red-400" @click="openReport('comment', node.comment.id)">举报</span>
                </div>
                
                <!-- 二级评论展示区 -->
                <div class="bg-gray-50 p-2 rounded-lg mt-2" v-if="node.children && node.children.length > 0">
                  <div v-for="child in node.children" :key="child.comment.id" class="mb-2 last:mb-0">
                    <span class="text-blue-600 text-sm font-medium">{{ child.author.nickname || child.author.username }}</span>
                    <span class="text-gray-800 text-sm">: {{ child.comment.content }}</span>
                    <div class="flex items-center mt-1 text-xs text-gray-400">
                      <span class="mr-4">{{ formatTime(child.comment.createdAt) }}</span>
                      <span class="text-red-400" @click="openReport('comment', child.comment.id)">举报</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="text-center mt-10 text-gray-400">帖子找不到了</div>

    <!-- 底部操作栏 -->
    <div class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex items-center p-2 px-4 shadow-lg z-10" v-if="post">
      <div class="flex-1 bg-gray-100 rounded-full py-2 px-4 text-gray-400 text-sm flex items-center" @click="openComment()">
        <van-icon name="edit" class="mr-1" /> 说点什么...
      </div>
      
      <!-- 互助板块底部：不显示点赞收藏。如果是发帖作者本人，展示已解决标注并下线按钮 -->
      <div v-if="isMutualHelpPost" class="ml-4 flex items-center">
        <van-button 
          v-if="isAuthor" 
          type="success" 
          size="small" 
          round 
          icon="success"
          @click="handleMarkSolved"
          class="shadow-sm font-bold bg-green-500 border-none px-4"
        >
          已解决
        </van-button>
      </div>

      <!-- 传统社区板块底部：展示常规点赞收藏 -->
      <div v-else class="flex items-center gap-6 ml-6 text-gray-600">
        <div class="flex flex-col items-center justify-center relative" @click="toggleLike">
          <van-icon :name="interaction.liked ? 'good-job' : 'good-job-o'" :color="interaction.liked ? '#ef4444' : ''" size="22" />
          <span class="text-xs mt-0.5">{{ post.post.likeCount || '点赞' }}</span>
        </div>
        <div class="flex flex-col items-center justify-center relative" @click="toggleCollect">
          <van-icon :name="interaction.collected ? 'star' : 'star-o'" :color="interaction.collected ? '#f59e0b' : ''" size="22" />
          <span class="text-xs mt-0.5">收藏</span>
        </div>
      </div>
    </div>

    <!-- 评论弹窗 -->
    <van-popup v-model:show="showCommentPopup" position="bottom" round safe-area-inset-bottom>
      <div class="p-4">
        <div class="flex justify-between items-center mb-3">
          <span class="text-sm text-gray-600">
            {{ replyTo ? `回复 ${replyTo.author.nickname || replyTo.author.username}` : '发表评论' }}
          </span>
          <van-button type="primary" size="small" @click="onSubmitComment">发布</van-button>
        </div>
        <van-field
          v-model="commentContent"
          rows="4"
          autosize
          type="textarea"
          maxlength="500"
          placeholder="写下你的评论..."
          show-word-limit
          class="bg-gray-50 rounded-lg"
        />
      </div>
    </van-popup>

    <!-- 举报弹窗 -->
    <van-popup v-model:show="showReportPopup" position="bottom" round safe-area-inset-bottom>
      <div class="p-4">
        <div class="flex justify-between items-center mb-4">
          <span class="text-base font-bold text-gray-800">举报{{ reportTarget === 'post' ? '帖子' : '评论' }}</span>
          <van-icon name="cross" size="20" class="text-gray-400" @click="showReportPopup = false" />
        </div>
        
        <div class="mb-4">
          <div class="text-sm text-gray-500 mb-2">举报原因 (必选)</div>
          <van-radio-group v-model="reportReason" class="grid grid-cols-2 gap-3">
            <van-radio name="垃圾广告" shape="square">垃圾广告</van-radio>
            <van-radio name="低俗色情" shape="square">低俗色情</van-radio>
            <van-radio name="违法违规" shape="square">违法违规</van-radio>
            <van-radio name="恶意攻击" shape="square">恶意攻击</van-radio>
            <van-radio name="其他违规" shape="square">其他违规</van-radio>
          </van-radio-group>
        </div>
        
        <div class="mb-5">
          <div class="text-sm text-gray-500 mb-2">详细说明 (选填)</div>
          <van-field
            v-model="reportDesc"
            rows="3"
            autosize
            type="textarea"
            maxlength="200"
            show-word-limit
            placeholder="请详细描述违规情况..."
            class="bg-gray-50 rounded border border-gray-100 p-2"
          />
        </div>
        
        <van-button type="danger" block round @click="submitReport">提交举报</van-button>
      </div>
    </van-popup>
  </div>
</template>
