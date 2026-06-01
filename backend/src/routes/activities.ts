import { Hono } from 'hono'
import { db } from '../db/index.js'
import { activities, activityStores, stores } from '../db/schema.js'
import { and, eq, lte, gte, or } from 'drizzle-orm'

export const activityRouter = new Hono()

// Get active activities for customer frontend
activityRouter.get('/', async (c) => {
  const storeId = c.req.query('storeId')
  const now = new Date()

  try {
    const allActivities = await db.select().from(activities)
      .where(
        and(
          eq(activities.isActive, true),
          or(
            // No start/end time
            and(eq(activities.startTime, null as any), eq(activities.endTime, null as any)),
            // Only start time
            and(lte(activities.startTime, now), eq(activities.endTime, null as any)),
            // Only end time
            and(eq(activities.startTime, null as any), gte(activities.endTime, now)),
            // Both start and end time
            and(lte(activities.startTime, now), gte(activities.endTime, now))
          )
        )
      )

    const result = []

    for (const activity of allActivities) {
      if (activity.isAllStores) {
        result.push({ ...activity, storeNames: ['全门店通用'] })
      } else if (storeId) {
        // Check if this activity is linked to the store
        const linkedStores = await db.select({ id: stores.id, name: stores.name }).from(activityStores)
          .innerJoin(stores, eq(activityStores.storeId, stores.id))
          .where(eq(activityStores.activityId, activity.id))

        if (linkedStores.some(s => s.id === parseInt(storeId))) {
          result.push({ ...activity, storeNames: linkedStores.map(s => s.name) })
        }
      }
    }

    return c.json({ success: true, data: result, message: 'Success' })
  } catch (error) {
    console.error('Error fetching activities:', error)
    return c.json({ success: false, data: [], message: 'Failed to fetch activities' }, 500)
  }
})
