// 模块：管理员后台 API
import { Hono } from 'hono'
import { db } from '../db/index.js'
import { users, feedbacks, stores } from '../db/schema.js'
import { eq, desc, sql } from 'drizzle-orm'
import { authMiddleware, AuthContext } from './auth.js'

export const admin = new Hono<AuthContext>()

// Apply auth middleware and admin check to all admin routes
admin.use('*', authMiddleware, async (c, next) => {
  const user = c.get('user')
  if (user.role !== 'admin') {
    return c.json({ error: '权限不足' }, 403)
  }
  await next()
})

// Get all feedbacks with user details
admin.get('/feedbacks', async (c) => {
  try {
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
  } catch (error) {
    console.error('Get feedbacks error:', error)
    return c.json({ error: '获取工单失败' }, 500)
  }
})

// Update feedback status
admin.put('/feedbacks/:id/status', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    const { status } = await c.req.json()
    
    if (!['pending', 'processing', 'resolved'].includes(status)) {
      return c.json({ error: '状态无效' })
    }
    
    const targetList = await db.select().from(feedbacks).where(eq(feedbacks.id, id)).limit(1)
    if (targetList.length === 0) return c.json({ error: '工单不存在' })
    const target = targetList[0]

    const updates: any = { status }
    // 仅当首次解决时记录时间，防止重新打开再解决时丢失初始解决时间
    if (status === 'resolved' && !target.resolvedAt) {
      updates.resolvedAt = new Date()
    }
    
    await db.update(feedbacks).set(updates).where(eq(feedbacks.id, id))
    return c.json({ success: true })
  } catch (error) {
    console.error('Update feedback status error:', error)
    return c.json({ error: '更新状态失败' }, 500)
  }
})

// Admin reply to a feedback
admin.put('/feedbacks/:id/reply', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    const { reply } = await c.req.json()
    
    if (!reply || !reply.trim()) {
      return c.json({ error: '回复内容不能为空' })
    }
    
    const targetList = await db.select().from(feedbacks).where(eq(feedbacks.id, id)).limit(1)
    if (targetList.length === 0) return c.json({ error: '工单不存在' })
    if (targetList[0].status === 'resolved') {
      return c.json({ error: '工单已解决，无法继续回复' })
    }
    
    await db.update(feedbacks).set({ adminReply: reply.trim() }).where(eq(feedbacks.id, id))
    return c.json({ success: true })
  } catch (error) {
    console.error('Reply feedback error:', error)
    return c.json({ error: '回复失败' }, 500)
  }
})

// Admin delete feedback
admin.delete('/feedbacks/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    
    const target = await db.select().from(feedbacks).where(eq(feedbacks.id, id)).limit(1)
    if (target.length === 0) return c.json({ error: '工单不存在' })
    if (target[0].status !== 'resolved') return c.json({ error: '仅能删除已解决的工单' })
    
    await db.delete(feedbacks).where(eq(feedbacks.id, id))
    return c.json({ success: true })
  } catch (error) {
    console.error('Delete feedback error:', error)
    return c.json({ error: '删除工单失败' }, 500)
  }
})

// Admin: Get all stores for dropdowns
admin.get('/stores', async (c) => {
  try {
    const result = await db.select({ id: stores.id, name: stores.name }).from(stores)
    return c.json(result)
  } catch (error) {
    console.error('Get stores error:', error)
    return c.json({ error: '获取店铺列表失败' }, 500)
  }
})
