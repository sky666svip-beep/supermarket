// 模块：停车计费规则查询与计算 API
import { Hono } from 'hono'
import { db } from '../db/index.js'
import { storeParking, stores } from '../db/schema.js'
import { eq } from 'drizzle-orm'

export const parkingRouter = new Hono()

// GET /api/parking
// Returns all stores that have parking rules defined
parkingRouter.get('/', async (c) => {
  try {
    const results = await db
      .select({
        id: storeParking.id,
        storeId: storeParking.storeId,
        storeName: stores.name,
        latitude: stores.latitude,
        longitude: stores.longitude,
        capacity: storeParking.capacity,
        openingHours: storeParking.openingHours,
        freeDurationMinutes: storeParking.freeDurationMinutes,
        dayTimeRange: storeParking.dayTimeRange,
        billingMethod: storeParking.billingMethod,
        dayRateSmall: storeParking.dayRateSmall,
        nightRateSmall: storeParking.nightRateSmall,
        dayRateMedium: storeParking.dayRateMedium,
        nightRateMedium: storeParking.nightRateMedium,
        dayRateLarge: storeParking.dayRateLarge,
        nightRateLarge: storeParking.nightRateLarge,
        baseHourlyRate: storeParking.baseHourlyRate,
        baseHourlyDuration: storeParking.baseHourlyDuration,
        extraHourlyRate: storeParking.extraHourlyRate,
        max24hRate: storeParking.max24hRate,
        newEnergyDiscount: storeParking.newEnergyDiscount,
        specialRules: storeParking.specialRules,
        rawText: storeParking.rawText
      })
      .from(storeParking)
      .leftJoin(stores, eq(storeParking.storeId, stores.id))
      
    // Parse specialRules back to JSON array
    const parsedResults = results.map(r => ({
      ...r,
      specialRules: r.specialRules ? JSON.parse(r.specialRules) : []
    }))
    
    return c.json(parsedResults)
  } catch (error) {
    console.error('Error fetching parking rules:', error)
    return c.json({ error: 'Internal Server Error' }, 500)
  }
})
