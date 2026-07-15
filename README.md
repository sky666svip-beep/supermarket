# 🛒 Supermarket App (超市管理系统)

一个基于 Vue 3 和 Hono 构建的现代化全栈商场电商系统。提供前台用户界面与后台管理功能。

## 🌟 特性

- **现代化前端**：使用 Vue 3 (Composition API)、Vite 和 Tailwind CSS 构建，界面美观响应迅速。
- **移动端优先**：集成 Vant UI 组件库，完美适配移动设备。
- **高性能后端**：基于 Hono 框架，提供极速的 API 响应。
- **轻量级数据库**：使用 Better-SQLite3 结合 Drizzle ORM，类型安全，轻量且易于部署。
- **PWA 支持**：支持渐进式 Web 应用，可安装至桌面或主屏幕。
- **丰富的功能支持**：密码加密 (bcryptjs)、邮件通知 (nodemailer)、图片处理 (sharp)、地图展示 (Leaflet) 等。

## 🛠️ 技术栈

### 前端 (Frontend)
- Vue 3 + TypeScript
- Vite
- Tailwind CSS v4
- Vant UI
- Pinia (状态管理)
- Vue Router (前端路由)
- Leaflet (地图服务)
- vite-plugin-pwa

### 后端 (Backend)
- Node.js
- Hono
- Better-SQLite3
- Drizzle ORM
- bcryptjs, nodemailer, sharp

## 📁 目录结构

```text
supermarket-app/
├── frontend/             # 前台 Vue 3 + Vite 源码
├── backend/              # 后台 Hono + SQLite 源码
├── data/                 # 数据库及持久化数据存放目录
├── Caddyfile             # Caddy Web 服务器反向代理配置
├── ecosystem.config.cjs  # PM2 进程守护配置
├── package.json          # 根目录工作区及快捷脚本
└── README.md
```

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone <your-repository-url>
cd supermarket-app
```

### 2. 安装依赖

在根目录执行以下命令，会自动安装前端和后端的全部依赖：

```bash
npm run install:all
```
*(该命令会自动分别进入 `frontend` 和 `backend` 安装依赖。)*

### 3. 数据库准备

进入 `backend` 目录，初始化并同步数据库结构：

```bash
cd backend
npm run db:generate
npm run db:push
```

### 4. 启动开发服务器

回到项目根目录，一键启动前后端开发服务器：

```bash
npm run dev
```

- 前端开发服务器通常运行在 `http://localhost:5173`
- 后端 API 服务器通常运行在 `http://localhost:3000` (具体请参考后端控制台输出)

## 📦 生产部署

项目根目录提供了相关部署脚本和配置，帮助你快速将应用部署到生产环境：

- **PM2 进程管理**：通过 `ecosystem.config.cjs` 可以一键启动前后端服务，并保障进程守护。
- **Caddy Web 服务器**：使用 `Caddyfile` 提供极简的反向代理和自动 HTTPS 证书配置。
- **内网穿透 / 隧道部署**：项目内含 `cloudflared.exe`，可通过 Cloudflare Tunnels 快速暴露本地服务到公网。
- **快捷脚本**：包含 `start.bat`, `stop.bat`, `update.bat` 等批处理脚本，用于 Windows 环境下的自动化运维。

## 📄 许可证 (License)

[ISC License](https://opensource.org/licenses/ISC)
