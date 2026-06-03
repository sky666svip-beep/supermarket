import { Hono } from 'hono'
import { db } from '../db/index.js'
import { activities, activityStores, stores } from '../db/schema.js'
import { and, eq, lte, gte, or, isNull, inArray } from 'drizzle-orm'

export const activityRouter = new Hono()

// Get active activities for customer frontend
activityRouter.get('/', async (c) => {
  const storeId = c.req.query('storeId')
  const storeIdsStr = c.req.query('storeIds')
  const storeIds = storeIdsStr ? storeIdsStr.split(',').map(Number) : (storeId ? [parseInt(storeId)] : [])
  const now = new Date()

  try {
    const timeConditions = or(
      // No start/end time
      and(isNull(activities.startTime), isNull(activities.endTime)),
      // Only start time
      and(lte(activities.startTime, now), isNull(activities.endTime)),
      // Only end time
      and(isNull(activities.startTime), gte(activities.endTime, now)),
      // Both start and end time
      and(lte(activities.startTime, now), gte(activities.endTime, now))
    )

    let storeCondition = undefined
    if (storeIds.length > 0) {
      const rels = await db.select({ activityId: activityStores.activityId })
        .from(activityStores)
        .where(inArray(activityStores.storeId, storeIds))
      const specificActivityIds = rels.map(r => r.activityId)

      if (specificActivityIds.length > 0) {
        storeCondition = or(
          eq(activities.isAllStores, true),
          inArray(activities.id, specificActivityIds)
        )
      } else {
        storeCondition = eq(activities.isAllStores, true)
      }
    }

    const conditions = [
      eq(activities.isActive, true),
      timeConditions
    ]
    if (storeCondition) conditions.push(storeCondition)

    const allActivities = await db.select().from(activities).where(and(...conditions))
    
    // Fetch all linked stores in one query to avoid N+1
    const specificActivities = allActivities.filter(a => !a.isAllStores)
    const specificActivityIds = specificActivities.map(a => a.id)
    const storeMappings = new Map<number, string[]>()
    
    if (specificActivityIds.length > 0) {
      const linked = await db.select({
        activityId: activityStores.activityId,
        storeName: stores.name
      }).from(activityStores)
        .innerJoin(stores, eq(activityStores.storeId, stores.id))
        .where(inArray(activityStores.activityId, specificActivityIds))

      for (const l of linked) {
        if (!storeMappings.has(l.activityId)) {
          storeMappings.set(l.activityId, [])
        }
        storeMappings.get(l.activityId)!.push(l.storeName)
      }
    }

    const result = []
    for (const activity of allActivities) {
      if (activity.isAllStores) {
        result.push({ ...activity, storeNames: ['全门店通用'] })
      } else {
        const sNames = storeMappings.get(activity.id) || []
        if (sNames.length > 0) {
          result.push({ ...activity, storeNames: sNames })
        }
      }
    }

    return c.json({ success: true, data: result, message: 'Success' })
  } catch (error) {
    console.error('Error fetching activities:', error)
    return c.json({ success: false, data: [], message: 'Failed to fetch activities' }, 500)
  }
})
