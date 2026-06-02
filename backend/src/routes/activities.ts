import { Hono } from 'hono'
import { db } from '../db/index.js'
import { activities, activityStores, stores } from '../db/schema.js'
import { and, eq, lte, gte, or, isNull } from 'drizzle-orm'

export const activityRouter = new Hono()

// Get active activities for customer frontend
activityRouter.get('/', async (c) => {
  const storeId = c.req.query('storeId')
  const storeIdsStr = c.req.query('storeIds')
  const storeIds = storeIdsStr ? storeIdsStr.split(',').map(Number) : (storeId ? [parseInt(storeId)] : [])
  const now = new Date()

  try {
    const allActivities = await db.select().from(activities)
      .where(
        and(
          eq(activities.isActive, true),
          or(
            // No start/end time
            and(isNull(activities.startTime), isNull(activities.endTime)),
            // Only start time
            and(lte(activities.startTime, now), isNull(activities.endTime)),
            // Only end time
            and(isNull(activities.startTime), gte(activities.endTime, now)),
            // Both start and end time
            and(lte(activities.startTime, now), gte(activities.endTime, now))
          )
        )
      )

    const result = []

    for (const activity of allActivities) {
      if (activity.isAllStores) {
        result.push({ ...activity, storeNames: ['全门店通用'] })
      } else {
        // Check if this activity is linked to the store
        const linkedStores = await db.select({ id: stores.id, name: stores.name }).from(activityStores)
          .innerJoin(stores, eq(activityStores.storeId, stores.id))
          .where(eq(activityStores.activityId, activity.id))

        if (storeIds.length > 0) {
          if (linkedStores.some(s => storeIds.includes(s.id))) {
            result.push({ ...activity, storeNames: linkedStores.map(s => s.name) })
          }
        } else {
          // If no specific storeId requested, return it with its linked stores
          if (linkedStores.length > 0) {
            result.push({ ...activity, storeNames: linkedStores.map(s => s.name) })
          }
        }
      }
    }

    return c.json({ success: true, data: result, message: 'Success' })
  } catch (error) {
    console.error('Error fetching activities:', error)
    return c.json({ success: false, data: [], message: 'Failed to fetch activities' }, 500)
  }
})
