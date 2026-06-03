import { Hono } from 'hono'
import { db } from '../db/index.js'
import { activities, activityStores } from '../db/schema.js'
import { eq, inArray } from 'drizzle-orm'
import { authMiddleware, AuthContext } from './auth.js'

export const adminActivityRouter = new Hono<AuthContext>()

// Apply auth middleware and admin check
adminActivityRouter.use('*', authMiddleware, async (c, next) => {
  const user = c.get('user')
  if (user.role !== 'admin') {
    return c.json({ success: false, message: '权限不足', data: null })
  }
  await next()
})

// Get all activities
adminActivityRouter.get('/', async (c) => {
  try {
    const allActivities = await db.select().from(activities).orderBy(activities.createdAt)
    const allActivityIds = allActivities.map(a => a.id)
    
    const storeMappings = new Map<number, number[]>()
    if (allActivityIds.length > 0) {
      const linked = await db.select().from(activityStores).where(inArray(activityStores.activityId, allActivityIds))
      for (const l of linked) {
        if (!storeMappings.has(l.activityId)) {
          storeMappings.set(l.activityId, [])
        }
        storeMappings.get(l.activityId)!.push(l.storeId)
      }
    }

    const result = allActivities.map(act => ({
      ...act,
      storeIds: storeMappings.get(act.id) || []
    }))
    
    return c.json({ success: true, data: result, message: 'Success' })
  } catch (error) {
    return c.json({ success: false, data: null, message: 'Failed to get activities' }, 500)
  }
})

// Create activity
adminActivityRouter.post('/', async (c) => {
  const body = await c.req.json()
  
  if (!body.isAllStores && (!body.storeIds || body.storeIds.length === 0)) {
    return c.json({ success: false, message: '非全门店活动必须指定至少一个关联门店', data: null })
  }
  
  try {
    let newActivity: any = null
    db.transaction((tx) => {
      newActivity = tx.insert(activities).values({
        title: body.title,
        content: body.content,
        images: body.images ? JSON.stringify(body.images) : null,
        startTime: body.startTime ? new Date(body.startTime) : null,
        endTime: body.endTime ? new Date(body.endTime) : null,
        isAllStores: body.isAllStores || false,
        isActive: body.isActive !== undefined ? body.isActive : true,
      }).returning().get()

      if (!body.isAllStores) {
        const storeInsertData = body.storeIds.map((sid: number) => ({
          activityId: newActivity.id,
          storeId: sid
        }))
        tx.insert(activityStores).values(storeInsertData).run()
      }
    })
    
    return c.json({ success: true, data: newActivity, message: 'Created' })
  } catch (error) {
    console.error('Create activity error:', error)
    return c.json({ success: false, data: null, message: 'Create failed' }, 500)
  }
})

// Update activity
adminActivityRouter.put('/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  const body = await c.req.json()
  
  if (!body.isAllStores && (!body.storeIds || body.storeIds.length === 0)) {
    return c.json({ success: false, message: '非全门店活动必须指定至少一个关联门店', data: null })
  }
  
  try {
    const targetList = await db.select().from(activities).where(eq(activities.id, id)).limit(1)
    if (targetList.length === 0) return c.json({ success: false, message: '活动不存在', data: null })
    
    db.transaction((tx) => {
      tx.update(activities).set({
        title: body.title,
        content: body.content,
        images: body.images ? JSON.stringify(body.images) : null,
        startTime: body.startTime ? new Date(body.startTime) : null,
        endTime: body.endTime ? new Date(body.endTime) : null,
        isAllStores: body.isAllStores || false,
        isActive: body.isActive !== undefined ? body.isActive : true,
      }).where(eq(activities.id, id)).run()
      
      tx.delete(activityStores).where(eq(activityStores.activityId, id)).run()
      
      if (!body.isAllStores) {
        const storeInsertData = body.storeIds.map((sid: number) => ({
          activityId: id,
          storeId: sid
        }))
        tx.insert(activityStores).values(storeInsertData).run()
      }
    })
    
    return c.json({ success: true, data: null, message: 'Updated' })
  } catch (error) {
    console.error('Update activity error:', error)
    return c.json({ success: false, data: null, message: 'Update failed' }, 500)
  }
})

// Delete activity
adminActivityRouter.delete('/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  try {
    const targetList = await db.select().from(activities).where(eq(activities.id, id)).limit(1)
    if (targetList.length === 0) return c.json({ success: false, message: '活动不存在', data: null })
    
    db.transaction((tx) => {
      tx.delete(activityStores).where(eq(activityStores.activityId, id)).run()
      tx.delete(activities).where(eq(activities.id, id)).run()
    })
    
    return c.json({ success: true, data: null, message: 'Deleted' })
  } catch (error) {
    console.error('Delete activity error:', error)
    return c.json({ success: false, data: null, message: 'Delete failed' }, 500)
  }
})
