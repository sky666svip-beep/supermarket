// 模块：顾客核心服务 API (门店查询、购物清单、问题反馈)
import { Hono } from 'hono'
import { db } from '../db/index.js'
import { stores, checklists, feedbacks, itemMemos } from '../db/schema.js'
import { eq, and, desc } from 'drizzle-orm'
import { authMiddleware, AuthContext } from './auth.js'

const customer = new Hono<AuthContext>()

// ---- Stores & Regions Cache ----
let storesCache: any[] | null = null
let storesCacheExpiry = 0
let storesFetchPromise: Promise<any[]> | null = null

let regionsCache: any = null
let regionsCacheSourceRef: any[] | null = null

const CACHE_TTL = 1000 * 60 * 60 // 1小时缓存

// 暴露缓存清理方法，供后续管理员操作（增删改门店）时调用
export function invalidateStoresCache() {
  storesCache = null
  storesCacheExpiry = 0
  regionsCache = null
  regionsCacheSourceRef = null
}

// 获取门店数据（防缓存击穿/并发重复查询）
async function getStores() {
  if (storesCache && Date.now() < storesCacheExpiry) {
    return storesCache
  }
  
  if (storesFetchPromise) {
    return storesFetchPromise
  }
  
  storesFetchPromise = db.select().from(stores).then(res => {
    storesCache = res
    storesCacheExpiry = Date.now() + CACHE_TTL
    storesFetchPromise = null
    return res
  }).catch(err => {
    storesFetchPromise = null
    throw err
  })
  
  return storesFetchPromise
}

customer.get('/stores', async (c) => {
  const city = c.req.query('city')
  const district = c.req.query('district')
  
  // 1. 获取全量门店数据
  let allStores = await getStores()
  
  // 2. 内存过滤
  let result = allStores
  if (city) {
    result = result.filter(s => s.city === city)
  }
  if (district) {
    result = result.filter(s => s.district === district)
  }
  
  return c.json(result)
})

customer.get('/regions', async (c) => {
  let allStores = await getStores()

  // 通过引用比对防止漂移：只有基于最新的 storesCache 计算出的 regionsCache 才是有效的
  if (regionsCache && regionsCacheSourceRef === allStores) {
    return c.json(regionsCache)
  }
  
  const tree: any = {}
  
  allStores.forEach(s => {
    if (!tree[s.province!]) tree[s.province!] = {}
    if (!tree[s.province!][s.city!]) tree[s.province!][s.city!] = new Set()
    tree[s.province!][s.city!].add(s.district!)
  })
  
  const columns = Object.keys(tree).sort((a, b) => (a || '').localeCompare(b || '', 'zh-CN')).map(prov => {
    return {
      text: prov,
      value: prov,
      children: Object.keys(tree[prov]).sort((a, b) => (a || '').localeCompare(b || '', 'zh-CN')).map(city => {
        return {
          text: city,
          value: city,
          children: Array.from(tree[prov][city] as Set<string>).sort((a, b) => (a || '').localeCompare(b || '', 'zh-CN')).map(dist => ({
            text: dist,
            value: dist
          }))
        }
      })
    }
  })
  
  regionsCache = columns
  regionsCacheSourceRef = allStores

  return c.json(columns)
})

// Auth middleware replaced by authMiddleware from auth.js

// ---- Checklist ----
customer.get('/checklist', authMiddleware, async (c) => {
  const user = c.get('user')
  const userId = user.id
  const result = await db.select().from(checklists).where(eq(checklists.userId, userId))
  return c.json(result)
})

customer.post('/checklist', authMiddleware, async (c) => {
  const user = c.get('user')
  const userId = user.id
  const { title } = await c.req.json()
  if (!title) return c.json({ error: '标题不能为空' }, 400)
  const result = await db.insert(checklists).values({ title, userId }).returning()
  return c.json(result[0])
})

customer.put('/checklist/:id', authMiddleware, async (c) => {
  const user = c.get('user')
  const userId = user.id
  const id = Number(c.req.param('id'))
  const { isCompleted } = await c.req.json()
  const result = await db.update(checklists)
    .set({ isCompleted })
    .where(and(eq(checklists.id, id), eq(checklists.userId, userId)))
    .returning()
  if (result.length === 0) return c.json({ error: '清单项不存在' }, 404)
  return c.json({ success: true })
})

customer.delete('/checklist/:id', authMiddleware, async (c) => {
  const user = c.get('user')
  const userId = user.id
  const id = Number(c.req.param('id'))
  await db.delete(checklists).where(and(eq(checklists.id, id), eq(checklists.userId, userId)))
  return c.json({ success: true })
})

// ---- Feedback ----
customer.get('/feedback', authMiddleware, async (c) => {
  const user = c.get('user')
  const userId = user.id
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

customer.post('/feedback', authMiddleware, async (c) => {
  const user = c.get('user')
  const userId = user.id
  const { storeId, facilityType, message, images } = await c.req.json()
  if (!storeId || !facilityType || !message) {
    return c.json({ error: '门店、反馈类型和内容不能为空' }, 400)
  }
  const imagesJson = images && images.length > 0 ? JSON.stringify(images) : null
  const result = await db.insert(feedbacks).values({ storeId, facilityType, message, images: imagesJson, userId }).returning()
  return c.json(result[0])
})

customer.delete('/feedback/:id', authMiddleware, async (c) => {
  const user = c.get('user')
  const userId = user.id
  const id = Number(c.req.param('id'))
  
  const target = await db.select().from(feedbacks).where(and(eq(feedbacks.id, id), eq(feedbacks.userId, userId)))
  if (target.length === 0) return c.json({ error: '工单不存在' }, 404)
  if (target[0].status !== 'resolved') return c.json({ error: '仅能删除已解决的工单' }, 400)
  
  await db.delete(feedbacks).where(and(eq(feedbacks.id, id), eq(feedbacks.userId, userId)))
  return c.json({ success: true })
})

// ---- Item Memos ----
customer.get('/memos', authMiddleware, async (c) => {
  const user = c.get('user')
  const userId = user.id
  const result = await db.select().from(itemMemos).where(eq(itemMemos.userId, userId)).orderBy(desc(itemMemos.createdAt))
  return c.json(result)
})

customer.post('/memos', authMiddleware, async (c) => {
  const user = c.get('user')
  const userId = user.id
  const data = await c.req.json()
  delete data.id
  delete data.userId
  const result = await db.insert(itemMemos).values({
    ...data,
    userId
  }).returning()
  return c.json(result[0])
})

customer.put('/memos/:id', authMiddleware, async (c) => {
  const user = c.get('user')
  const userId = user.id
  const id = Number(c.req.param('id'))
  const data = await c.req.json()
  delete data.id
  delete data.userId
  
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

customer.delete('/memos/:id', authMiddleware, async (c) => {
  const user = c.get('user')
  const userId = user.id
  const id = Number(c.req.param('id'))
  await db.delete(itemMemos).where(and(eq(itemMemos.id, id), eq(itemMemos.userId, userId)))
  return c.json({ success: true })
})

export default customer
