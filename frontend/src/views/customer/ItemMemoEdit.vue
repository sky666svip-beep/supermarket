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
      if (res.success) {
        uploadedUrl = res.url
      } else {
        showToast(res.message || '图片上传失败')
        return
      }
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
  <div class="bg-background text-on-background min-h-screen font-body-md selection:bg-primary-container selection:text-white flex flex-col">
    <!-- Top App Bar -->
    <header class="bg-surface w-full top-0 sticky flex flex-col z-20 shadow-sm transition-colors">
      <div class="flex items-center justify-between px-margin-mobile h-16 w-full max-w-2xl mx-auto">
        <button type="button" @click="router.back()" class="flex items-center justify-center text-primary hover:bg-surface-container-low w-10 h-10 rounded-full transition-colors active:scale-95">
          <span class="material-symbols-outlined">arrow_back_ios_new</span>
        </button>
        <h1 class="font-headline-sm text-headline-sm font-bold text-on-surface absolute left-1/2 transform -translate-x-1/2 truncate max-w-[50%] text-center">
          新增商品备忘
        </h1>
        <div class="w-10 h-10"></div>
      </div>
    </header>

    <main class="flex-1 w-full max-w-2xl mx-auto px-margin-mobile pt-4 pb-12">
      <form @submit.prevent="onSubmit" class="flex flex-col gap-6">
        
        <!-- Image Section -->
        <section class="flex flex-col gap-3 bg-surface-container-lowest border border-surface-variant/50 rounded-xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
          <div class="flex items-center justify-between">
            <h3 class="font-headline-sm text-base font-bold text-on-surface flex items-center gap-2">
              <span class="material-symbols-outlined text-primary text-[20px]">image</span>实拍图
            </h3>
            <span class="text-xs text-on-surface-variant">最多1张</span>
          </div>
          <van-uploader v-model="fileList" :max-count="1" />
        </section>

        <!-- Basic Info Section -->
        <section class="flex flex-col gap-4 bg-surface-container-lowest border border-surface-variant/50 rounded-xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
          <h3 class="font-headline-sm text-base font-bold text-on-surface flex items-center gap-2 mb-1">
            <span class="material-symbols-outlined text-primary text-[20px]">info</span>基础信息
          </h3>
          
          <!-- Category -->
          <div class="flex flex-col gap-1.5">
            <label class="font-label-md text-sm text-on-surface-variant">分类</label>
            <div class="flex gap-2">
              <input 
                v-model="form.category"
                type="text"
                placeholder="选择或输入"
                class="flex-1 bg-surface border border-surface-variant/50 rounded-lg p-3 text-on-surface font-body-md placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              />
              <button 
                type="button" 
                @click="showCategoryPicker = true"
                class="bg-primary/10 text-primary border border-primary/20 rounded-lg px-4 font-label-md text-sm active:scale-95 transition-transform whitespace-nowrap"
              >
                快捷分类
              </button>
            </div>
            <van-popup v-model:show="showCategoryPicker" position="bottom" round safe-area-inset-bottom>
              <van-picker :columns="categoryColumns" @confirm="onCategoryConfirm" @cancel="showCategoryPicker = false" />
            </van-popup>
          </div>

          <!-- Style -->
          <div class="flex flex-col gap-1.5">
            <label class="font-label-md text-sm text-on-surface-variant">商品款式 <span class="text-error">*</span></label>
            <input 
              v-model="form.style"
              type="text"
              required
              placeholder="例如：Nike Air Max 白底黑边"
              class="w-full bg-surface border border-surface-variant/50 rounded-lg p-3 text-on-surface font-body-md placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            />
          </div>

          <!-- Price -->
          <div class="flex flex-col gap-1.5">
            <label class="font-label-md text-sm text-on-surface-variant">价格</label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 font-label-md text-on-surface-variant">¥</span>
              <input 
                v-model="form.price"
                type="number"
                placeholder="399"
                class="w-full bg-surface border border-surface-variant/50 rounded-lg p-3 pl-7 text-on-surface font-body-md placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              />
            </div>
          </div>
        </section>

        <!-- Location & Contact Section -->
        <section class="flex flex-col gap-4 bg-surface-container-lowest border border-surface-variant/50 rounded-xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
          <h3 class="font-headline-sm text-base font-bold text-on-surface flex items-center gap-2 mb-1">
            <span class="material-symbols-outlined text-primary text-[20px]">location_on</span>购买指引
          </h3>
          
          <!-- Location -->
          <div class="flex flex-col gap-1.5">
            <label class="font-label-md text-sm text-on-surface-variant">店铺位置</label>
            <input 
              v-model="form.location"
              type="text"
              placeholder="例如：3F-A区-优衣库"
              class="w-full bg-surface border border-surface-variant/50 rounded-lg p-3 text-on-surface font-body-md placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            />
          </div>

          <!-- Contact -->
          <div class="flex flex-col gap-1.5">
            <label class="font-label-md text-sm text-on-surface-variant">店员联系</label>
            <input 
              v-model="form.contact"
              type="text"
              placeholder="手机号/微信/姓名均可"
              class="w-full bg-surface border border-surface-variant/50 rounded-lg p-3 text-on-surface font-body-md placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            />
          </div>
          
          <!-- Tags -->
          <div class="flex flex-col gap-1.5">
            <label class="font-label-md text-sm text-on-surface-variant">自定义标签</label>
            <input 
              v-model="form.tags"
              type="text"
              placeholder="多个标签用空格或逗号分隔"
              class="w-full bg-surface border border-surface-variant/50 rounded-lg p-3 text-on-surface font-body-md placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            />
          </div>
        </section>

        <!-- Submit Button -->
        <div class="mt-2">
          <button 
            type="submit" 
            class="w-full bg-primary text-white py-3.5 rounded-full font-headline-sm text-base font-bold shadow-md active:scale-[0.98] transition-transform"
          >
            保存备忘本
          </button>
        </div>
      </form>
    </main>
  </div>
</template>
