<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { showConfirmDialog, showToast } from 'vant'
import { getItemMemos, updateItemMemo, deleteItemMemo } from '../../api/index'

const router = useRouter()
const activeTab = ref('全部')
const memos = ref<any[]>([])

const fetchMemos = async () => {
  try {
    memos.value = await getItemMemos()
  } catch (e) {
    showToast('获取备忘录失败')
  }
}

onMounted(() => {
  fetchMemos()
})

const categories = computed(() => {
  const cats = new Set<string>()
  cats.add('全部')
  memos.value.forEach(m => {
    if (m.category) cats.add(m.category)
  })
  return Array.from(cats)
})

const filteredMemos = computed(() => {
  if (activeTab.value === '全部') {
    return memos.value
  }
  return memos.value.filter(m => m.category === activeTab.value)
})

const toggleComplete = async (memo: any) => {
  try {
    const newStatus = !memo.isCompleted
    await updateItemMemo(memo.id, { isCompleted: newStatus })
    memo.isCompleted = newStatus
    showToast(newStatus ? '已标记完成 (24小时后自动清理)' : '已取消标记完成')
  } catch (e) {
    showToast('更新状态失败')
  }
}

const onDelete = (memo: any) => {
  showConfirmDialog({
    title: '删除确认',
    message: '确定要删除这条商品备忘吗？'
  }).then(async () => {
    try {
      await deleteItemMemo(memo.id)
      showToast('删除成功')
      fetchMemos()
    } catch (e) {
      showToast('删除失败')
    }
  }).catch(() => {})
}

const parseTags = (tagsStr: string) => {
  if (!tagsStr) return []
  try {
    return JSON.parse(tagsStr)
  } catch (e) {
    return []
  }
}

const getFullUrl = (url: string) => {
  if (!url) return ''
  return url.startsWith('/') ? `/api${url}` : url
}
</script>

<template>
  <div class="h-full flex flex-col bg-gray-50">
    <van-nav-bar
      title="商品备忘本"
      left-arrow
      @click-left="router.back()"
      class="flex-shrink-0"
    >
      <template #right>
        <van-icon name="plus" size="18" @click="router.push('/customer/memos/edit')" />
      </template>
    </van-nav-bar>

    <van-tabs v-model:active="activeTab" sticky offset-top="0">
      <van-tab v-for="cat in categories" :key="cat" :title="cat" :name="cat" />
    </van-tabs>

    <div class="flex-1 overflow-y-auto p-4 space-y-4">
      <van-empty v-if="filteredMemos.length === 0" description="暂无备忘记录" />
      
      <div 
        v-for="memo in filteredMemos" 
        :key="memo.id"
        class="bg-white rounded-lg shadow-sm overflow-hidden"
      >
        <div class="relative">
          <van-image
            v-if="memo.imageUrl"
            width="100%"
            height="140"
            fit="cover"
            :src="getFullUrl(memo.imageUrl)"
          />
          <div 
            v-if="memo.isCompleted" 
            class="absolute top-0 left-0 w-full h-full bg-black/40 flex items-center justify-center z-10"
          >
            <van-icon name="success" color="#fff" size="48" />
          </div>
        </div>
        
        <div class="p-4">
          <!-- 顶部信息区：价格、品牌、分类对齐 -->
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2 flex-1 overflow-hidden">
              <van-tag v-if="memo.price" mark type="danger" size="large" class="flex-shrink-0 !rounded-l-none">
                ￥{{ memo.price }}
              </van-tag>
              <div class="text-lg font-bold text-gray-800 line-clamp-1 flex-1">{{ memo.style || '未命名商品款式' }}</div>
            </div>
            <van-tag plain type="primary" size="medium" class="flex-shrink-0 ml-2">{{ memo.category }}</van-tag>
          </div>
          
          <!-- 地址与电话：同一行显示 -->
          <div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500 mb-3 pl-1">
            <div class="flex items-center" v-if="memo.location">
              <van-icon name="location-o" class="mr-1 text-base" />
              <span>{{ memo.location }}</span>
            </div>
            <div class="flex items-center" v-if="memo.contact">
              <van-icon name="phone-o" class="mr-1 text-base" />
              <span>{{ memo.contact }}</span>
            </div>
          </div>
          
          <div class="flex flex-wrap gap-2 mb-4 pl-1" v-if="memo.tags && parseTags(memo.tags).length > 0">
            <van-tag v-for="tag in parseTags(memo.tags)" :key="tag" type="primary" plain size="small">
              {{ tag }}
            </van-tag>
          </div>
          
          <!-- 底部按钮区 -->
          <div class="flex justify-end gap-3 border-t border-gray-100 pt-3 mt-1">
            <van-button size="small" :type="memo.isCompleted ? 'default' : 'success'" @click="toggleComplete(memo)">
              {{ memo.isCompleted ? '取消完成' : '标记完成' }}
            </van-button>
            <van-button size="small" type="danger" plain @click="onDelete(memo)">删除</van-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
