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

const validatePassword = (val: string) => {
  if (!val) return true // Let required rule handle empty
  const hasLetter = /[a-zA-Z]/.test(val)
  const hasNumber = /[0-9]/.test(val)
  if (val.length < 6 || !hasLetter || !hasNumber) return '密码至少6位，且包含字母和数字'
  return true
}

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
  <div class="h-full bg-white p-6 pt-12">
    <h1 class="text-2xl font-bold mb-8 text-center">找回密码</h1>
    <van-form @submit="onSubmit">
      <div class="mb-8 space-y-4">
        <van-field
          v-model="username"
          name="username"
          label="用户名"
          placeholder="请输入您的用户名"
          :rules="[{ required: true, message: '请填写用户名' }]"
          class="rounded-lg shadow-sm border border-gray-100 py-3"
        />
        <van-field
          v-model="email"
          type="email"
          name="email"
          label="注册邮箱"
          placeholder="请输入绑定的邮箱"
          :rules="[{ required: true, message: '请填写邮箱' }, { validator: validateEmail }]"
          class="rounded-lg shadow-sm border border-gray-100 py-3"
        />
        <van-field
          v-model="code"
          name="code"
          label="验证码"
          placeholder="请输入邮箱验证码"
          :rules="[{ required: true, message: '请填写验证码' }]"
          class="rounded-lg shadow-sm border border-gray-100 py-3"
        >
          <template #button>
            <van-button size="small" type="primary" :disabled="countdown > 0" @click.prevent="onSendCode">
              {{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
            </van-button>
          </template>
        </van-field>
        <van-field
          v-model="newPassword"
          type="password"
          name="newPassword"
          label="新密码"
          placeholder="请输入新密码"
          :rules="[{ required: true, message: '请填写新密码' }, { validator: validatePassword }]"
          class="rounded-lg shadow-sm border border-gray-100 py-3"
        />
      </div>
      <div class="space-y-6">
        <van-button round block type="primary" native-type="submit" class="!h-12 text-lg">
          重置密码
        </van-button>
        <div class="text-center mt-6 text-sm text-blue-500" @click="router.push('/login')">
          返回登录
        </div>
      </div>
    </van-form>
  </div>
</template>
