---
trigger: model_decision
description: when analyze the project layout or implement new features
---

项目的目录结构规范如下，所有后续的新功能开发均须严格遵守此结构划分:
```text
supermarket/
├── frontend/                 # 前端应用界面 (Vue3 + Vite + Vant + Tailwind)
│   ├── public/               # 静态资源 (PWA manifest, icons 等)
│   ├── src/
│   │   ├── api/              # 前端 API 接口封装 (按模块划分并统一导出)
│   │   ├── assets/           # 图片、全局样式
│   │   ├── components/       # 公共业务组件
│   │   ├── router/           # 路由配置 (包含顾客与管理员权限控制)
│   │   ├── utils/            # 工具类函数 (如 location.ts 定位服务等)
│   │   ├── views/            # 页面视图 (按业务模块划分文件夹)
│   │   │   ├── admin/        # 管理后台模块 (公告, 反馈, 社区管理, 用户管理等)
│   │   │   ├── community/    # 社区模块 (帖子列表, 详情, 发布)
│   │   │   ├── customer/     # 顾客模块 (门店、反馈、清单、备忘、客流分析等)
│   │   │   ├── profile/      # 账户中心 (登录, 注册, 忘记密码, 个人中心)
│   │   │   ├── user/         # 个人数据管理 (我的发帖, 收藏, 消息)
│   │   │   └── Home.vue      # 移动端首页面与功能快捷入口
│   │   ├── App.vue           # 根组件
│   │   └── main.ts           # 应用入口
│   ├── index.html            # 移动端 HTML 模板
│   ├── tailwind.config.js    # 移动端 Tailwind 样式配置
│   └── vite.config.ts        # Vite 配置文件
│
├── backend/                  # 服务端 API 代码 (Hono.js + Drizzle ORM)
│   ├── scripts/              # 维护与测试脚本 (如批量处理坐标等)
│   ├── src/
│   │   ├── db/               # 数据库底层交互
│   │   │   ├── schema.ts     # Drizzle 数据表结构定义 (所有新表统一写在此处)
│   │   │   └── index.ts      # 数据库连接与实例配置
│   │   ├── middlewares/      # 自定义中间件 (鉴权 JWT 等)
│   │   ├── routes/           # API 路由分发 (按业务拆分: posts, admin, user, traffic 等)
│   │   └── index.ts          # Hono 应用主入口 (注册挂载所有路由, 处理静态资源服务)
│   ├── sqlite.db             # 实际的 sqlite 数据库文件 (开发环境本地数据)
│   ├── drizzle.config.ts     # Drizzle ORM 配置文件
│   ├── package.json          
│   └── tsconfig.json         # TypeScript 配置文件
│
├── data/                     # 持久化数据目录 (存储用户上传的图片与媒体文件)
├── ecosystem.config.cjs      # PM2 生产环境部署配置
├── Caddyfile                 # Caddy 反向代理与 HTTPS 配置
├── caddy.exe / cloudflared.exe # 内网穿透与代理工具
├── start.bat / stop.bat      # 项目便捷启停脚本
├── update.bat                # 快捷更新脚本
└── plan.md                   # 项目整体规划文档