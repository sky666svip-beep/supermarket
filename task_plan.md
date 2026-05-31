# Task Plan: 社区发帖与管理功能开发

## Goal
实现用户可以发布图文帖子、评论互动，以及管理员进行审核管理的完整社区论坛功能。

## Phases

### Phase 1: 数据库与后端路由支持
- [x] 在 `backend/src/db/schema.ts` 新增 `posts`, `comments`, `postLikes`, `commentLikes`, `postCollections` 表。
- [x] 编写帖子相关路由 (`posts.ts`)：列表、详情、发帖、点赞、收藏。
- [x] 编写评论相关路由 (`comments.ts`)：发表评论、删除、点赞。
- [x] 编写管理员帖子审核及管理接口。
- [x] 更新主路由并在后端应用中挂载。
- **Status**: complete

### Phase 2: 前端用户功能开发
- [x] 社区首页/帖子列表页：分页加载、多Tab（最新/最热/精华）。
- [x] 帖子详情页：帖子内容展示、评论树形展示、点赞与收藏。
- [x] 发帖页：复用现有 `upload.ts` 上传图片、填写标题/正文/标签。
- [x] 个人中心相关页：我的帖子、我的评论、我的收藏、收到的回复。
- **Status**: complete

### Phase 3: 前端后台管理功能开发
- [x] 后台帖子审核页面：列表展示待审核/已审核帖子。
- [x] 举报管理页面与自动下架逻辑。
- **Status**: complete

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
