# Findings

## 已有架构
- 前台主页 `d:\Projects\supermarket\frontend\src\views\Home.vue` 使用了 Vue 3 + Vant UI。
- 管理后台位于 `d:\Projects\supermarket\frontend\src\views\admin\` 下。
- 后端使用了 Express + Drizzle ORM (SQLite)，在 `d:\Projects\supermarket\backend\src\db\schema.ts`。
- 图片上传已经存在 `upload.ts`，可复用。
- 响应格式统一为 `{ success: boolean, data: any, message: string }`。

## 当前任务发现
- 需要新增社区发帖功能，涉及新表：`posts`, `comments`, `post_likes`, `comment_likes`, `post_collections`。
- 帖子需经过管理员后台审核。这涉及到帖子的状态设计（例如 `status: 'pending' | 'approved' | 'rejected'`）。
- 需要实现帖子加精、置顶。可在 `posts` 表中增加 `isTop`、`isElite` 字段。
- 举报功能需要一张 `reports` 表记录违规举报。
