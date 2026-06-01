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
  <div class="h-full bg-white p-6 pt-12">
    <h1 class="text-2xl font-bold mb-8 text-center">用户登录</h1>
    <van-form @submit="onSubmit">
      <div class="mb-8 space-y-4">
        <van-field
          v-model="username"
          name="username"
          label="用户名"
          placeholder="请输入用户名"
          :rules="[{ required: true, message: '请填写用户名' }]"
          class="rounded-lg shadow-sm border border-gray-100 py-3"
        />
        <van-field
          v-model="password"
          type="password"
          name="password"
          label="密码"
          placeholder="请输入密码"
          :rules="[{ required: true, message: '请填写密码' }]"
          class="rounded-lg shadow-sm border border-gray-100 py-3"
        />
      </div>
      <div class="space-y-6">
        <van-button round block type="primary" native-type="submit" class="!h-12 text-lg">
          登录
        </van-button>
        <div class="flex justify-between px-2 mt-6 text-sm text-blue-500">
          <span @click="router.push('/register')">没有账号？去注册</span>
          <span @click="router.push('/forgot-password')">忘记密码？</span>
        </div>
      </div>
    </van-form>
  </div>
</template>
