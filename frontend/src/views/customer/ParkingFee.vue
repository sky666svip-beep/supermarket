<!-- 模块：停车计费 -->
<script setup lang="ts">
import { useRouter } from 'vue-router'
import ParkingCalculator from '../../components/ParkingCalculator.vue'

const router = useRouter()
const onClickLeft = () => {
  router.back()
}
</script>

<template>
  <div class="bg-background text-on-background font-body-md min-h-screen pb-24 md:pb-0 flex flex-col z-50 fixed inset-0">
    <!-- TopAppBar -->
    <header class="w-full sticky top-0 z-50 bg-surface/70 dark:bg-surface-dim/70 backdrop-blur-md flex items-center justify-between px-margin-mobile py-sm md:hidden">
      <button @click="onClickLeft" class="text-primary dark:text-primary-fixed active:scale-95 duration-200 p-2 -ml-2 rounded-full hover:bg-surface-container-high transition-colors">
        <span class="material-symbols-outlined font-headline-sm text-headline-sm">arrow_back_ios_new</span>
      </button>
      <h1 class="font-headline-sm text-headline-sm text-on-surface font-bold absolute left-1/2 transform -translate-x-1/2">停车计费</h1>
      <div class="w-10"></div> <!-- Spacer for centering -->
    </header>

    <div class="flex-1 overflow-y-auto hide-scrollbar">
      <ParkingCalculator />
    </div>
  </div>
</template>
