# Findings & Decisions: Mobile Recruitment Module

## Requirements
- **入口优化**：在首页原本 7 个宫格的网格中，扩增至 8 个宫格（第 8 项为“加入我们”），使用 2x4 列排布，界面对称美观。
- **关于我们 Tab**：
  - **集团宣传片**：使用 HTML5 `<video>` 视频播放器，配置封面图与标准控件，播放 `宣传片.mp4`（约32MB）。
  - **集团概况、品牌理念、企业文化**：使用公众号样式的有图有字卡片排版。
- **加入我们 Tab**：
  - **社会招聘**：垂直卡片，包含 1 张社会招聘二维码图（`社会招聘.jpg`），点击可全屏放大预览。
  - **校园招聘**：垂直卡片，包含 4 张校园招聘图（`校园招聘1.jpg` ~ `校园招聘4.jpg`），点击可全屏放大并左右滑动预览。
- **代码规范**：高度使用 Tailwind CSS 编写高保真、美观且响应式的白底现代风 UI，配以平滑微动效。

## Research Findings
1. **静态资源物理位置**：
   - 视频源文件：`d:\Projects\supermarket\backend\data\asset\video\宣传片.mp4`
   - 图片源文件：`d:\Projects\supermarket\backend\data\asset\image\`（含有 `社会招聘.jpg` 和 4 张 `校园招聘*.jpg`）
2. **静态资源加载与流服务**：
   - 如果通过 Express/Hono 等后端接口做单纯的 Buffer 返回，在移动端播放 32MB 视频时会因为不支持 Range Headers (HTTP 206) 导致进度条无法拖动、首帧缓冲过慢等体验问题。
   - 解决方案：在 `frontend/public` 下创建 `asset` 软连接或复制文件。Vite 开箱即用支持完美的 Static Serving 与分片流服务，最适合视频点播。
3. **前台布局及 UI 技术栈**：
   - 使用 Vue 3 + Vant UI + Tailwind CSS。
   - Vant 的 `<van-tabs>`、`<van-grid>`、`<van-image>` 与 `showImagePreview` 内置支持，开箱即用。

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| 资源转移至 `frontend/public` | 获得 Vite 内置的高速 Static Server 和视频分段播放能力，无需修改后端接口，性能与兼容性最佳。 |
| 使用 `van-tabs` 高级粘性定位 | 保持首屏整洁，方便用户在“关于我们”与“加入我们”之间平滑切换。 |
| 仿微信公众号图文排版设计 | 公众号是移动端图文排版的黄金标准。使用细圆角、微灰边框、优雅字体行高和柔和配图，能大幅提升品牌的正式感和视觉高级感。 |
| 运用 `transition` 微动效 | 给卡片加入 `:active` 或 `:hover` 下的缩放 (`scale-[0.98]`)、轻微阴影加深和背景微调效果，带来丝滑的手指按压反馈。 |

## Issues Encountered
| Issue | Resolution |
|-------|------------|
| 无 | - |

## Resources
- 视频存放路径: `frontend/public/asset/video/宣传片.mp4`
- 图片存放路径: `frontend/public/asset/image/`
- 主页组件: [Home.vue](file:///d:/Projects/supermarket/frontend/src/views/Home.vue)
- 路由文件: [index.ts](file:///d:/Projects/supermarket/frontend/src/router/index.ts)
