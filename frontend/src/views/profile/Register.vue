<!-- 模块：用户注册 -->
<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { register, sendVerificationCode } from '../../api/index'
import { showToast } from 'vant'

const router = useRouter()
const username = ref('')
const password = ref('')
const email = ref('')
const code = ref('')
const countdown = ref(0)
let timer: any = null

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

const validateUsername = (val: string) => {
  const len = val.trim().length
  if (len < 3 || len > 20) return '用户名长度必须在3-20个字符之间'
  return true
}

const validatePassword = (val: string) => {
  if (!val) return true // Let required rule handle empty
  const hasLetter = /[a-zA-Z]/.test(val)
  const hasNumber = /[0-9]/.test(val)
  if (val.length < 6 || !hasLetter || !hasNumber) return '密码至少6位，且包含字母和数字'
  return true
}

const validateEmail = (val: string) => {
  if (!val) return true
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return '邮箱格式不正确'
  return true
}

const onSendCode = async () => {
  if (!email.value) return showToast('请填写邮箱')
  if (validateEmail(email.value) !== true) {
    return showToast('请输入正确的邮箱')
  }
  try {
    const res = await sendVerificationCode({ email: email.value, type: 'register' })
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
    const res = await register({ 
      username: username.value, 
      password: password.value, 
      email: email.value,
      code: code.value
    })
    if (res.success) {
      showToast('注册成功，请登录')
      router.push('/login')
    }
  } catch (error: any) {
    showToast(error.response?.data?.error || '注册失败')
  }
}
</script>

<template>
  <div class="h-full bg-white p-6 pt-12">
    <h1 class="text-2xl font-bold mb-8 text-center">用户注册</h1>
    <van-form @submit="onSubmit">
      <div class="mb-8 space-y-4">
        <van-field
          v-model="username"
          name="username"
          label="用户名"
          placeholder="请输入用户名 (3-20个字符)"
          :rules="[{ required: true, message: '请填写用户名' }, { validator: validateUsername }]"
          class="rounded-lg shadow-sm border border-gray-100 py-3"
        />
        <van-field
          v-model="password"
          type="password"
          name="password"
          label="密码"
          placeholder="请输入密码"
          :rules="[{ required: true, message: '请填写密码' }, { validator: validatePassword }]"
          class="rounded-lg shadow-sm border border-gray-100 py-3"
        />
        <van-field
          v-model="email"
          type="email"
          name="email"
          label="邮箱"
          placeholder="请输入邮箱 (可选)"
          :rules="[{ validator: validateEmail }]"
          class="rounded-lg shadow-sm border border-gray-100 py-3"
        />
        <van-field
          v-if="email && validateEmail(email) === true"
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
      </div>
      <div class="space-y-6">
        <van-button round block type="primary" native-type="submit" class="!h-12 text-lg">
          注册
        </van-button>
        <div class="text-center mt-6 text-sm text-blue-500" @click="router.push('/login')">
          已有账号？去登录
        </div>
      </div>
    </van-form>
  </div>
</template>
