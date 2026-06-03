<!-- 模块：用户登录 -->
<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { login } from '../../api/index'
import { showToast } from 'vant'

const router = useRouter()
const username = ref('')
const password = ref('')

const onSubmit = async () => {
  try {
    const res = await login({ username: username.value, password: password.value })
    if (res.success) {
      localStorage.setItem('user', JSON.stringify(res.user))
      showToast('登录成功')
      router.push('/profile')
    }
  } catch (error: any) {
    showToast(error.response?.data?.error || '登录失败')
  }
}
</script>

<template>
  <div class="bg-background text-on-background min-h-screen font-body-md selection:bg-primary-container selection:text-white flex flex-col">
    <!-- Header -->
    <header class="bg-surface/80 backdrop-blur-md w-full top-0 sticky flex flex-col z-20 transition-colors">
      <div class="flex items-center justify-between px-margin-mobile h-16 w-full max-w-2xl mx-auto">
        <button type="button" @click="router.push('/profile')" class="flex items-center justify-center text-primary hover:bg-surface-container-low w-10 h-10 rounded-full transition-colors active:scale-95">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
    </header>

    <main class="flex-1 w-full max-w-2xl mx-auto px-margin-mobile flex flex-col pt-5 pb-20">
      <div class="flex flex-col items-center mb-10">
        <div class="w-20 h-20 bg-primary-container text-white rounded-3xl flex items-center justify-center mb-6 shadow-sm rotate-3">
          <span class="material-symbols-outlined text-[40px]">storefront</span>
        </div>
        <h1 class="font-headline-md text-2xl font-bold text-on-surface mb-2">欢迎回来</h1>
        <p class="text-base text-on-surface-variant">登录以继续使用您的账号</p>
      </div>

      <form @submit.prevent="onSubmit" class="flex flex-col gap-5">
        <div class="flex flex-col gap-4 bg-surface-container-lowest p-5 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-surface-variant/30">
          <div class="flex flex-col gap-1.5">
            <label class="font-label-md text-base text-on-surface-variant px-1">用户名</label>
            <div class="relative flex items-center">
              <span class="material-symbols-outlined absolute left-4 text-on-surface-variant/70">person</span>
              <input 
                v-model="username"
                type="text"
                required
                placeholder="请输入用户名"
                class="w-full bg-surface-container-lowest border border-surface-variant/50 rounded-xl py-3.5 pl-12 pr-4 text-on-surface font-body-md placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              />
            </div>
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="font-label-md text-base text-on-surface-variant px-1">密码</label>
            <div class="relative flex items-center">
              <span class="material-symbols-outlined absolute left-4 text-on-surface-variant/70">lock</span>
              <input 
                v-model="password"
                type="password"
                required
                placeholder="请输入密码"
                class="w-full bg-surface-container-lowest border border-surface-variant/50 rounded-xl py-3.5 pl-12 pr-4 text-on-surface font-body-md placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              />
            </div>
          </div>
        </div>

        <div class="mt-4 flex flex-col gap-4">
          <button 
            type="submit" 
            class="w-full bg-primary text-white py-4 rounded-full font-bold shadow-md hover:bg-primary/90 active:scale-[0.98] transition-all"
            style="font-size: 19px !important; color: #ffffff !important;"
          >
            登录
          </button>
          
          <div class="flex items-center justify-center gap-4 text-base font-medium mt-2">
            <button type="button" @click="router.push('/register')" class="text-primary hover:underline underline-offset-4">
              注册新账号
            </button>
            <span class="w-1 h-1 rounded-full bg-surface-variant"></span>
            <button type="button" @click="router.push('/forgot-password')" class="text-on-surface-variant hover:text-primary transition-colors">
              忘记密码？
            </button>
          </div>
        </div>
      </form>
    </main>
  </div>
</template>
