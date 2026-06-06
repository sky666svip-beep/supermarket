<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { forgotPassword, sendVerificationCode } from '../../api/index'

const router = useRouter()
const username = ref('')
const email = ref('')
const newPassword = ref('')
const code = ref('')
const countdown = ref(0)
let timer: any = null

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

const validateEmail = (val: string) => {
  if (!val) return true // Let required rule handle empty
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return '邮箱格式不正确'
  return true
}

const onSendCode = async () => {
  if (!email.value) return showToast('请填写邮箱')
  if (validateEmail(email.value) !== true) {
    return showToast('请输入正确的邮箱')
  }
  try {
    const res = await sendVerificationCode({ email: email.value, type: 'forgot_password' })
    if (res.success) {
      showToast('验证码已发送')
      countdown.value = 60
      timer = setInterval(() => {
        countdown.value--
        if (countdown.value <= 0) clearInterval(timer)
      }, 1000)
    }
  } catch (error: any) {
    showToast(error.response?.data?.error || '发送失败')
  }
}

const onSubmit = async () => {
  try {
    const res = await forgotPassword({ 
      username: username.value, 
      email: email.value, 
      newPassword: newPassword.value,
      code: code.value
    })
    if (res.success) {
      showToast('密码已重置，请登录')
      router.push('/login')
    }
  } catch (error: any) {
    showToast(error.response?.data?.error || '重置密码失败')
  }
}
</script>

<template>
  <div class="bg-background text-on-background min-h-screen font-body-md selection:bg-primary-container selection:text-white flex flex-col">
    <!-- Header -->
    <header class="bg-surface/80 backdrop-blur-md w-full top-0 sticky flex flex-col z-20 transition-colors">
      <div class="flex items-center justify-between px-margin-mobile h-16 w-full max-w-2xl mx-auto">
        <button type="button" @click="router.push('/login')" class="flex items-center justify-center text-primary hover:bg-surface-container-low w-10 h-10 rounded-full transition-colors active:scale-95">
          <i-material-symbols-arrow-back-ios-new></i-material-symbols-arrow-back-ios-new>
        </button>
      </div>
    </header>

    <main class="flex-1 w-full max-w-2xl mx-auto px-margin-mobile flex flex-col pt-5 pb-20">
      <div class="flex flex-col items-center mb-8">
        <div class="w-16 h-16 bg-primary-container text-white rounded-3xl flex items-center justify-center mb-4 shadow-sm -rotate-3">
          <i-material-symbols-lock-reset  class="text-[32px]"></i-material-symbols-lock-reset>
        </div>
        <h1 class="font-headline-md text-2xl font-bold text-on-surface mb-2">找回密码</h1>
        <p class="text-base text-on-surface-variant">请验证您的邮箱并设置新密码</p>
      </div>

      <form @submit.prevent="onSubmit" class="flex flex-col gap-5">
        <div class="flex flex-col gap-4 bg-surface-container-lowest p-5 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-surface-variant/30">
          
          <div class="flex flex-col gap-1.5">
            <label class="font-label-md text-sm text-on-surface-variant px-1">用户名</label>
            <div class="relative flex items-center">
              <i-material-symbols-person-outline  class="absolute left-4 text-on-surface-variant/70"></i-material-symbols-person-outline>
              <input 
                v-model="username"
                type="text"
                required
                placeholder="请输入您的用户名"
                class="w-full bg-surface-container-lowest border border-surface-variant/50 rounded-xl py-3.5 pl-12 pr-4 text-on-surface font-body-md placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              />
            </div>
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="font-label-md text-sm text-on-surface-variant px-1">注册邮箱</label>
            <div class="relative flex items-center">
              <i-material-symbols-mail-outline  class="absolute left-4 text-on-surface-variant/70"></i-material-symbols-mail-outline>
              <input 
                v-model="email"
                type="email"
                required
                placeholder="请输入绑定的邮箱"
                class="w-full bg-surface-container-lowest border border-surface-variant/50 rounded-xl py-3.5 pl-12 pr-4 text-on-surface font-body-md placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              />
            </div>
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="font-label-md text-sm text-on-surface-variant px-1">验证码</label>
            <div class="relative flex items-center gap-3">
              <div class="relative flex items-center flex-1">
                <i-material-symbols-verified-outline  class="absolute left-4 text-on-surface-variant/70"></i-material-symbols-verified-outline>
                <input 
                  v-model="code"
                  type="text"
                  required
                  placeholder="请输入邮箱验证码"
                  class="w-full bg-surface-container-lowest border border-surface-variant/50 rounded-xl py-3.5 pl-12 pr-4 text-on-surface font-body-md placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                />
              </div>
              <button 
                type="button"
                :disabled="countdown > 0" 
                @click.prevent="onSendCode"
                class="bg-blue-500/10 text-primary font-bold text-sm px-4 py-3.5 rounded-xl whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/20 transition-colors"
              >
                {{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
              </button>
            </div>
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="font-label-md text-sm text-on-surface-variant px-1">新密码</label>
            <div class="relative flex items-center">
              <i-material-symbols-lock-outline  class="absolute left-4 text-on-surface-variant/70"></i-material-symbols-lock-outline>
              <input 
                v-model="newPassword"
                type="password"
                required
                placeholder="请输入新密码"
                class="w-full bg-surface-container-lowest border border-surface-variant/50 rounded-xl py-3.5 pl-12 pr-4 text-on-surface font-body-md placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              />
            </div>
          </div>
        </div>

        <div class="mt-4 flex flex-col gap-4">
          <button 
            type="submit" 
            class="w-full bg-blue-500 text-white py-4 rounded-full font-bold shadow-md hover:bg-primary/90 active:scale-[0.98] transition-all"
            style="font-size: 19px !important; color: #ffffff !important;"
          >
            重置密码
          </button>
          
          <div class="flex items-center justify-center mt-2">
            <button type="button" @click="router.push('/login')" class="text-sm text-on-surface-variant font-medium hover:text-primary transition-colors">
              <span class="text-blue hover:underline underline-offset-4">返回登录</span>
            </button>
          </div>
        </div>
      </form>
    </main>
  </div>
</template>
