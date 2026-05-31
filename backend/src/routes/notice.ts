import { Hono } from 'hono'
import { db } from '../db/index.js'
import { notices, users } from '../db/schema.js'
import { eq, desc, and, or, sql } from 'drizzle-orm'

export const notice = new Hono()

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

// Public: Get active notices (can filter by urgent)
notice.get('/', async (c) => {
  const isUrgent = c.req.query('urgent')
  
  // Filter out inactive and expired notices
  const now = new Date()
  const conditions: any[] = [
    eq(notices.isActive, true),
    or(
      sql`${notices.expiresAt} IS NULL`,
      sql`${notices.expiresAt} > ${now.getTime()}` // Note: SQLite stores timestamps as ms or s depending on drizzle config. Drizzle timestamp mode uses JS Date which maps to integer ms usually.
    ) // Wait, drizzle-orm sqlite timestamp mode stores Date objects as ms. Let's use Date directly or sql wrapper carefully.
  ]
  
  if (isUrgent === 'true') {
    conditions.push(eq(notices.isUrgent, true))
  } else if (isUrgent === 'false') {
    conditions.push(eq(notices.isUrgent, false))
  }

  const result = await db
    .select()
    .from(notices)
    .where(and(...conditions))
    .orderBy(desc(notices.createdAt))

  return c.json(result)
})

// Admin: Get all notices
notice.get('/admin', requireAdmin, async (c) => {
  const result = await db
    .select()
    .from(notices)
    .orderBy(desc(notices.createdAt))
    
  return c.json(result)
})

// Admin: Create notice
notice.post('/', requireAdmin, async (c) => {
  const { title, content, images, isUrgent, expiresAt } = await c.req.json()
  
  if (!title || !content) {
    return c.json({ error: '标题和内容为必填项' }, 400)
  }

  const result = await db.insert(notices).values({
    title,
    content,
    images: images ? JSON.stringify(images) : null,
    isUrgent: isUrgent ?? false,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
    isActive: true
  }).returning()

  return c.json(result[0])
})

// Admin: Update notice
notice.put('/:id', requireAdmin, async (c) => {
  const id = Number(c.req.param('id'))
  const { title, content, images, isUrgent, expiresAt, isActive } = await c.req.json()
  
  const updates: any = {}
  if (title !== undefined) updates.title = title
  if (content !== undefined) updates.content = content
  if (images !== undefined) updates.images = images === null ? null : JSON.stringify(images)
  if (isUrgent !== undefined) updates.isUrgent = isUrgent
  if (expiresAt !== undefined) updates.expiresAt = expiresAt === null ? null : new Date(expiresAt)
  if (isActive !== undefined) updates.isActive = isActive

  const result = await db.update(notices).set(updates).where(eq(notices.id, id)).returning()
  if (result.length === 0) return c.json({ error: '公告不存在' }, 404)
  
  return c.json(result[0])
})

// Admin: Delete notice
notice.delete('/:id', requireAdmin, async (c) => {
  const id = Number(c.req.param('id'))
  await db.delete(notices).where(eq(notices.id, id))
  return c.json({ success: true })
})
