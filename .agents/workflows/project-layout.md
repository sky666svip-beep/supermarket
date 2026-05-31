---
description: 项目的核心目录结构规范如下，所有后续的新功能开发均须严格遵守此结构划分：
---

```text
supermarket/
├── frontend/                 # 移动端顾客与员工界面 (Vue3 + Vite + Vant)
│   ├── public/               # 静态资源 (PWA manifest, icons 等)
│   ├── src/
│   │   ├── api/              # 前端 API 接口封装 (统一在 index.ts 暴露)
│   │   ├── assets/           # 图片、全局样式
│   │   ├── components/       # 公共业务组件
│   │   ├── router/           # 路由配置
│   │   ├── utils/            # 工具类函数 (如 location.ts 定位服务等)
│   │   ├── views/            # 页面视图 (按业务模块划分文件夹)
│   │   │   ├── community/    # 社区模块 (帖子列表, 详情, 发布)
│   │   │   ├── customer/     # 顾客模块 (门店、反馈、清单等)
│   │   │   ├── profile/      # 账户中心 (登录, 注册, 个人中心)
│   │   │   ├── staff/        # 员工工作台
│   │   │   ├── user/         # 个人数据管理 (我的发帖, 收藏, 消息)
│   │   │   └── Home.vue      # 移动端首页与公告展示
│   │   ├── App.vue           # 根组件
│   │   └── main.ts           # 应用入口
│   ├── index.html            # 移动端 HTML 模板
│   ├── tailwind.config.js    # 移动端 Tailwind 样式配置
│   └── vite.config.ts        # Vite 配置文件
│
├── admin-frontend/           # PC端后台管理系统 (Vue3 + Vite + Element Plus)
│   ├── src/
│   │   ├── api/              # 后台管理 API 封装
│   │   ├── assets/           # 后台静态资源
│   │   ├── components/       # 后台公共组件
│   │   ├── router/           # 后台路由配置
│   │   ├── views/            # 后台管理页面 (扁平化管理，目前无深层嵌套)
│   │   │   ├── CommunityPosts.vue   # 社区帖子管理
│   │   │   ├── CommunityReports.vue # 社区举报处理
│   │   │   ├── FeedbackDashboard.vue# 用户反馈管理
│   │   │   ├── NoticeManager.vue    # 公告管理
│   │   │   └── Home.vue             # 后台首页
│   │   ├── App.vue           # 根组件
│   │   └── main.ts           # 应用入口
│   ├── index.html            # PC端 HTML 模板
│   ├── tailwind.config.js    # PC端 Tailwind 样式配置
│   └── vite.config.ts        # Vite 配置文件
│
└── backend/                  # 服务端 API 代码 (Hono.js + Drizzle ORM)
    ├── scripts/              # 维护与测试脚本 (如批量处理坐标等)
    ├── src/
    │   ├── db/               # 数据库底层交互
    │   │   ├── schema.ts     # Drizzle 数据表结构定义 (所有新表统一写在此处)
    │   │   └── index.ts      # 数据库连接与实例配置
    │   ├── middlewares/      # 自定义中间件 (鉴权 JWT)
    │   ├── routes/           # API 路由分发 (按业务拆分: posts, notices, user 等)
    │   └── index.ts          # Hono 应用主入口 (注册挂载所有路由)
    ├── sqlite.db             # 实际的 sqlite 数据库文件 (开发环境本地数据)
    ├── drizzle.config.ts     # Drizzle ORM 配置文件
    ├── package.json          
    └── tsconfig.json         # TypeScript 配置文件
```