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
  <div class="space-y-4">
    <div class="bg-white p-4 rounded-lg shadow-sm">
      <div class="flex items-center space-x-3 mb-2">
        <van-image round width="48" height="48" src="https://fastly.jsdelivr.net/npm/@vant/assets/cat.jpeg" />
        <div>
          <h2 class="text-lg font-bold">李师傅</h2>
          <van-tag type="primary">运维组长</van-tag>
        </div>
      </div>
    </div>
    
    <van-grid :column-num="2" :border="false" class="bg-white rounded-lg overflow-hidden shadow-sm">
      <van-grid-item icon="tools-o" text="设备报修" @click="router.push('/staff/maintenance')" />
      <van-grid-item icon="scan" text="巡检上报" @click="router.push('/staff/patrol')" />
    </van-grid>
    
    <van-cell-group inset title="待办事项" class="!mx-0 !mt-6">
      <van-cell 
        v-for="item in todos.feedbacks" 
        :key="item.id" 
        :title="item.facilityType + '故障'" 
        :label="item.message" 
        value="顾客反馈" 
        is-link 
      />
      <van-cell 
        v-for="item in todos.maintenance" 
        :key="item.id" 
        :title="item.location" 
        :label="item.message" 
        value="运维报修" 
        is-link 
      />
      <div v-if="todos.feedbacks.length === 0 && todos.maintenance.length === 0" class="text-center py-6 text-gray-400 text-sm">
        当前无待办事项
      </div>
    </van-cell-group>
  </div>
</template>
