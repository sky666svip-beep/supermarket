// 模块：顾客核心服务 API (门店查询、购物清单、问题反馈)
import { Hono } from 'hono'
import { db } from '../db/index.js'
import { stores, checklists, feedbacks, itemMemos } from '../db/schema.js'
import { eq, and, desc } from 'drizzle-orm'

const customer = new Hono()

// ---- Stores ----
customer.get('/stores', async (c) => {
  const city = c.req.query('city')
  const district = c.req.query('district')
  
  const conditions = []
  if (city) conditions.push(eq(stores.city, city))
  if (district) conditions.push(eq(stores.district, district))
  
  const result = await db.select().from(stores).where(conditions.length > 0 ? and(...conditions) : undefined)
  return c.json(result)
})

customer.get('/regions', async (c) => {
  const allStores = await db.select({
    province: stores.province,
    city: stores.city,
    district: stores.district
  }).from(stores)
  
  const tree: any = {}
  
  allStores.forEach(s => {
    if (!tree[s.province!]) tree[s.province!] = {}
    if (!tree[s.province!][s.city!]) tree[s.province!][s.city!] = new Set()
    tree[s.province!][s.city!].add(s.district!)
  })
  
  const columns = Object.keys(tree).sort((a, b) => a.localeCompare(b, 'zh-CN')).map(prov => {
    return {
      text: prov,
      value: prov,
      children: Object.keys(tree[prov]).sort((a, b) => a.localeCompare(b, 'zh-CN')).map(city => {
        return {
          text: city,
          value: city,
          children: Array.from(tree[prov][city] as Set<string>).sort((a, b) => a.localeCompare(b, 'zh-CN')).map(dist => ({
            text: dist,
            value: dist
          }))
        }
      })
    }
  })
  
  return c.json(columns)
})

// Auth middleware for customer endpoints
const requireUser = async (c: any, next: any) => {
  const userIdStr = c.req.header('X-User-Id')
  if (!userIdStr) {
    return c.json({ error: '请先登录' }, 401)
  }
  await next()
}

// ---- Checklist ----
customer.get('/checklist', requireUser, async (c) => {
  const userId = Number(c.req.header('X-User-Id'))
  const result = await db.select().from(checklists).where(eq(checklists.userId, userId))
  return c.json(result)
})

customer.post('/checklist', requireUser, async (c) => {
  const userId = Number(c.req.header('X-User-Id'))
  const { title } = await c.req.json()
  const result = await db.insert(checklists).values({ title, userId }).returning()
  return c.json(result[0])
})

customer.put('/checklist/:id', requireUser, async (c) => {
  const userId = Number(c.req.header('X-User-Id'))
  const id = Number(c.req.param('id'))
  const { isCompleted } = await c.req.json()
  await db.update(checklists)
    .set({ isCompleted })
    .where(and(eq(checklists.id, id), eq(checklists.userId, userId)))
  return c.json({ success: true })
})

customer.delete('/checklist/:id', requireUser, async (c) => {
  const userId = Number(c.req.header('X-User-Id'))
  const id = Number(c.req.param('id'))
  await db.delete(checklists).where(and(eq(checklists.id, id), eq(checklists.userId, userId)))
  return c.json({ success: true })
})

// ---- Feedback ----
customer.get('/feedback', requireUser, async (c) => {
  const userId = Number(c.req.header('X-User-Id'))
  const result = await db.select({
    id: feedbacks.id,
    facilityType: feedbacks.facilityType,
    message: feedbacks.message,
    images: feedbacks.images,
    status: feedbacks.status,
    adminReply: feedbacks.adminReply,
    resolvedAt: feedbacks.resolvedAt,
    createdAt: feedbacks.createdAt,
    storeName: stores.name
  })
  .from(feedbacks)
  .leftJoin(stores, eq(feedbacks.storeId, stores.id))
  .where(eq(feedbacks.userId, userId))
  .orderBy(desc(feedbacks.createdAt))
  return c.json(result)
})

customer.post('/feedback', requireUser, async (c) => {
  const userId = Number(c.req.header('X-User-Id'))
  const { storeId, facilityType, message, images } = await c.req.json()
  const imagesJson = images && images.length > 0 ? JSON.stringify(images) : null
  const result = await db.insert(feedbacks).values({ storeId, facilityType, message, images: imagesJson, userId }).returning()
  return c.json(result[0])
})

customer.delete('/feedback/:id', requireUser, async (c) => {
  const userId = Number(c.req.header('X-User-Id'))
  const id = Number(c.req.param('id'))
  
  const target = await db.select().from(feedbacks).where(and(eq(feedbacks.id, id), eq(feedbacks.userId, userId)))
  if (target.length === 0) return c.json({ error: '工单不存在' }, 404)
  if (target[0].status !== 'resolved') return c.json({ error: '仅能删除已解决的工单' }, 400)
  
  await db.delete(feedbacks).where(eq(feedbacks.id, id))
  return c.json({ success: true })
})

// ---- Item Memos ----
customer.get('/memos', requireUser, async (c) => {
  const userId = Number(c.req.header('X-User-Id'))
  const result = await db.select().from(itemMemos).where(eq(itemMemos.userId, userId)).orderBy(desc(itemMemos.createdAt))
  return c.json(result)
})

customer.post('/memos', requireUser, async (c) => {
  const userId = Number(c.req.header('X-User-Id'))
  const data = await c.req.json()
  const result = await db.insert(itemMemos).values({
    ...data,
    userId
  }).returning()
  return c.json(result[0])
})

customer.put('/memos/:id', requireUser, async (c) => {
  const userId = Number(c.req.header('X-User-Id'))
  const id = Number(c.req.param('id'))
  const data = await c.req.json()
  
  if (data.isCompleted) {
    data.completedAt = new Date()
  } else if (data.isCompleted === false) {
    data.completedAt = null
  }
  
  const result = await db.update(itemMemos).set(data)
    .where(and(eq(itemMemos.id, id), eq(itemMemos.userId, userId)))
    .returning()
  return c.json(result[0] || { success: true })
})

customer.delete('/memos/:id', requireUser, async (c) => {
  const userId = Number(c.req.header('X-User-Id'))
  const id = Number(c.req.param('id'))
  await db.delete(itemMemos).where(and(eq(itemMemos.id, id), eq(itemMemos.userId, userId)))
  return c.json({ success: true })
})

export default customer
