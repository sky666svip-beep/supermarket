import { Hono } from 'hono'
import { db } from '../db/index.js'
import { posts, reports, users } from '../db/schema.js'
import { eq, desc } from 'drizzle-orm'
import { authMiddleware, AuthContext } from './auth.js'

export const communityAdminRouter = new Hono<AuthContext>()

// 需要验证admin权限
communityAdminRouter.use('*', authMiddleware, async (c, next) => {
  const user = c.get('user')
  if (user.role !== 'admin') {
    return c.json({ success: false, data: null, message: '权限不足' }, 403)
  }
  await next()
})

// 获取所有待审核或全部帖子
communityAdminRouter.get('/posts', async (c) => {
  const status = c.req.query('status')
  try {
    const list = await db
      .select({
        post: posts,
        author: {
          id: users.id,
          nickname: users.nickname,
          avatar: users.avatar
        }
      })
      .from(posts)
      .innerJoin(users, eq(posts.userId, users.id))
      .where(status ? eq(posts.status, status as any) : undefined)
      .orderBy(desc(posts.createdAt))
      
    return c.json({ success: true, data: list, message: '获取成功' })
  } catch (error) {
    return c.json({ success: false, data: null, message: '获取失败' }, 500)
  }
})

// 审批帖子
communityAdminRouter.put('/posts/:id/status', async (c) => {
  const id = parseInt(c.req.param('id') || '')
  const { status } = await c.req.json()
  try {
    await db.update(posts).set({ status }).where(eq(posts.id, id))
    return c.json({ success: true, data: null, message: '更新状态成功' })
  } catch (error) {
    return c.json({ success: false, data: null, message: '操作失败' }, 500)
  }
})

// 置顶/加精
communityAdminRouter.put('/posts/:id/attributes', async (c) => {
  const id = parseInt(c.req.param('id') || '')
  const { isTop, isElite } = await c.req.json()
  try {
    const updateData: any = {}
    if (isTop !== undefined) updateData.isTop = isTop
    if (isElite !== undefined) updateData.isElite = isElite
    await db.update(posts).set(updateData).where(eq(posts.id, id))
    return c.json({ success: true, data: null, message: '更新属性成功' })
  } catch (error) {
    return c.json({ success: false, data: null, message: '操作失败' }, 500)
  }
})

// 获取举报列表
communityAdminRouter.get('/reports', async (c) => {
  try {
    const list = await db.select().from(reports).orderBy(desc(reports.createdAt))
    return c.json({ success: true, data: list, message: '获取成功' })
  } catch (error) {
    return c.json({ success: false, data: null, message: '获取失败' }, 500)
  }
})

// 处理举报
communityAdminRouter.put('/reports/:id/status', async (c) => {
  const id = parseInt(c.req.param('id') || '')
  const { status } = await c.req.json()
  try {
    await db.update(reports).set({ status }).where(eq(reports.id, id))
    return c.json({ success: true, data: null, message: '更新举报状态成功' })
  } catch (error) {
    return c.json({ success: false, data: null, message: '操作失败' }, 500)
  }
})
