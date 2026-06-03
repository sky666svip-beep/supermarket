<!-- 模块：加入我们 -->
<script setup lang="ts">
import { ref } from 'vue'
import { showImagePreview } from 'vant'

const activeTab = ref(0)

// Expanded states for "About Us" cards to toggle detail view
const isOverviewExpanded = ref(false)
const isBrandExpanded = ref(false)
const isCultureExpanded = ref(false)

const socialImage = '/asset/image/社会招聘.jpg'
const campusImages = [
  '/asset/image/校园招聘1.jpg',
  '/asset/image/校园招聘2.jpg',
  '/asset/image/校园招聘3.jpg',
  '/asset/image/校园招聘4.jpg'
]

// Open single preview for Social Recruitment
const previewSocialJob = () => {
  showImagePreview({
    images: [socialImage],
    startPosition: 0,
    closeable: true,
    closeIconPosition: 'top-right'
  })
}

// Open swipe preview for Campus Recruitment with clicked index
const previewCampusJob = (index: number) => {
  showImagePreview({
    images: campusImages,
    startPosition: index,
    closeable: true,
    closeIconPosition: 'top-right'
  })
}

// Open full screen preview for any single inline copy deck image
const previewSingleImage = (url: string) => {
  showImagePreview({
    images: [url],
    startPosition: 0,
    closeable: true,
    closeIconPosition: 'top-right'
  })
}
</script>

