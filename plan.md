# 一、项目概述

本项目为商场轻量化辅助工具移动端 H5 网站。项目采用前后端分离架构，支持全手机浏览器及微信内置浏览器打开，提供类似微信小程序的简洁现代操作体验。

# 二、项目定位

- **服务人群**：商场到店顾客、商场运维人员、场内商户
- **设计风格**：简洁现代风（类似微信小程序），注重实用性、高信息密度和操作便捷性

# 三、核心功能规划（轻量化、单人可落地）

## 1. 顾客辅助模块
- 商场门店信息查询（地址，营业时间，联系电话，支持简单搜索）
- 个性化购物清单（支持本地缓存与云端同步）
- 商场设施状态查询与问题上报（卫生间、电梯、休息区等，带图文上传）

## 2. 场内运维辅助模块
- 简易设备故障报修、巡检上报（支持多用户并发提交）
- 临时活动提报、场内便民公告展示

## 3. 体验优化模块
- 移动端优先响应式设计，完美适配所有手机屏幕
- 支持 PWA 添加桌面图标，接近原生 APP 体验
- 骨架屏加载与平滑路由过渡，增强视觉体验

# 四、技术方案（最新最优推荐）

针对“前后端分离 + SQLite多用户”的需求，我们替换掉了原本略显笨重的 Node.js 传统框架，采用更现代、轻量、极速的方案：

## 1. 前端架构 (Vue 3 + Vite + Vant)
- **核心框架**：Vue 3 (组合式 API) + Vite（极速构建）
- **UI 组件库**：[Vant](https://vant-ui.github.io/vant/) (轻量、可靠的移动端 Vue 组件库，天生符合小程序设计风格，提供极致体验)
- **状态管理**：Pinia
- **路由**：Vue Router
- **样式方案**：Tailwind CSS (原子化 CSS，用于快速构建现代简洁的留白与排版)
- **网络请求**：Axios (结合拦截器处理 Token)

## 2. 后端架构 (Hono.js + Drizzle ORM + SQLite)
- **核心框架**：[Hono.js](https://hono.dev/) (取代 Express/Koa。基于 Web Standard，极度轻量、冷启动极快、原生支持 TypeScript，是目前轻量级 REST API 的绝对首选)
- **运行环境**：Node.js 或 Bun
- **数据库**：SQLite (单文件数据库，零配置，搭配前后端分离完全满足轻量级多用户并发场景)
- **ORM 框架**：Drizzle ORM (轻量、类型安全的 TS ORM，没有 Prisma 的运行时重度开销，完美契合 Hono)

# 五、项目目录结构

```text
supermarket/
├── frontend/                 # 前端代码 (Vue3 + Vite)
│   ├── public/               # 静态资源 (PWA manifest, icons 等)
│   ├── src/
│   │   ├── api/              # 后端 API 接口封装
│   │   ├── assets/           # 图片、全局样式
│   │   ├── components/       # 公共业务组件 (Header, 卡片, 列表项等)
│   │   ├── composables/      # 组合式函数 (逻辑复用)
│   │   ├── layout/           # 页面布局 (如带底部导航栏的 MainLayout)
│   │   ├── router/           # 路由配置
│   │   ├── store/            # Pinia 状态管理
│   │   ├── views/            # 页面视图
│   │   │   ├── customer/     # 顾客功能相关页面
│   │   │   ├── staff/        # 运维/员工功能相关页面
│   │   │   └── common/       # 公共页面 (登录、404等)
│   │   ├── App.vue           # 根组件
│   │   └── main.ts           # 应用入口
│   ├── index.html            # HTML 模板
│   ├── package.json
│   ├── tailwind.config.js    # Tailwind 样式配置
│   └── vite.config.ts        # Vite 配置
│
└── backend/                  # 后端代码 (Hono.js)
    ├── src/
    │   ├── controllers/      # 业务逻辑控制器
    │   ├── db/               # 数据库相关
    │   │   ├── schema.ts     # Drizzle 数据表结构定义
    │   │   └── index.ts      # 数据库连接与配置
    │   ├── middlewares/      # 自定义中间件 (鉴权 JWT、错误拦截)
    │   ├── routes/           # API 路由分发
    │   │   ├── customer.ts   # 顾客相关接口
    │   │   └── staff.ts      # 运维相关接口
    │   └── index.ts          # Hono 应用入口
    ├── data/                 # 存放 sqlite 数据文件
    │   └── supermarket.db
    ├── package.json
    ├── drizzle.config.ts     # Drizzle ORM 配置
    └── tsconfig.json
```
