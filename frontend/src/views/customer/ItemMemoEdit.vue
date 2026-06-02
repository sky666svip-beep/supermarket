<!-- 模块：商品备忘编辑 -->
<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { createItemMemo, uploadImage } from '../../api/index'

const router = useRouter()

const form = ref({
  category: '',
  style: '',
  price: '',
  location: '',
  contact: '',
  tags: '',
  imageUrl: ''
})

const fileList = ref<any[]>([])

const presetCategories = ['服饰', '美妆', '数码', '食品', '医药', '家具', '母婴' ,'未分类']
const showCategoryPicker = ref(false)
const categoryColumns = presetCategories.map(c => ({ text: c, value: c }))

const onCategoryConfirm = ({ selectedOptions }: any) => {
  form.value.category = selectedOptions[0].text
  showCategoryPicker.value = false
}

const onSubmit = async () => {
  try {
    if (!form.value.category) {
      form.value.category = '未分类'
    }

    let uploadedUrl = ''
    if (fileList.value.length > 0 && fileList.value[0].file) {
      const res = await uploadImage(fileList.value[0].file)
      uploadedUrl = res.url
    }

    // Process tags
    const tagsArray = form.value.tags.split(/[,， ]+/).filter(t => t.trim() !== '')
    const tagsJson = JSON.stringify(tagsArray)

    await createItemMemo({
      category: form.value.category,
      style: form.value.style,
      price: form.value.price,
      location: form.value.location,
      contact: form.value.contact,
      tags: tagsJson,
      imageUrl: uploadedUrl
    })

    showToast('保存成功')
    setTimeout(() => {
      router.back()
    }, 1000)
  } catch (e) {
    showToast('保存失败')
  }
}
</script>

<template>
  <div class="h-full flex flex-col bg-gray-50">
    <van-nav-bar
      title="新增商品备忘"
      left-arrow
      @click-left="router.back()"
      class="flex-shrink-0"
    />

    <div class="flex-1 overflow-y-auto pb-8">
      <van-form @submit="onSubmit">
        
        <van-cell-group inset class="!mt-4 shadow-sm">
          <div class="px-4 py-3 bg-white">
            <p class="text-sm text-gray-600 mb-2">实拍图 (最多上传1张)</p>
            <van-uploader v-model="fileList" :max-count="1" />
          </div>
        </van-cell-group>

        <van-cell-group inset class="!mt-4 shadow-sm">
          <van-field
            v-model="form.category"
            label="分类"
            placeholder="请选择或输入分类"
          >
            <template #button>
              <van-button size="small" type="primary" plain @click.prevent="showCategoryPicker = true">
                选择快捷分类
              </van-button>
            </template>
          </van-field>
          <van-popup v-model:show="showCategoryPicker" position="bottom">
            <van-picker
              :columns="categoryColumns"
              @confirm="onCategoryConfirm"
              @cancel="showCategoryPicker = false"
            />
          </van-popup>

          <van-field
            v-model="form.style"
            label="商品款式"
            placeholder="例如：Nike Air Max 白底黑边"
            :rules="[{ required: true, message: '请填写商品款式' }]"
          />
          
          <van-field
            v-model="form.price"
            label="价格"
            type="number"
            placeholder="例如：399"
          />
        </van-cell-group>

        <van-cell-group inset class="!mt-4 shadow-sm">
          <van-field
            v-model="form.location"
            label="店铺位置"
            placeholder="例如：3F-A区-优衣库"
          />
          <van-field
            v-model="form.contact"
            label="店员联系"
            placeholder="手机号/微信/姓名均可"
          />
          <van-field
            v-model="form.tags"
            label="自定义标签"
            placeholder="多个标签用空格或逗号分隔"
          />
        </van-cell-group>

        <div class="mt-8 px-4">
          <van-button round block type="primary" native-type="submit">
            保存备忘本
          </van-button>
        </div>
      </van-form>
    </div>
  </div>
</template>
