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
  <div class="bg-background text-on-background min-h-screen font-body-md pb-20">
    <!-- Top App Bar -->
    <header class="bg-surface w-full top-0 sticky flex flex-col z-20 shadow-sm transition-colors">
      <div class="flex items-center justify-between px-margin-mobile h-16 w-full max-w-2xl mx-auto">
        <button @click="router.back()" class="flex items-center justify-center text-primary hover:bg-surface-container-low w-10 h-10 rounded-full transition-colors active:scale-95">
          <i-material-symbols-arrow-back-ios-new></i-material-symbols-arrow-back-ios-new>
        </button>
        <h1 class="font-headline-sm text-headline-sm font-bold text-on-surface absolute left-1/2 transform -translate-x-1/2 truncate max-w-[50%] text-center">
          帖子详情
        </h1>
        <div class="w-10 h-10"></div>
      </div>
    </header>

    <van-loading v-if="loading" class="mt-10 text-center" />
    
    <main v-else-if="post" class="w-full max-w-2xl mx-auto px-margin-mobile pt-4 flex flex-col gap-4">
      <!-- Post Content Card -->
      <article class="bg-surface-container-lowest rounded-xl p-4 shadow-[0px_4px_12px_rgba(0,0,0,0.05)] border border-surface-variant flex flex-col gap-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <img class="w-10 h-10 rounded-full object-cover shadow-sm border border-surface-variant/30" :src="post.author.avatar || 'https://fastly.jsdelivr.net/npm/@vant/assets/cat.jpeg'" alt="avatar" />
            <div class="flex flex-col">
              <span class="font-label-md text-sm text-on-surface">{{ post.author.nickname || post.author.username }}</span>
              <span class="text-xs text-on-surface-variant">{{ formatTime(post.post.createdAt) }}</span>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <span class="px-2 py-0.5 rounded border border-primary/30 text-primary font-label-md text-xs bg-primary/5">{{ post.post.category }}</span>
            <button @click="openReport('post', post.post.id)" class="text-on-surface-variant hover:text-error transition-colors p-1 rounded-full active:bg-surface-variant">
              <i-material-symbols-warning-outline  class="text-[20px]"></i-material-symbols-warning-outline>
            </button>
          </div>
        </div>

        <h1 class="font-headline-sm text-lg font-bold text-on-surface leading-snug">{{ post.post.title }}</h1>
        <p class="font-body-md text-on-surface-variant whitespace-pre-wrap leading-relaxed">{{ post.post.content }}</p>
        
        <div v-if="postImages.length > 0" class="flex flex-col gap-2 rounded-lg overflow-hidden">
          <img 
            v-for="(img, idx) in postImages" 
            :key="idx" 
            :src="img.startsWith('/uploads') ? '/api' + img : img" 
            class="w-full object-cover shadow-sm rounded-lg"
            @click="previewImage(postImages, Number(idx))"
          />
        </div>
        
        <div class="flex items-center text-xs text-outline mt-2 gap-1">
          <i-material-symbols-visibility-outline  class="text-[16px]"></i-material-symbols-visibility-outline>
          <span>阅读 {{ post.post.viewCount }}</span>
        </div>
      </article>

      <!-- Comments Section -->
      <section class="bg-surface-container-lowest rounded-xl p-4 shadow-[0px_4px_12px_rgba(0,0,0,0.05)] border border-surface-variant mb-6">
        <h3 class="font-label-md text-base text-on-surface mb-4 flex items-center gap-2">
          <span class="w-1 h-4 bg-primary rounded-full"></span>
          评论 {{ post.post.commentCount }}
        </h3>
        
        <div v-if="comments.length === 0" class="flex flex-col items-center justify-center py-8 text-on-surface-variant opacity-60">
          <i-material-symbols-forum-outline  class="text-4xl mb-2"></i-material-symbols-forum-outline>
          <p class="font-body-md text-sm">暂无评论，快来抢沙发吧~</p>
        </div>
        
        <div v-else class="flex flex-col gap-4">
          <div v-for="node in commentTree" :key="node.comment.id" class="border-b border-surface-variant/50 pb-4 last:border-0 last:pb-0">
            <div class="flex items-start gap-3">
              <img class="w-8 h-8 rounded-full object-cover shadow-sm border border-surface-variant/30" :src="node.author.avatar || 'https://fastly.jsdelivr.net/npm/@vant/assets/cat.jpeg'" />
              <div class="flex-1 flex flex-col gap-1">
                <div class="flex justify-between items-center">
                  <span class="font-label-md text-sm text-on-surface-variant">{{ node.author.nickname || node.author.username }}</span>
                  <button @click="handleLikeComment(node)" class="flex items-center gap-1 text-on-surface-variant hover:text-primary transition-colors active:scale-95">
                    <span class="text-xs">{{ node.comment.likeCount || '' }}</span>
                    <i-material-symbols-thumb-up-outline  class="text-[18px]"></i-material-symbols-thumb-up-outline>
                  </button>
                </div>
                <p class="font-body-md text-sm text-on-surface whitespace-pre-wrap">{{ node.comment.content }}</p>
                <div class="flex items-center gap-4 text-xs text-outline mt-1">
                  <span>{{ formatTime(node.comment.createdAt) }}</span>
                  <button @click="openComment(node)" class="text-primary font-medium hover:underline active:opacity-70">回复</button>
                  <button @click="openReport('comment', node.comment.id)" class="text-error font-medium hover:underline active:opacity-70">举报</button>
                </div>
                
                <!-- Sub-comments -->
                <div v-if="node.children && node.children.length > 0" class="bg-surface-container-low rounded-lg p-3 mt-3 flex flex-col gap-3 border border-surface-variant/30">
                  <div v-for="child in node.children" :key="child.comment.id" class="flex flex-col gap-1">
                    <div class="font-body-md text-sm">
                      <span class="text-primary font-medium">{{ child.author.nickname || child.author.username }}</span>
                      <span class="text-on-surface-variant">: {{ child.comment.content }}</span>
                    </div>
                    <div class="flex items-center gap-4 text-xs text-outline">
                      <span>{{ formatTime(child.comment.createdAt) }}</span>
                      <button @click="openReport('comment', child.comment.id)" class="text-error font-medium hover:underline active:opacity-70">举报</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
    <div v-else class="flex-1 flex items-center justify-center text-on-surface-variant font-body-md">帖子找不到了</div>

    <!-- Bottom Action Bar -->
    <div v-if="post" class="fixed bottom-0 left-0 w-full z-20 backdrop-blur-md bg-surface/80 shadow-[0_-4px_16px_rgba(0,0,0,0.05)] border-t border-surface-variant/30 pb-safe">
      <div class="max-w-2xl mx-auto h-14 px-4 flex items-center gap-4">
        <div @click="openComment()" class="flex-1 bg-surface-container-low hover:bg-surface-variant transition-colors rounded-full py-2 px-4 flex items-center gap-2 cursor-pointer active:scale-[0.98]">
          <i-material-symbols-edit-outline  class="text-outline text-[18px]"></i-material-symbols-edit-outline>
          <span class="font-body-md text-sm text-outline">说点什么...</span>
        </div>
        
        <div v-if="isMutualHelpPost" class="flex items-center">
          <button v-if="isAuthor" @click="handleMarkSolved" class="bg-primary text-white px-4 py-1.5 rounded-full font-label-md text-sm shadow-sm active:scale-95 flex items-center gap-1 transition-colors" style="color: #ffffff !important;">
            <i-material-symbols-check-circle-outline  class="text-[18px]" style="color: #ffffff !important;"></i-material-symbols-check-circle-outline>
            已解决
          </button>
        </div>
        
        <div v-else class="flex items-center gap-6 pr-2">
          <button @click="toggleLike" class="flex flex-col items-center justify-center gap-0.5 group active:scale-90 transition-transform">
            <i-material-symbols-favorite-outline :class="interaction.liked ? 'text-error fill' : 'text-on-surface-variant group-hover:text-error'" :style="interaction.liked ? 'font-variation-settings: \'FILL\' 1;' : ''" class="transition-colors text-[24px]"></i-material-symbols-favorite-outline>
            <span class="font-label-md text-[10px]" :class="interaction.liked ? 'text-error' : 'text-on-surface-variant'">{{ post.post.likeCount || '点赞' }}</span>
          </button>
          <button @click="toggleCollect" class="flex flex-col items-center justify-center gap-0.5 group active:scale-90 transition-transform">
            <i-material-symbols-star-outline :class="interaction.collected ? 'text-[#f59e0b] fill' : 'text-on-surface-variant group-hover:text-[#f59e0b]'" :style="interaction.collected ? 'font-variation-settings: \'FILL\' 1;' : ''" class="transition-colors text-[24px]"></i-material-symbols-star-outline>
            <span class="font-label-md text-[10px]" :class="interaction.collected ? 'text-[#f59e0b]' : 'text-on-surface-variant'">收藏</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Popups -->
    <van-popup v-model:show="showCommentPopup" position="bottom" round safe-area-inset-bottom>
      <div class="p-4 bg-surface">
        <div class="flex justify-between items-center mb-3">
          <span class="font-label-md text-sm text-on-surface-variant">
            {{ replyTo ? `回复 ${replyTo.author.nickname || replyTo.author.username}` : '发表评论' }}
          </span>
          <button @click="onSubmitComment" class="bg-primary text-white px-4 py-1.5 rounded-lg font-label-md text-sm active:scale-95 transition-transform shadow-sm" style="color: #ffffff !important;">发布</button>
        </div>
        <van-field
          v-model="commentContent"
          rows="4"
          autosize
          type="textarea"
          maxlength="100"
          placeholder="写下你的评论..."
          show-word-limit
          class="bg-surface-container-low rounded-lg !p-3 font-body-md"
        />
      </div>
    </van-popup>

    <van-popup v-model:show="showReportPopup" position="bottom" round safe-area-inset-bottom>
      <div class="p-4 bg-surface rounded-t-xl">
        <div class="flex justify-between items-center mb-4 border-b border-surface-variant pb-2">
          <span class="font-headline-sm text-base font-bold text-on-surface">举报{{ reportTarget === 'post' ? '帖子' : '评论' }}</span>
          <button @click="showReportPopup = false" class="text-on-surface-variant hover:text-on-surface p-1 rounded-full active:bg-surface-variant transition-colors">
            <i-material-symbols-close  class="text-[20px]"></i-material-symbols-close>
          </button>
        </div>
        
        <div class="mb-4">
          <div class="font-label-md text-sm text-on-surface-variant mb-2">举报原因 (必选)</div>
          <van-radio-group v-model="reportReason" class="grid grid-cols-2 gap-3">
            <van-radio name="垃圾广告" shape="square">垃圾广告</van-radio>
            <van-radio name="低俗色情" shape="square">低俗色情</van-radio>
            <van-radio name="违法违规" shape="square">违法违规</van-radio>
            <van-radio name="恶意攻击" shape="square">恶意攻击</van-radio>
            <van-radio name="其他违规" shape="square">其他违规</van-radio>
          </van-radio-group>
        </div>
        
        <div class="mb-5">
          <div class="font-label-md text-sm text-on-surface-variant mb-2">详细说明 (选填)</div>
          <van-field
            v-model="reportDesc"
            rows="3"
            autosize
            type="textarea"
            maxlength="200"
            show-word-limit
            placeholder="请详细描述违规情况..."
            class="bg-surface-container-low rounded-lg !p-2 font-body-md border border-surface-variant/50"
          />
        </div>
        
        <button @click="submitReport" class="w-full bg-error text-on-error py-3 rounded-xl font-label-md font-bold shadow-sm active:scale-[0.98] transition-transform" style="color: #ffffff !important;">提交举报</button>
      </div>
    </van-popup>
  </div>
</template>
