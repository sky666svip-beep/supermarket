<script setup lang="ts">
// 模块：顾客问题反馈（提交表单）
import { ref } from 'vue'
import { showSuccessToast, showFailToast } from 'vant'
import { useRouter } from 'vue-router'
import { submitFeedback } from '../../api/index'

const router = useRouter()
const facilityType = ref('问题上报-设备故障')
const showPicker = ref(false)
const message = ref('')
const fileList = ref<any[]>([])

const columns = [
  {
    text: '意见反馈',
    value: '意见反馈',
    children: [
      { text: '服务态度', value: '服务态度' },
      { text: '商品建议', value: '商品建议' },
      { text: '改进建议', value: '改进建议' },
      { text: '其他', value: '其他' },
    ],
  },
  {
    text: '问题上报',
    value: '问题上报',
    children: [
      { text: '设备故障', value: '设备故障' },
      { text: '环境卫生', value: '环境卫生' },
      { text: '安全隐患', value: '安全隐患' },
      { text: '其他', value: '其他' },
    ],
  },
]

const onConfirm = ({ selectedOptions }: any) => {
  facilityType.value = selectedOptions.map((o: any) => o.text).join('-')
  showPicker.value = false
}

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.readAsDataURL(file)
  })
}

const onSubmit = async () => {
  try {
    const images: string[] = []
    for (const item of fileList.value) {
      if (item.file) {
        images.push(await fileToBase64(item.file))
      }
    }
    await submitFeedback(facilityType.value, message.value, images)
    showSuccessToast('提交成功，感谢您的反馈')
    setTimeout(() => {
      router.back()
    }, 1500)
  } catch (error) {
    showFailToast('提交失败，请重试')
  }
}
</script>

<template>
  <div class="space-y-4">
    <van-form @submit="onSubmit">
      <van-cell-group inset class="!mx-0 shadow-sm">
        <van-field
          v-model="facilityType"
          is-link
          readonly
          name="picker"
          label="反馈分类"
          placeholder="点击选择分类"
          @click="showPicker = true"
        />
        <van-popup v-model:show="showPicker" position="bottom">
          <van-picker
            :columns="columns"
            @confirm="onConfirm"
            @cancel="showPicker = false"
          />
        </van-popup>

        <van-field
          v-model="message"
          rows="3"
          autosize
          label="问题描述"
          type="textarea"
          placeholder="请输入您遇到的问题详细描述"
          :rules="[{ required: true, message: '请填写问题描述' }]"
        />

        <div class="px-4 py-3 bg-white">
          <p class="text-sm text-gray-600 mb-2">图片上传 (选填)</p>
          <van-uploader v-model="fileList" multiple :max-count="3" />
        </div>
      </van-cell-group>
      
      <div class="mt-8 px-4">
        <van-button round block type="primary" native-type="submit">
          提交反馈
        </van-button>
      </div>
    </van-form>
  </div>
</template>
