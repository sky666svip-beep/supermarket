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
    console.error(e)
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
    console.error(e)
    showToast('添加失败')
  }
}

const toggleItem = async (item: any) => {
  if (item._processing) return
  item._processing = true
  
  const originalState = item.isCompleted
  item.isCompleted = !item.isCompleted
  
  try {
    const res = await updateChecklist(item.id, item.isCompleted)
    if (!res.success) {
      showToast(res.message || '更新失败')
      item.isCompleted = originalState
    }
  } catch(e) {
    console.error(e)
    showToast('更新失败')
    item.isCompleted = originalState
  } finally {
    item._processing = false
  }
}

const onDelete = (item: any) => {
  showConfirmDialog({
    title: '删除提示',
    message: '确定要删除这条购物项吗？'
  }).then(async () => {
    try {
      const res = await deleteChecklist(item.id)
      if (res.success) {
        showToast('删除成功')
        loadList()
      } else {
        showToast(res.message || '删除失败')
      }
    } catch(e) {
      console.error(e)
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
  <div class="bg-background text-on-background antialiased min-h-screen flex flex-col font-body-md selection:bg-primary-container selection:text-white">
    <!-- Top App Bar -->
    <header class="bg-surface w-full top-0 sticky flex flex-col z-40 transition-colors shadow-sm">
      <div class="flex items-center justify-between px-margin-mobile h-16 w-full max-w-2xl mx-auto">
        <button @click="router.back()" class="flex items-center text-primary font-body-md hover:bg-surface-container-low p-2 -ml-2 rounded-lg transition-colors active:scale-95">
          <span class="material-symbols-outlined mr-1" style="font-size: 20px;">arrow_back_ios_new</span>
          返回
        </button>
        <h1 class="font-headline-sm text-headline-sm font-bold text-on-surface absolute left-1/2 transform -translate-x-1/2">
          我的购物清单
        </h1>
        <div class="w-12"></div> <!-- Spacer for centering -->
      </div>
    </header>

    <!-- Main Content Canvas -->
    <main class="flex-1 overflow-y-auto px-margin-mobile py-lg pb-24 md:max-w-2xl md:mx-auto md:w-full">
      <!-- Add Item Card -->
      <div class="bg-surface shadow-[0px_4px_12px_rgba(0,0,0,0.05)] rounded-xl p-2 flex items-center mb-lg border border-transparent focus-within:border-primary/30 transition-all duration-300">
        <input 
          v-model="newItem" 
          @keyup.enter="onAdd"
          class="flex-1 bg-transparent border-none focus:ring-0 text-on-surface font-body-md px-sm placeholder-secondary/60" 
          placeholder="添加想买的物品..." 
          type="text"
        />
        <button @click="onAdd" class="bg-primary text-white px-lg py-sm rounded-lg font-label-md hover:bg-surface-tint transition-colors active:scale-95 shadow-sm">
          添加
        </button>
      </div>

      <!-- List Section -->
      <section class="flex flex-col gap-sm">
        <div v-for="group in groupedList" :key="group.date">
          <!-- Date Header -->
          <div class="px-sm mb-xs mt-sm">
            <h2 class="font-label-md text-label-md text-secondary">{{ group.date }}</h2>
          </div>
          
          <div class="flex flex-col gap-2">
            <!-- List Items -->
            <div 
              v-for="item in group.items" 
              :key="item.id" 
              class="bg-surface shadow-[0px_4px_12px_rgba(0,0,0,0.05)] rounded-xl p-md flex items-center justify-between group hover:shadow-md transition-shadow duration-300"
              :class="{ 'opacity-60': item.isCompleted }"
            >
              <div @click="toggleItem(item)" class="flex items-center gap-md flex-1 cursor-pointer">
                <span 
                  class="material-symbols-outlined transition-colors"
                  :class="item.isCompleted ? 'text-primary fill' : 'text-secondary/50 group-hover:text-primary'"
                  :style="item.isCompleted ? 'font-variation-settings: \'FILL\' 1;' : ''"
                >
                  {{ item.isCompleted ? 'check_circle' : 'radio_button_unchecked' }}
                </span>
                <span class="font-body-md transition-colors" :class="item.isCompleted ? 'line-through text-secondary' : 'text-on-surface'">
                  {{ item.title }}
                </span>
              </div>
              <button @click="onDelete(item)" class="text-error/60 hover:text-error hover:bg-error-container/50 p-sm rounded-full transition-all active:scale-90">
                <span class="material-symbols-outlined" style="font-size: 20px;">delete_outline</span>
              </button>
            </div>
          </div>
        </div>

        <div v-if="list.length === 0" class="py-12 flex flex-col items-center justify-center opacity-50">
          <span class="material-symbols-outlined text-6xl text-surface-variant mb-4">list_alt</span>
          <p class="font-body-md text-secondary">清单空空如也，添加点什么吧</p>
        </div>
      </section>
    </main>
  </div>
</template>
