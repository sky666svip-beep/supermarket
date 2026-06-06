<script setup lang="ts">
// 模块：个人中心与账号管理
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { showConfirmDialog, showToast, showDialog } from 'vant'
import { updateProfile, updatePassword, bindEmail, sendVerificationCode } from '../../api/index'

const router = useRouter()

const user = ref<any>(null)
const showProfileDialog = ref(false)
const showPasswordDialog = ref(false)
const showEmailDialog = ref(false)

const profileForm = ref({ nickname: '' })
const pwdForm = ref({ oldPassword: '', newPassword: '' })
const emailForm = ref({ email: '', code: '', password: '' })
const emailCountdown = ref(0)
let emailTimer: any = null

onMounted(() => {
  const stored = localStorage.getItem('user')
  if (stored) {
    user.value = JSON.parse(stored)
  }
})

const refreshing = ref(false)
const onRefresh = async () => {
  const stored = localStorage.getItem('user')
  if (stored) {
    user.value = JSON.parse(stored)
  }
  // Mock small delay for UX
  await new Promise(r => setTimeout(r, 500))
  refreshing.value = false
}

onUnmounted(() => {
  if (emailTimer) clearInterval(emailTimer)
})

const onLogout = () => {
  showConfirmDialog({
    title: '退出登录',
    message: '确定要退出当前账号吗？',
  }).then(() => {
    localStorage.removeItem('user')
    user.value = null
    showToast('已退出')
  }).catch(() => {})
}

const onSaveProfile = async () => {
  try {
    const res = await updateProfile({ userId: user.value.id, nickname: profileForm.value.nickname })
    if (res.success) {
      user.value.nickname = res.user.nickname
      localStorage.setItem('user', JSON.stringify(user.value))
      showToast('资料已更新')
      showProfileDialog.value = false
    }
  } catch (e: any) {
    showToast({ message: e.response?.data?.error || '更新失败', duration: 4000 })
  }
}

const validateUsername = (val: string) => {
  const emojiRegex = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u
  if (emojiRegex.test(val)) return '昵称不能包含表情符号'
  const len = val.trim().length
  if (len < 3 || len > 10) return '昵称必须在3-10个字符之间'
  return true
}

const validateNewPassword = (val: string) => {
  const hasLetter = /[a-zA-Z]/.test(val)
  const hasNumber = /[0-9]/.test(val)
  if (val.length < 6 || !hasLetter || !hasNumber) return '密码至少6位，且包含字母和数字'
  return true
}

const onSavePassword = async () => {
  try {
    const res = await updatePassword({ 
      userId: user.value.id, 
      oldPassword: pwdForm.value.oldPassword, 
      newPassword: pwdForm.value.newPassword 
    })
    if (res.success) {
      showToast('密码已修改，请重新登录')
      localStorage.removeItem('user')
      user.value = null
      showPasswordDialog.value = false
      router.push('/login')
    }
  } catch (e: any) {
    showToast(e.response?.data?.error || '修改失败')
  }
}

const validateEmail = (val: string) => {
  if (!val) return true // Let required rule handle empty
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return '邮箱格式不正确'
  return true
}

const onSendEmailCode = async () => {
  if (!emailForm.value.email) return showToast('请填写邮箱')
  if (validateEmail(emailForm.value.email) !== true) {
    return showToast('请输入正确的邮箱')
  }
  try {
    const res = await sendVerificationCode({ email: emailForm.value.email, type: 'bind_email' })
    if (res.success) {
      showToast('验证码已发送')
      emailCountdown.value = 60
      emailTimer = setInterval(() => {
        emailCountdown.value--
        if (emailCountdown.value <= 0) clearInterval(emailTimer)
      }, 1000)
    }
  } catch (error: any) {
    showToast(error.response?.data?.error || '发送失败')
  }
}

const onBindEmail = async () => {
  try {
    const res = await bindEmail({ 
      userId: user.value.id, 
      email: emailForm.value.email,
      code: emailForm.value.code,
      password: emailForm.value.password
    })
    if (res.success) {
      user.value.email = emailForm.value.email
      localStorage.setItem('user', JSON.stringify(user.value))
      showToast('邮箱绑定成功')
      showEmailDialog.value = false
    }
  } catch (e: any) {
    showToast(e.response?.data?.error || '绑定失败')
  }
}

const onShowAbout = () => {
  showDialog({
    title: '关于大张助手',
    message: '版本：v2.6.3\n\n联系方式：19937141560\n\n如有任何问题或建议，欢迎联系我们。',
    confirmButtonText: '知道了',
  }).catch(() => {})
}

</script>