<template>
  <div class="min-h-screen bg-white pb-12">
    <!-- Top Nav Bar -->
    <van-nav-bar
      title="加入我们"
      left-arrow
      @click-left="$router.back()"
      class="border-b border-gray-100"
    />

    <!-- Header Hero Banner with glassmorphism styling -->
    <div class="relative overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50/30 px-6 pt-5 pb-5 text-center border-b border-gray-100">
      <div class="absolute -right-10 -top-10 w-40 h-40 bg-blue-400/10 rounded-full blur-2xl"></div>
      <div class="absolute -left-10 -bottom-10 w-40 h-40 bg-indigo-400/10 rounded-full blur-2xl"></div>
      
      <h1 class="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent tracking-wide">
        探索无限机遇 · 共创美好未来
      </h1>
      <p class="mt-2 text-xs text-gray-500 font-medium">
        无论您是行家里手，还是初出茅庐，这里都有您施展才华的黄金舞台
      </p>
    </div>

    <!-- Sticky Tabs Navigation -->
    <van-tabs
      v-model:active="activeTab"
      color="#2563eb"
      title-active-color="#2563eb"
      sticky
      offset-top="0"
      class="bg-white border-b border-gray-100"
      line-width="24px"
      line-height="3px"
    >
      <!-- TAB 1: 关于我们 -->
      <van-tab title="关于我们">
        <div class="p-5 space-y-6">
          
          <!-- Section 1: 集团宣传片 -->
          <div class="space-y-3">
            <div class="flex items-center space-x-2">
              <span class="w-1.5 h-5 bg-blue-600 rounded-full"></span>
              <h2 class="text-base font-bold text-gray-800">集团宣传片</h2>
            </div>
            
            <!-- Video Container -->
            <div class="relative rounded-2xl overflow-hidden shadow-md border border-gray-100 bg-black aspect-video transition-all duration-300">
              <video
                src="/asset/video/宣传片.mp4"
                controls
                preload="metadata"
                playsinline
                class="w-full h-full object-cover"
                poster="/asset/image/视频封面.png"
              >
                您的浏览器不支持 HTML5 视频播放。
              </video>
            </div>
          </div>

          <!-- Section 2: 概况、品牌、文化 (微信公众号有图有字风格卡片) -->
          <div class="space-y-5">
            <!-- Card 1: 集团概况 -->
            <div 
              class="border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md active:scale-[0.99] active:shadow-sm transition-all duration-200 bg-white"
              @click="isOverviewExpanded = !isOverviewExpanded"
            >
              <!-- Card Cover Gradient Header (公众号配图感) -->
              <div class="h-20 bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-between px-6 text-white relative">
                <div>
                  <h3 class="text-lg font-bold">集团概况</h3>
                  <p class="text-xs text-blue-100 mt-1">深耕零售，服务万千家庭</p>
                </div>
                <van-icon name="wap-home-o" class="text-4xl text-white/20 absolute right-4 bottom-2" />
              </div>
              
              <!-- Card Content -->
              <div class="p-4 space-y-3">
                <!-- Preview Segment (Always Visible) -->
                <p class="text-sm text-gray-600 leading-relaxed text-justify">
                  河南大张实业有限公司始建于1992年，总部位于洛阳，是全国连锁百强、河南连锁十强企业，全省先进基层党组织、是全国就业与社会保障先进民营企业，是高校毕业生就业见习省级示范单位。
                </p>
                <div class="my-2.5 rounded-xl overflow-hidden border border-gray-50 shadow-sm cursor-pointer active:scale-[0.99] transition-all duration-200" @click.stop="previewSingleImage('/asset/image/企业概况.jpg')">
                  <van-image src="/asset/image/企业概况.jpg" fit="cover" class="w-full max-h-48 block" />
                  <div class="bg-gray-50/50 py-1.5 text-center text-[10px] text-gray-400 border-t border-gray-50">点击可全屏放大查看</div>
                </div>

                <!-- Expanded Segment -->
                <div v-show="isOverviewExpanded" class="text-sm text-gray-600 leading-relaxed space-y-3 border-t border-gray-100 pt-3 text-justify">
                  <p>
                    大张公司总营业面积100多万平方米，商业网点100多家，遍布在洛阳、郑州、焦作、济源、三门峡、漯河、苏州、镇江、无锡、扬州、南昌、上海等地市，有“大张”、“盛德美”、“长申国际”“长申玉”等多个商业品牌及“真求美”“行深”等文化品牌。主要经营生鲜、超市、服装项目，此外大张集团还涉猎地产、酒店、餐饮、珠宝、食品加工、物流仓储配送等领域。
                  </p>
                  <div class="my-2.5 rounded-xl overflow-hidden border border-gray-50 shadow-sm cursor-pointer active:scale-[0.99] transition-all duration-200" @click.stop="previewSingleImage('/asset/image/企业概况2.png')">
                    <van-image src="/asset/image/企业概况2.png" fit="cover" class="w-full max-h-48 block" />
                  </div>
                  <p>
                    大张公司始终以“保障老百姓的食品健康和生活真便利”为使命，坚持“货真、货全、货鲜、货廉”的经营宗旨，三十年如一日对供应链深耕细作，对仓储物流不断的升级加持，致力于食品安全的建设和发展。目前，大张有集常温配送、冷链配送、食品加工为一体的现代化物流加工配送中心，有宜阳食品工业园，是集冷链物流、中央厨房、批发于一体的新现代化高效物流加工生产体系，冷链库为目前国内最大的全自动立体无人仓，拥有3万个标准托盘仓位，自动化堆垛机运行，冷藏冷冻商品存储能力达3万吨，年冷链配送能力达100万吨；生产加工中心可年产20万吨的肉、熟食、方便粥、中西式面点、切配菜、盒饭配餐、寿司、饭团、速冻制品等，生产车间实行全封闭管理，全自动流水线作业，全程智能化监控管理，保障食品安全。
                  </p>
                  <div class="my-2.5 rounded-xl overflow-hidden border border-gray-50 shadow-sm cursor-pointer active:scale-[0.99] transition-all duration-200" @click.stop="previewSingleImage('/asset/image/企业概况3.jpg')">
                    <van-image src="/asset/image/企业概况3.jpg" fit="cover" class="w-full max-h-48 block" />
                  </div>
                  <p>
                    2023年，大张公司进一步发力拓展和加快改革进程，深化标准化建设，提高效率效能，增强企业生存能力和发展实力，做有价值、有担当的伟大企业。
                  </p>
                </div>

                <!-- Read More Toggle -->
                <div class="flex justify-center items-center text-xs text-blue-600 font-semibold pt-1 border-t border-gray-50 mt-2">
                  <span>{{ isOverviewExpanded ? '收起详情' : '展开阅读全文' }}</span>
                  <van-icon :name="isOverviewExpanded ? 'arrow-up' : 'arrow-down'" class="ml-1" />
                </div>
              </div>
            </div>

            <!-- Card 2: 品牌理念 -->
            <div 
              class="border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md active:scale-[0.99] active:shadow-sm transition-all duration-200 bg-white"
              @click="isBrandExpanded = !isBrandExpanded"
            >
              <!-- Card Cover Gradient Header -->
              <div class="h-20 bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-between px-6 text-white relative">
                <div>
                  <h3 class="text-lg font-bold">品牌理念</h3>
                  <p class="text-xs text-emerald-100 mt-1">品质筑基，温暖相伴</p>
                </div>
                <van-icon name="like-o" class="text-4xl text-white/20 absolute right-4 bottom-2" />
              </div>
              
              <!-- Card Content -->
              <div class="p-4 space-y-3">
                <!-- Preview Segment (Always Visible) -->
                <div class="space-y-2">
                  <h4 class="text-sm font-bold text-emerald-700 border-l-2 border-emerald-500 pl-2">长申国际：在长申，遇见心中的自己</h4>
                  <div class="grid grid-cols-2 gap-2 my-2">
                    <div class="rounded-lg overflow-hidden border border-gray-50 shadow-sm cursor-pointer" @click.stop="previewSingleImage('/asset/image/长申.png')">
                      <van-image src="/asset/image/长申.png" fit="cover" class="w-full aspect-[4/3] block" />
                    </div>
                    <div class="rounded-lg overflow-hidden border border-gray-50 shadow-sm cursor-pointer" @click.stop="previewSingleImage('/asset/image/长申2.png')">
                      <van-image src="/asset/image/长申2.png" fit="cover" class="w-full aspect-[4/3] block" />
                    </div>
                  </div>
                </div>

                <!-- Expanded Segment -->
                <div v-show="isBrandExpanded" class="text-sm text-gray-600 leading-relaxed space-y-3 border-t border-gray-100 pt-3 text-justify">
                  <!-- Segment 2: 盛德美 -->
                  <div class="space-y-2">
                    <h4 class="text-sm font-bold text-emerald-700 border-l-2 border-emerald-500 pl-2">盛德美：天天盛德美，天天省得美</h4>
                    <p>
                      2003年，大张在洛阳发展十几年后推出的国际化的、代表购物广场业态店的品牌。现有盛德美门店十几家。盛德美有谐音“省得美”，“天天盛德美、天天省得美”是我们盛德美卖场能够提供的一站购足、品种丰富、价格更低的品牌诉求。
                    </p>
                    <div class="my-2 rounded-xl overflow-hidden border border-gray-50 shadow-sm cursor-pointer" @click.stop="previewSingleImage('/asset/image/盛德美.png')">
                      <van-image src="/asset/image/盛德美.png" fit="cover" class="w-full max-h-40 block" />
                    </div>
                    <p>
                      同时，盛德美每一个字都体现了大张的特点和理念，是大张经营11年的总结。“盛”是昌盛、盛大，从而有别于大张原有较小门店的规模和形式；“德”体现了大张“真品换信任、诚心换真情”的理念，是甘愿吃亏的服务理念，是大张人助人为乐、团结友爱的美德；“美”是追求，是结果，我们希望通过舒适的卖场、称心如意的商品、良好的服务为您带来美的享受，也希望顾客能因为大张生活更加美好，最终能够换来一句在这里购物的感受——“美”！
                    </p>
                    <div class="my-2 rounded-xl overflow-hidden border border-gray-50 shadow-sm cursor-pointer" @click.stop="previewSingleImage('/asset/image/盛德美2.jpg')">
                      <van-image src="/asset/image/盛德美2.jpg" fit="cover" class="w-full max-h-40 block" />
                    </div>
                  </div>

                  <!-- Segment 3: 真求美 -->
                  <div class="space-y-2 pt-2 border-t border-gray-50">
                    <h4 class="text-sm font-bold text-emerald-700 border-l-2 border-emerald-500 pl-2">真求美：大张文化的缩影</h4>
                    <p>
                      真求美是大张文化的缩影，也是大张创立的第一个文化品牌，大张内刊报纸就叫《真求美》。大张人多来自农村、郊区或城市工人阶层家庭，没有背景似乎也不是什么天之骄子，然而大张人通过自己的实干和真诚，服务顾客、创造财富、成长进步，所以真就是大张文化最底层的要求，没有真就没有一切。而求是一种精神，是进步的愿望，正因为如此大张集团的干部全部来自内部基层，而且大张都是他们的第一份工作，正因为追求的精神和斗志，成就了现在能力和地位。美是向往，大张人希望人与人之间简单、真诚、直率，也在营造这这样人际关系和氛围，并且做到了。美也是心灵之美，大张文化中“思想自由、心灵高贵、活在当下”就是最美的状态！
                    </p>
                    <div class="my-2 rounded-xl overflow-hidden border border-gray-50 shadow-sm cursor-pointer" @click.stop="previewSingleImage('/asset/image/真求美.jpg')">
                      <van-image src="/asset/image/真求美.jpg" fit="cover" class="w-full max-h-40 block" />
                    </div>
                  </div>

                  <!-- Segment 4: 行深 -->
                  <div class="space-y-2 pt-2 border-t border-gray-50">
                    <h4 class="text-sm font-bold text-emerald-700 border-l-2 border-emerald-500 pl-2">行深：思想自由，心灵高贵</h4>
                    <p>
                      大张真正的追求是教育。教育的内在与核心不是“行”，教育的成效表现在“深”，行深取自佛家经典《心经》中“行深般若波罗蜜多时照见五蕴皆空”一句，是大张的又一文化教育品牌。目前公司内部行深培训班成员是公司的中坚力量，正通过他们影响更多的人开悟、进步。
                    </p>
                    
                    <!-- Youku Video Learning Links -->
                    <div class="bg-emerald-50/40 rounded-xl p-3 flex flex-col space-y-2.5 border border-emerald-100/50 my-2" @click.stop>
                      <span class="text-xs text-emerald-800 font-semibold flex items-center">
                        <van-icon name="video-o" class="mr-1 text-emerald-600" />
                        行深培训视频在线观看学习链接：
                      </span>
                      <div class="flex flex-col space-y-2">
                        <a href="https://v.youku.com/v_show/id_XNDk0MzQ0NjQw.html" target="_blank" class="flex items-center justify-between bg-white hover:bg-emerald-50/10 border border-emerald-100 text-xs text-emerald-700 px-3 py-2 rounded-lg transition-all duration-200">
                          <span>📽️ 行深培训视频学习课 1</span>
                          <van-icon name="arrow" />
                        </a>
                        <a href="https://v.youku.com/v_show/id_XNDk0MzA4MDA4.html" target="_blank" class="flex items-center justify-between bg-white hover:bg-emerald-50/10 border border-emerald-100 text-xs text-emerald-700 px-3 py-2 rounded-lg transition-all duration-200">
                          <span>📽️ 行深培训视频学习课 2</span>
                          <van-icon name="arrow" />
                        </a>
                        <a href="https://v.youku.com/v_show/id_XNDk0MzA4MDEy.html" target="_blank" class="flex items-center justify-between bg-white hover:bg-emerald-50/10 border border-emerald-100 text-xs text-emerald-700 px-3 py-2 rounded-lg transition-all duration-200">
                          <span>📽️ 行深培训视频学习课 3</span>
                          <van-icon name="arrow" />
                        </a>
                      </div>
                    </div>

                    <div class="my-2 rounded-xl overflow-hidden border border-gray-50 shadow-sm cursor-pointer" @click.stop="previewSingleImage('/asset/image/行深.jpg')">
                      <van-image src="/asset/image/行深.jpg" fit="cover" class="w-full max-h-40 block" />
                    </div>
                  </div>
                </div>

                <!-- Read More Toggle -->
                <div class="flex justify-center items-center text-xs text-emerald-600 font-semibold pt-1 border-t border-gray-50 mt-2">
                  <span>{{ isBrandExpanded ? '收起详情' : '展开阅读全文' }}</span>
                  <van-icon :name="isBrandExpanded ? 'arrow-up' : 'arrow-down'" class="ml-1 text-emerald-600" />
                </div>
              </div>
            </div>

            <!-- Card 3: 企业文化 -->
            <div 
              class="border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md active:scale-[0.99] active:shadow-sm transition-all duration-200 bg-white"
              @click="isCultureExpanded = !isCultureExpanded"
            >
              <!-- Card Cover Gradient Header -->
              <div class="h-20 bg-gradient-to-r from-purple-500 to-indigo-500 flex items-center justify-between px-6 text-white relative">
                <div>
                  <h3 class="text-lg font-bold">企业文化</h3>
                  <p class="text-xs text-purple-100 mt-1">开拓创新，追求卓越</p>
                </div>
                <van-icon name="gold-coin-o" class="text-4xl text-white/20 absolute right-4 bottom-2" />
              </div>
              
              <!-- Card Content -->
              <div class="p-4 space-y-3">
                <!-- Preview Segment (Always Visible) -->
                <div class="space-y-1.5">
                  <h4 class="text-sm font-bold text-purple-700 border-l-2 border-purple-500 pl-2">企业理想：一切为了让生命更美好</h4>
                  <p class="text-sm text-gray-600 leading-relaxed text-justify">
                    生命是崇高的，人的生命只有一次机会，我们一切的努力都是为了生命的更加美好。大张作为一个商业企业，更大的责任不是追求商业利润最大化而是生命的精彩，是在做生命的教育。再丰富的物质都替代不了精神的需求，只有精神的富裕才能让人幸福。
                  </p>
                </div>

                <!-- Expanded Segment -->
                <div v-show="isCultureExpanded" class="text-sm text-gray-600 leading-relaxed space-y-4 border-t border-gray-100 pt-3 text-justify">
                  <!-- Pillar 2: 企业精神 -->
                  <div class="space-y-1.5 border-b border-gray-50 pb-3">
                    <h4 class="text-sm font-bold text-purple-700 border-l-2 border-purple-500 pl-2">企业精神：自我管理，自我教育，自我承担，自我超越</h4>
                    <p>
                      大张是一个平台，是一个平等、开放的平台，在这个平台里每个人都是自由的、有价值的，每一个生命个体的精彩最重要的是自我管理与约束，并能通过自我教育而自我提升技能水平与理念高度，能自我养活、自我承担，以至更大的承担，到达从未有过的高度和格局，就是每个人的自我超越。
                    </p>
                  </div>

                  <!-- Pillar 3: 经营思想 -->
                  <div class="space-y-2 border-b border-gray-50 pb-3">
                    <h4 class="text-sm font-bold text-purple-700 border-l-2 border-purple-500 pl-2">经营思想：货真、货全、货鲜、货廉</h4>
                    <div class="space-y-2 bg-purple-50/30 rounded-xl p-3 border border-purple-100/50">
                      <p><strong class="text-purple-900">货真</strong>：所有商品均采自正规渠道或直接采自厂家，假一赔十。</p>
                      <p><strong class="text-purple-900">货全</strong>：大张五百多位采购人员以顾客视角精选商品。</p>
                      <p><strong class="text-purple-900">货鲜</strong>：所有商品有严格的保质期、临期管理流程，绝不将一件过期商品销售给顾客，生鲜商品有更为严格的保鲜和日清规定，绝不将变质商品上架销售。</p>
                      <p><strong class="text-purple-900">货廉</strong>：同价商品大张质量最优，同质商品大张价格最低。</p>
                    </div>
                  </div>

                  <!-- Pillar 4: 服务理念 -->
                  <div class="space-y-2">
                    <h4 class="text-sm font-bold text-purple-700 border-l-2 border-purple-500 pl-2">服务理念：为顾客创造价值是大张的核心理念之一</h4>
                    <div class="text-xs text-gray-500 bg-gray-50 p-3 rounded-xl space-y-1.5">
                      <p>🏬 <strong class="text-gray-700">大张超市</strong>：方便低价，百姓之家。</p>
                      <p>🥦 <strong class="text-gray-700">大张食品</strong>：保障老百姓的食品健康和生活真便利。</p>
                      <p>👗 <strong class="text-gray-700">大张服饰</strong>：穿出体面、穿出富足、穿出骄傲、穿出尊贵。</p>
                      <p>✨ <strong class="text-gray-700">长申国际</strong>：全球采购，世界范围内精选卓越产品以最佳结构组合。在长申，遇见心中的自己。</p>
                    </div>
                  </div>
                </div>

                <!-- Read More Toggle -->
                <div class="flex justify-center items-center text-xs text-purple-600 font-semibold pt-1 border-t border-gray-50 mt-2">
                  <span>{{ isCultureExpanded ? '收起详情' : '展开阅读全文' }}</span>
                  <van-icon :name="isCultureExpanded ? 'arrow-up' : 'arrow-down'" class="ml-1 text-purple-600" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </van-tab>

      <!-- TAB 2: 加入我们 -->
      <van-tab title="加入我们">
        <div class="p-5 space-y-6">
          
          <!-- Social Recruitment Card -->
          <div class="border border-gray-100 rounded-2xl overflow-hidden shadow-sm bg-white p-4 space-y-3">
            <div class="flex items-center space-x-2">
              <span class="w-1 h-4 bg-blue-600 rounded-full"></span>
              <h3 class="text-base font-bold text-gray-800">社会招聘</h3>
            </div>
            
            <p class="text-xs text-gray-500 leading-relaxed">
              在这个充满机遇的世界里，让我们一起努力，开启职场新篇章！期待与您共同成长，快乐工作！
            </p>

            <!-- Image Container -->
            <div 
              class="relative rounded-xl overflow-hidden border border-gray-100 shadow-sm cursor-pointer hover:shadow transition-all duration-200 active:scale-[0.99]"
              @click="previewSocialJob"
            >
              <van-image
                :src="socialImage"
                fit="cover"
                class="w-full h-48 block"
              />
              <div class="absolute inset-0 bg-black/5 hover:bg-black/0 transition-colors flex items-end justify-end p-3">
                <span class="bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full flex items-center backdrop-blur-sm">
                  <van-icon name="expand-o" class="mr-1" />
                  点击放大扫码
                </span>
              </div>
            </div>
            
            <div class="bg-blue-50/50 rounded-xl p-3 flex items-start space-x-2">
              <van-icon name="info-o" color="#2563eb" size="14" class="mt-0.5" />
              <span class="text-[11px] text-blue-700 font-medium leading-relaxed">
                点击图片可大图预览，微信扫描二维码，即可一键投递简历。
              </span>
            </div>
          </div>

          <!-- Campus Recruitment Card -->
          <div class="border border-gray-100 rounded-2xl overflow-hidden shadow-sm bg-white p-4 space-y-3">
            <div class="flex items-center space-x-2">
              <span class="w-1 h-4 bg-indigo-600 rounded-full"></span>
              <h3 class="text-base font-bold text-gray-800">校园招聘</h3>
            </div>
            
            <p class="text-xs text-gray-500 leading-relaxed">
              青出于蓝，共绘明天！面向应届毕业生的“管培生计划”与各类实习生岗位全面开启，为你的职场起跑线强势赋能。
            </p>

            <!-- 2x2 Images Grid -->
            <div class="grid grid-cols-2 gap-3">
              <div 
                v-for="(img, idx) in campusImages" 
                :key="idx"
                class="relative rounded-lg overflow-hidden border border-gray-100 shadow-sm cursor-pointer hover:shadow transition-all duration-200 active:scale-[0.98]"
                @click="previewCampusJob(idx)"
              >
                <van-image
                  :src="img"
                  fit="cover"
                  class="w-full aspect-[4/3] block"
                />
                <div class="absolute bottom-1.5 right-1.5 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded-full backdrop-blur-sm">
                  图 {{ idx + 1 }}
                </div>
              </div>
            </div>
            
            <div class="bg-indigo-50/50 rounded-xl p-3 flex items-start space-x-2">
              <van-icon name="info-o" color="#4f46e5" size="14" class="mt-0.5" />
              <span class="text-[11px] text-indigo-700 font-medium leading-relaxed">
                点击图片可大图预览，助您全面了解我们的校园招聘政策。
              </span>
            </div>
          </div>

        </div>
      </van-tab>
    </van-tabs>
  </div>
</template>

<style scoped>
/* Ensure custom styling for Vant nav bar aligns with beautiful header */
:deep(.van-nav-bar) {
  --van-nav-bar-background: #ffffff;
  --van-nav-bar-title-text-color: #1f2937;
  --van-nav-bar-icon-color: #4b5563;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}
</style>
