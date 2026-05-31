// 模块：管理员后台 API
import { Hono } from 'hono'
import { db } from '../db/index.js'
import { users, feedbacks, stores } from '../db/schema.js'
import { eq, desc, sql } from 'drizzle-orm'

export const admin = new Hono()

// Auth middleware for admin
const requireAdmin = async (c: any, next: any) => {
  const userIdStr = c.req.header('X-User-Id')
  if (!userIdStr) return c.json({ error: '未登录' }, 401)
  
  const userId = parseInt(userIdStr)
  const userList = await db.select().from(users).where(eq(users.id, userId))
  if (userList.length === 0 || userList[0].role !== 'admin') {
    return c.json({ error: '权限不足' }, 403)
  }
  
  await next()
}

// Auto-cleanup resolved tickets older than 24h
const cleanupResolved = async () => {
  const cutoffSeconds = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000)
  await db.delete(feedbacks).where(
    sql`status = 'resolved' AND resolved_at IS NOT NULL AND resolved_at < ${cutoffSeconds}`
  )
}

// Get all feedbacks with user details
admin.get('/feedbacks', requireAdmin, async (c) => {
  await cleanupResolved()
  
  const result = await db
    .select({
      id: feedbacks.id,
      facilityType: feedbacks.facilityType,
      message: feedbacks.message,
      images: feedbacks.images,
      status: feedbacks.status,
      adminReply: feedbacks.adminReply,
      resolvedAt: feedbacks.resolvedAt,
      createdAt: feedbacks.createdAt,
      username: users.username,
      nickname: users.nickname,
      storeName: stores.name
    })
    .from(feedbacks)
    .leftJoin(users, eq(feedbacks.userId, users.id))
    .leftJoin(stores, eq(feedbacks.storeId, stores.id))
    .orderBy(desc(feedbacks.createdAt))
    
  return c.json(result)
})

// Update feedback status
admin.put('/feedbacks/:id/status', requireAdmin, async (c) => {
  const id = Number(c.req.param('id'))
  const { status } = await c.req.json()
  
  if (!['pending', 'processing', 'resolved'].includes(status)) {
    return c.json({ error: '状态无效' }, 400)
  }
  
  const updates: any = { status }
  if (status === 'resolved') {
    updates.resolvedAt = new Date()
  } else {
    updates.resolvedAt = null
  }
  
  await db.update(feedbacks).set(updates).where(eq(feedbacks.id, id))
  return c.json({ success: true })
})

// Admin reply to a feedback
admin.put('/feedbacks/:id/reply', requireAdmin, async (c) => {
  const id = Number(c.req.param('id'))
  const { reply } = await c.req.json()
  
  if (!reply || !reply.trim()) {
    return c.json({ error: '回复内容不能为空' }, 400)
  }
  
  await db.update(feedbacks).set({ adminReply: reply.trim() }).where(eq(feedbacks.id, id))
  return c.json({ success: true })
})

// Admin delete feedback
admin.delete('/feedbacks/:id', requireAdmin, async (c) => {
  const id = Number(c.req.param('id'))
  
  const target = await db.select().from(feedbacks).where(eq(feedbacks.id, id))
  if (target.length === 0) return c.json({ error: '工单不存在' }, 404)
  if (target[0].status !== 'resolved') return c.json({ error: '仅能删除已解决的工单' }, 400)
  
  await db.delete(feedbacks).where(eq(feedbacks.id, id))
  return c.json({ success: true })
})

// Admin: Get all stores for dropdowns
admin.get('/stores', requireAdmin, async (c) => {
  const result = await db.select({ id: stores.id, name: stores.name }).from(stores)
  return c.json(result)
})
