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
      <van-cell-group inset class="!mx-0 shadow-sm border border-gray-100 mb-6">
        <van-field
          v-model="username"
          name="username"
          label="用户名"
          placeholder="请输入用户名"
          :rules="[{ required: true, message: '请填写用户名' }]"
        />
        <van-field
          v-model="password"
          type="password"
          name="password"
          label="密码"
          placeholder="请输入密码"
          :rules="[{ required: true, message: '请填写密码' }]"
        />
      </van-cell-group>
      <div class="space-y-4">
        <van-button round block type="primary" native-type="submit">
          登录
        </van-button>
        <div class="text-center text-sm text-blue-500" @click="router.push('/register')">
          没有账号？去注册
        </div>
      </div>
    </van-form>
  </div>
</template>
