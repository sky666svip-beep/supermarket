<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getTodos } from '../../api/index'

const router = useRouter()
const todos = ref({ feedbacks: [] as any[], maintenance: [] as any[] })

onMounted(async () => {
  try {
    todos.value = await getTodos()
  } catch(e) {
    console.error('Failed to load todos')
  }
})
</script>

<template>
  <div class="bg-background text-on-background min-h-screen font-body-md selection:bg-primary-container selection:text-white flex flex-col pb-20">
    <div class="space-y-6 px-margin-mobile py-6 max-w-2xl mx-auto w-full">
      <!-- Profile Card -->
      <div class="bg-surface-container-lowest p-5 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-surface-variant/20">
        <div class="flex items-center space-x-4">
          <van-image round width="56" height="56" src="https://fastly.jsdelivr.net/npm/@vant/assets/cat.jpeg" class="border-2 border-primary/20 shadow-sm" />
          <div>
            <h2 class="font-headline-sm text-xl font-bold text-on-surface mb-1">李师傅</h2>
            <div class="inline-flex items-center bg-primary-container/50 text-primary px-2.5 py-1 rounded-full text-xs font-bold tracking-wide">
              <span class="material-symbols-outlined text-[14px] mr-1">shield_person</span>
              运维组长
            </div>
          </div>
        </div>
      </div>
      
      <!-- Actions Grid -->
      <div class="grid grid-cols-2 gap-4">
        <div 
          @click="router.push('/staff/maintenance')"
          class="bg-surface-container-lowest rounded-3xl p-5 flex flex-col items-center justify-center gap-3 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-surface-variant/20 active:scale-[0.98] transition-transform cursor-pointer"
        >
          <div class="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <span class="material-symbols-outlined text-[28px]">build</span>
          </div>
          <span class="font-headline-sm text-sm font-bold text-on-surface">设备报修</span>
        </div>
        <div 
          @click="router.push('/staff/patrol')"
          class="bg-surface-container-lowest rounded-3xl p-5 flex flex-col items-center justify-center gap-3 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-surface-variant/20 active:scale-[0.98] transition-transform cursor-pointer"
        >
          <div class="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <span class="material-symbols-outlined text-[28px]">qr_code_scanner</span>
          </div>
          <span class="font-headline-sm text-sm font-bold text-on-surface">巡检上报</span>
        </div>
      </div>
      
      <!-- Todos List -->
      <div class="flex flex-col gap-4">
        <div class="flex items-center justify-between px-1">
          <h3 class="font-headline-sm text-lg font-bold text-on-surface flex items-center gap-2">
            <span class="material-symbols-outlined text-primary">task_alt</span>
            待办事项
          </h3>
          <span class="text-xs text-on-surface-variant bg-surface-container-low px-2 py-1 rounded-full">{{ todos.feedbacks.length + todos.maintenance.length }} 项</span>
        </div>
        
        <div class="flex flex-col gap-3">
          <div 
            v-for="item in todos.feedbacks" 
            :key="'f_' + item.id" 
            class="bg-surface-container-lowest rounded-3xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-surface-variant/20 flex items-center justify-between cursor-pointer active:bg-surface-container-low transition-colors"
          >
            <div class="flex flex-col gap-1 min-w-0 pr-4">
              <div class="flex items-center gap-2">
                <span class="font-bold text-on-surface text-base truncate">{{ item.facilityType }}故障</span>
                <span class="text-[10px] font-bold bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded">顾客反馈</span>
              </div>
              <p class="text-sm text-on-surface-variant line-clamp-1">{{ item.message }}</p>
            </div>
            <span class="material-symbols-outlined text-on-surface-variant/50">chevron_right</span>
          </div>
          
          <div 
            v-for="item in todos.maintenance" 
            :key="'m_' + item.id" 
            class="bg-surface-container-lowest rounded-3xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-surface-variant/20 flex items-center justify-between cursor-pointer active:bg-surface-container-low transition-colors"
          >
            <div class="flex flex-col gap-1 min-w-0 pr-4">
              <div class="flex items-center gap-2">
                <span class="font-bold text-on-surface text-base truncate">{{ item.location }}</span>
                <span class="text-[10px] font-bold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">运维报修</span>
              </div>
              <p class="text-sm text-on-surface-variant line-clamp-1">{{ item.message }}</p>
            </div>
            <span class="material-symbols-outlined text-on-surface-variant/50">chevron_right</span>
          </div>
          
          <div v-if="todos.feedbacks.length === 0 && todos.maintenance.length === 0" class="flex flex-col items-center justify-center py-10 bg-surface-container-lowest rounded-3xl border border-surface-variant/20 border-dashed">
            <span class="material-symbols-outlined text-4xl text-on-surface-variant/30 mb-2">done_all</span>
            <span class="text-sm text-on-surface-variant font-medium">当前无待办事项</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
