import { Hono } from 'hono'
import { db } from '../db/index.js'
import { activities, activityStores } from '../db/schema.js'
import { eq, inArray } from 'drizzle-orm'

export const adminActivityRouter = new Hono()

// Get all activities
adminActivityRouter.get('/', async (c) => {
  try {
    const allActivities = await db.select().from(activities).orderBy(activities.createdAt)
    const result = []
    
    for (const act of allActivities) {
      const stores = await db.select().from(activityStores).where(eq(activityStores.activityId, act.id))
      result.push({
        ...act,
        storeIds: stores.map(s => s.storeId)
      })
    }
    
    return c.json({ success: true, data: result, message: 'Success' })
  } catch (error) {
    return c.json({ success: false, data: null, message: 'Failed to get activities' }, 500)
  }
})

// Create activity
adminActivityRouter.post('/', async (c) => {
  const body = await c.req.json()
  try {
    const [newActivity] = await db.insert(activities).values({
      title: body.title,
      content: body.content,
      images: body.images ? JSON.stringify(body.images) : null,
      startTime: body.startTime ? new Date(body.startTime) : null,
      endTime: body.endTime ? new Date(body.endTime) : null,
      isAllStores: body.isAllStores || false,
      isActive: body.isActive !== undefined ? body.isActive : true,
    }).returning()

    if (!body.isAllStores && body.storeIds && body.storeIds.length > 0) {
      const storeInsertData = body.storeIds.map((sid: number) => ({
        activityId: newActivity.id,
        storeId: sid
      }))
      await db.insert(activityStores).values(storeInsertData)
    }

    return c.json({ success: true, data: newActivity, message: 'Created' })
  } catch (error) {
    return c.json({ success: false, data: null, message: 'Create failed' }, 500)
  }
})

// Update activity
adminActivityRouter.put('/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  const body = await c.req.json()
  try {
    await db.update(activities).set({
      title: body.title,
      content: body.content,
      images: body.images ? JSON.stringify(body.images) : null,
      startTime: body.startTime ? new Date(body.startTime) : null,
      endTime: body.endTime ? new Date(body.endTime) : null,
      isAllStores: body.isAllStores || false,
      isActive: body.isActive !== undefined ? body.isActive : true,
    }).where(eq(activities.id, id))

    // Update store associations
    await db.delete(activityStores).where(eq(activityStores.activityId, id))
    if (!body.isAllStores && body.storeIds && body.storeIds.length > 0) {
      const storeInsertData = body.storeIds.map((sid: number) => ({
        activityId: id,
        storeId: sid
      }))
      await db.insert(activityStores).values(storeInsertData)
    }

    return c.json({ success: true, data: null, message: 'Updated' })
  } catch (error) {
    return c.json({ success: false, data: null, message: 'Update failed' }, 500)
  }
})

// Delete activity
adminActivityRouter.delete('/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  try {
    // cascades because of foreign key, but we can also manually delete to be safe
    await db.delete(activityStores).where(eq(activityStores.activityId, id))
    await db.delete(activities).where(eq(activities.id, id))
    return c.json({ success: true, data: null, message: 'Deleted' })
  } catch (error) {
    return c.json({ success: false, data: null, message: 'Delete failed' }, 500)
  }
})
