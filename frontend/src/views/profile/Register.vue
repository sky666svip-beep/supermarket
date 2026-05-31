<!-- 模块：用户注册 -->
<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { register } from '../../api/index'
import { showToast } from 'vant'

const router = useRouter()
const username = ref('')
const password = ref('')

const validateUsername = (val: string) => {
  const len = val.trim().length
  if (len < 3 || len > 20) return '用户名长度必须在3-20个字符之间'
  return true
}

const validatePassword = (val: string) => {
  const hasLetter = /[a-zA-Z]/.test(val)
  const hasNumber = /[0-9]/.test(val)
  if (val.length < 6 || !hasLetter || !hasNumber) return '密码至少6位，且包含字母和数字'
  return true
}

const onSubmit = async () => {
  try {
    const res = await register({ username: username.value, password: password.value })
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
      <van-cell-group inset class="!mx-0 shadow-sm border border-gray-100 mb-6">
        <van-field
          v-model="username"
          name="username"
          label="用户名"
          placeholder="请输入用户名 (3-20个字符)"
          :rules="[{ required: true, message: '请填写用户名' }, { validator: validateUsername }]"
        />
        <van-field
          v-model="password"
          type="password"
          name="password"
          label="密码"
          placeholder="请输入密码"
          :rules="[{ required: true, message: '请填写密码' }, { validator: validatePassword }]"
        />
      </van-cell-group>
      <div class="space-y-4">
        <van-button round block type="primary" native-type="submit">
          注册
        </van-button>
        <div class="text-center text-sm text-gray-500" @click="router.push('/login')">
          已有账号？去登录
        </div>
      </div>
    </van-form>
  </div>
</template>