<template>
  <div class="bg-surface text-on-surface font-body-md antialiased min-h-screen">
    <van-pull-refresh v-model="refreshing" @refresh="onRefresh" class="min-h-screen">
    <main class="px-0 md:px-1 py-lg max-w-3xl mx-auto space-y-lg pb-24">
      
      <!-- User Profile Card (Logged In) -->
      <div v-if="user" class="bg-surface-container-lowest rounded-xl shadow-sm p-md flex items-center gap-md">
        <div class="w-20 h-20 rounded-full overflow-hidden shrink-0 border-2 border-surface-container">
          <img alt="User Avatar" class="w-full h-full object-cover" src="https://fastly.jsdelivr.net/npm/@vant/assets/cat.jpeg" />
        </div>
        <div class="flex flex-col gap-xs">
          <h2 class="font-headline-md text-headline-md text-on-surface">{{ user.nickname || user.username }}</h2>
          <span class="font-label-md text-label-md text-red-500 bg-white px-2 py-1 rounded-DEFAULT self-start border border-red-500">
            {{ user.role === 'admin' ? '管理员' : '顾客' }}
          </span>
        </div>
      </div>

      <!-- User Profile Card (Not Logged In) -->
      <div v-else class="bg-surface-container-lowest rounded-xl shadow-sm p-md flex items-center gap-md cursor-pointer hover:bg-surface-container-low transition-colors" @click="router.push('/login')">
        <div class="w-20 h-20 rounded-full overflow-hidden shrink-0 border-2 border-surface-container opacity-50">
          <img alt="User Avatar" class="w-full h-full object-cover grayscale" src="https://fastly.jsdelivr.net/npm/@vant/assets/cat.jpeg" />
        </div>
        <div class="flex flex-col gap-xs">
          <h2 class="font-headline-md text-headline-md text-on-surface">未登录</h2>
          <span class="font-label-md text-label-md text-secondary">点击此处进行登录或注册</span>
        </div>
      </div>

      <!-- Shopping Services -->
      <section class="space-y-sm">
        <h3 class="font-label-md text-label-md text-secondary uppercase tracking-wider pl-xs">购物服务</h3>
        <div class="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden flex flex-col">
          <a class="flex items-center justify-between px-4 py-3.5 hover:bg-surface-container-low transition-colors border-b border-surface-variant last:border-0 group cursor-pointer" @click.prevent="router.push('/customer/checklist')">
            <div class="flex items-center gap-3 text-on-surface-variant group-hover:text-primary transition-colors">
              <i-material-symbols-receipt-long-outline></i-material-symbols-receipt-long-outline>
              <span class="font-body-lg text-body-lg text-on-surface">我的购物清单</span>
            </div>
            <i-material-symbols-chevron-right  class="text-outline-variant group-hover:text-primary transition-colors"></i-material-symbols-chevron-right>
          </a>
          <a class="flex items-center justify-between px-4 py-3.5 hover:bg-surface-container-low transition-colors border-b border-surface-variant last:border-0 group cursor-pointer" @click.prevent="router.push('/customer/feedback')">
            <div class="flex items-center gap-3 text-on-surface-variant group-hover:text-primary transition-colors">
              <i-material-symbols-rate-review-outline></i-material-symbols-rate-review-outline>
              <span class="font-body-lg text-body-lg text-on-surface">我的反馈记录</span>
            </div>
            <i-material-symbols-chevron-right  class="text-outline-variant group-hover:text-primary transition-colors"></i-material-symbols-chevron-right>
          </a>
        </div>
      </section>

      <!-- Community Interaction -->
      <section class="space-y-sm">
        <h3 class="font-label-md text-label-md text-secondary uppercase tracking-wider pl-xs">社区互动</h3>
        <div class="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden flex flex-col">
          <a class="flex items-center justify-between px-4 py-3.5 hover:bg-surface-container-low transition-colors border-b border-surface-variant last:border-0 group cursor-pointer" @click.prevent="router.push('/profile/posts')">
            <div class="flex items-center gap-3 text-on-surface-variant group-hover:text-primary transition-colors">
              <i-material-symbols-post-add></i-material-symbols-post-add>
              <span class="font-body-lg text-body-lg text-on-surface">我的帖子</span>
            </div>
            <i-material-symbols-chevron-right  class="text-outline-variant group-hover:text-primary transition-colors"></i-material-symbols-chevron-right>
          </a>
          <a class="flex items-center justify-between px-4 py-3.5 hover:bg-surface-container-low transition-colors border-b border-surface-variant last:border-0 group cursor-pointer" @click.prevent="router.push('/profile/comments')">
            <div class="flex items-center gap-3 text-on-surface-variant group-hover:text-primary transition-colors">
              <i-material-symbols-chat-bubble-outline></i-material-symbols-chat-bubble-outline>
              <span class="font-body-lg text-body-lg text-on-surface">我的评论</span>
            </div>
            <i-material-symbols-chevron-right  class="text-outline-variant group-hover:text-primary transition-colors"></i-material-symbols-chevron-right>
          </a>
          <a class="flex items-center justify-between px-4 py-3.5 hover:bg-surface-container-low transition-colors border-b border-surface-variant last:border-0 group cursor-pointer" @click.prevent="router.push('/profile/collections')">
            <div class="flex items-center gap-3 text-on-surface-variant group-hover:text-primary transition-colors">
              <i-material-symbols-star-outline class="text-[24px]" />
              <span class="font-body-lg text-body-lg text-on-surface">我的收藏</span>
            </div>
            <i-material-symbols-chevron-right  class="text-outline-variant group-hover:text-primary transition-colors"></i-material-symbols-chevron-right>
          </a>
          <a class="flex items-center justify-between px-4 py-3.5 hover:bg-surface-container-low transition-colors border-b border-surface-variant last:border-0 group cursor-pointer" @click.prevent="router.push('/profile/messages')">
            <div class="flex items-center gap-3 text-on-surface-variant group-hover:text-primary transition-colors">
              <i-material-symbols-notifications-active-outline></i-material-symbols-notifications-active-outline>
              <span class="font-body-lg text-body-lg text-on-surface">收到的回复</span>
            </div>
            <i-material-symbols-chevron-right  class="text-outline-variant group-hover:text-primary transition-colors"></i-material-symbols-chevron-right>
          </a>
        </div>
      </section>

      <!-- Account Management -->
      <section class="space-y-sm">
        <h3 class="font-label-md text-label-md text-secondary uppercase tracking-wider pl-xs">账号管理</h3>
        <div class="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden flex flex-col">
          <template v-if="user">
            <a v-if="user.role === 'admin'" class="flex items-center justify-between p-md hover:bg-surface-container-low transition-colors border-b border-surface-variant last:border-0 group cursor-pointer" @click.prevent="$router.push('/admin')">
              <div class="flex items-center gap-3 text-on-surface-variant group-hover:text-primary transition-colors">
                <i-material-symbols-admin-panel-settings-outline></i-material-symbols-admin-panel-settings-outline>
                <span class="font-body-lg text-body-lg text-on-surface">管理员后台</span>
              </div>
              <div class="flex items-center gap-xs">
                <span class="font-body-md text-body-md text-outline">工单处理</span>
                <i-material-symbols-chevron-right  class="text-outline-variant group-hover:text-primary transition-colors"></i-material-symbols-chevron-right>
              </div>
            </a>
            <!-- Edit Profile -->
            <a class="flex items-center justify-between px-4 py-3.5 hover:bg-surface-container-low transition-colors border-b border-surface-variant last:border-0 group cursor-pointer" @click.prevent="profileForm.nickname = user.nickname || ''; showProfileDialog = true">
              <div class="flex items-center gap-3 text-on-surface-variant group-hover:text-primary transition-colors">
                <i-material-symbols-edit-square-outline></i-material-symbols-edit-square-outline>
                <span class="font-body-lg text-body-lg text-on-surface">修改个人资料</span>
              </div>
              <i-material-symbols-chevron-right  class="text-outline-variant group-hover:text-primary transition-colors"></i-material-symbols-chevron-right>
            </a>
            <!-- Change Password -->
            <a class="flex items-center justify-between px-4 py-3.5 hover:bg-surface-container-low transition-colors border-b border-surface-variant last:border-0 group cursor-pointer" @click.prevent="pwdForm.oldPassword = ''; pwdForm.newPassword = ''; showPasswordDialog = true">
              <div class="flex items-center gap-3 text-on-surface-variant group-hover:text-primary transition-colors">
                <i-material-symbols-lock-outline></i-material-symbols-lock-outline>
                <span class="font-body-lg text-body-lg text-on-surface">修改密码</span>
              </div>
              <i-material-symbols-chevron-right  class="text-outline-variant group-hover:text-primary transition-colors"></i-material-symbols-chevron-right>
            </a>
            <!-- Bind Email -->
            <a v-if="!user.email" class="flex items-center justify-between p-md hover:bg-surface-container-low transition-colors border-b border-surface-variant last:border-0 group cursor-pointer" @click.prevent="emailForm.email = ''; emailForm.code = ''; emailForm.password = ''; showEmailDialog = true">
              <div class="flex items-center gap-3 text-on-surface-variant group-hover:text-primary transition-colors">
                <i-material-symbols-mail-outline></i-material-symbols-mail-outline>
                <span class="font-body-lg text-body-lg text-on-surface">绑定邮箱</span>
              </div>
              <i-material-symbols-chevron-right  class="text-outline-variant group-hover:text-primary transition-colors"></i-material-symbols-chevron-right>
            </a>
            <!-- Logout -->
            <a class="flex items-center justify-between px-4 py-3.5 hover:bg-surface-container-low transition-colors border-b border-surface-variant last:border-0 group cursor-pointer" @click.prevent="onLogout">
              <div class="flex items-center gap-md text-on-surface-variant group-hover:text-error transition-colors">
                <i-material-symbols-logout></i-material-symbols-logout>
                <span class="font-body-lg text-body-lg text-on-surface group-hover:text-error">退出登录</span>
              </div>
              <i-material-symbols-chevron-right  class="text-outline-variant group-hover:text-error transition-colors"></i-material-symbols-chevron-right>
            </a>
          </template>
          
          <!-- About -->
          <a class="flex items-center justify-between px-4 py-3.5 hover:bg-surface-container-low transition-colors border-b border-surface-variant last:border-0 group cursor-pointer" @click.prevent="onShowAbout">
            <div class="flex items-center gap-3 text-on-surface-variant group-hover:text-primary transition-colors">
              <i-material-symbols-info-outline></i-material-symbols-info-outline>
              <span class="font-body-lg text-body-lg text-on-surface">关于大张助手</span>
            </div>
            <div class="flex items-center gap-xs">
              <span class="font-body-md text-body-md text-outline">v2.6.3</span>
              <i-material-symbols-chevron-right  class="text-outline-variant group-hover:text-primary transition-colors"></i-material-symbols-chevron-right>
            </div>
          </a>
        </div>
      </section>

      <!-- Profile Dialog -->
      <van-dialog v-model:show="showProfileDialog" title="修改个人资料" :show-confirm-button="false" show-cancel-button>
        <van-form @submit="onSaveProfile" class="mt-4">
          <van-field v-model="profileForm.nickname" label="昵称" placeholder="请输入新昵称 (3-20个字符)" :rules="[{ required: true, message: '请填写昵称' }, { validator: validateUsername }]" />
          <div class="px-6 py-4"><van-button round block type="primary" native-type="submit" style="height: 40px; font-size: 14px;">保存</van-button></div>
        </van-form>
      </van-dialog>

      <!-- Password Dialog -->
      <van-dialog v-model:show="showPasswordDialog" title="修改密码" show-cancel-button :before-close="() => true">
        <van-form @submit="onSavePassword" class="mt-4">
          <van-field v-model="pwdForm.oldPassword" type="password" label="原密码" placeholder="请输入原密码" :rules="[{ required: true, message: '请填写原密码' }]" />
          <van-field v-model="pwdForm.newPassword" type="password" label="新密码" placeholder="请输入新密码" :rules="[{ required: true, message: '请填写新密码' }, { validator: validateNewPassword }]" />
          <div class="px-6 py-4"><van-button round block type="primary" native-type="submit" style="height: 40px; font-size: 14px;">确认修改</van-button></div>
        </van-form>
      </van-dialog>

      <!-- Email Bind Dialog -->
      <van-dialog v-model:show="showEmailDialog" title="绑定邮箱" show-cancel-button :before-close="() => true">
        <van-form @submit="onBindEmail" class="mt-4">
          <van-field v-model="emailForm.email" type="email" label="邮箱" placeholder="请输入您的邮箱" :rules="[{ required: true, message: '请填写邮箱' }, { validator: validateEmail }]" />
          <van-field v-model="emailForm.code" label="验证码" placeholder="请输入邮箱验证码" :rules="[{ required: true, message: '请填写验证码' }]">
            <template #button>
              <van-button size="small" type="primary" :disabled="emailCountdown > 0" @click.prevent="onSendEmailCode">
                {{ emailCountdown > 0 ? `${emailCountdown}s` : '获取验证码' }}
              </van-button>
            </template>
          </van-field>
          <van-field v-model="emailForm.password" type="password" label="当前密码" placeholder="请输入密码以验证身份" :rules="[{ required: true, message: '请填写当前密码' }]" />
          <div class="px-6 py-4"><van-button round block type="primary" native-type="submit" style="height: 40px; font-size: 14px;">绑定</van-button></div>
        </van-form>
      </van-dialog>
    </main>
    </van-pull-refresh>
  </div>
</template>
