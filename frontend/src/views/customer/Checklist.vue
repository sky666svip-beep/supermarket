<!-- 模块：我的购物清单 -->
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { showToast, showConfirmDialog } from 'vant'
import { useRouter } from 'vue-router'
import { getChecklist, addChecklist, updateChecklist, deleteChecklist } from '../../api/index'

const router = useRouter()
const newItem = ref('')
const list = ref<any[]>([])

const loadList = async () => {
  try {
    list.value = await getChecklist()
  } catch(e) {
    showToast('加载失败')
  }
}

onMounted(loadList)

const onAdd = async () => {
  if (!newItem.value.trim()) return
  try {
    await addChecklist(newItem.value)
    newItem.value = ''
    showToast('添加成功')
    loadList()
  } catch(e) {
    showToast('添加失败')
  }
}

const toggleItem = async (item: any) => {
  try {
    await updateChecklist(item.id, !item.isCompleted)
    item.isCompleted = !item.isCompleted
  } catch(e) {
    showToast('更新失败')
  }
}

const onDelete = (item: any) => {
  showConfirmDialog({
    title: '删除提示',
    message: '确定要删除这条购物项吗？'
  }).then(async () => {
    try {
      await deleteChecklist(item.id)
      showToast('删除成功')
      loadList()
    } catch(e) {
      showToast('删除失败')
    }
  }).catch(() => {})
}

const groupedList = computed(() => {
  const groups: Record<string, any[]> = {}
  list.value.forEach(item => {
    const d = item.createdAt ? new Date(item.createdAt) : new Date()
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (!groups[dateStr]) groups[dateStr] = []
    groups[dateStr].push(item)
  })
  
  return Object.keys(groups).sort((a, b) => b.localeCompare(a)).map(date => ({
    date,
    items: groups[date]
  }))
})
</script>

<template>
  <div class="h-full flex flex-col bg-gray-50">
    <van-nav-bar
      title="我的购物清单"
      left-text="返回"
      left-arrow
      @click-left="router.back()"
      class="flex-shrink-0"
    />

    <div class="flex-1 overflow-y-auto p-4 space-y-4 pb-20">
      <van-cell-group inset class="!mx-0 shadow-sm">
        <van-field v-model="newItem" center clearable placeholder="添加想买的物品...">
          <template #button>
            <van-button size="small" type="primary" @click="onAdd">添加</van-button>
          </template>
        </van-field>
      </van-cell-group>
      
      <div v-for="group in groupedList" :key="group.date">
        <div class="text-sm text-gray-500 mb-2 px-2">{{ group.date }}</div>
        <van-cell-group inset class="!mx-0 shadow-sm">
          <van-cell v-for="item in group.items" :key="item.id" clickable @click="toggleItem(item)">
            <template #icon>
              <van-checkbox :model-value="item.isCompleted" @click.stop="toggleItem(item)" class="mr-3" />
            </template>
            <template #title>
              <span :class="{ 'line-through text-gray-400': item.isCompleted }">{{ item.title }}</span>
            </template>
            <template #right-icon>
              <div class="flex items-center h-full">
                <van-icon name="delete-o" class="text-red-500 text-lg p-1" @click.stop="onDelete(item)" />
              </div>
            </template>
          </van-cell>
        </van-cell-group>
      </div>
        
      <van-empty v-if="list.length === 0" description="清单空空如也，添加点什么吧" />
    </div>
  </div>
</template>
