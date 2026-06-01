<script setup lang="ts">
import { useRouter } from 'vue-router'
import ParkingCalculator from '../../components/ParkingCalculator.vue'

const router = useRouter()
const onClickLeft = () => {
  router.back()
}
</script>

<template>
  <div class="fixed inset-0 bg-white flex flex-col overflow-hidden z-50">
    <van-nav-bar
      title="停车计费"
      left-arrow
      @click-left="onClickLeft"
      class="!bg-white"
    />
    <div class="flex-1 overflow-hidden">
      <ParkingCalculator />
    </div>
  </div>
</template>
