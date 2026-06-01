import { Hono } from 'hono';
import { db } from '../db/index.js';
import { storeTraffic } from '../db/schema.js';
import { eq, and, gte } from 'drizzle-orm';
import { authMiddleware } from './auth.js';
export const trafficRouter = new Hono();
// GET /api/traffic/:storeId
// Returns aggregated traffic data for the store within the last hour
trafficRouter.get('/:storeId', async (c) => {
    const storeId = parseInt(c.req.param('storeId'));
    if (isNaN(storeId)) {
        return c.json({ error: 'Invalid store ID' }, 400);
    }
    try {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const trafficData = await db.select().from(storeTraffic)
            .where(and(eq(storeTraffic.storeId, storeId), gte(storeTraffic.createdAt, oneHourAgo)));
        // Aggregate by floor using majority rule
        // Format: { floor: { level1: count, level2: count... } }
        const floorCounts = {};
        let lastUpdatedAt = null;
        let totalSubmissions = trafficData.length;
        for (const record of trafficData) {
            const floor = record.floor ?? 1; // default to 1F if null
            if (!floorCounts[floor]) {
                floorCounts[floor] = {};
            }
            floorCounts[floor][record.level] = (floorCounts[floor][record.level] || 0) + 1;
            if (!lastUpdatedAt || (record.createdAt && new Date(record.createdAt) > new Date(lastUpdatedAt))) {
                lastUpdatedAt = record.createdAt;
            }
        }
        const aggregated = [];
        for (const floorStr in floorCounts) {
            const floor = parseInt(floorStr);
            const counts = floorCounts[floor];
            let maxCount = 0;
            let majorityLevel = 1;
            for (const levelStr in counts) {
                const level = parseInt(levelStr);
                const count = counts[level];
                if (count > maxCount) {
                    maxCount = count;
                    majorityLevel = level;
                }
            }
            aggregated.push({ floor, level: majorityLevel });
        }
        return c.json({
            aggregated,
            totalSubmissions,
            lastUpdatedAt
        });
    }
    catch (error) {
        console.error('Error fetching traffic:', error);
        return c.json({ error: 'Failed to fetch traffic data' }, 500);
    }
});
// POST /api/traffic
// Submit traffic data, requires auth
trafficRouter.post('/', authMiddleware, async (c) => {
    const user = c.get('user');
    const body = await c.req.json();
    const { storeId, floor, level } = body;
    if (!storeId || !level) {
        return c.json({ error: 'storeId and level are required' }, 400);
    }
    try {
        // Check if user has submitted for this store in the last hour
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const existing = await db.select().from(storeTraffic)
            .where(and(eq(storeTraffic.storeId, storeId), eq(storeTraffic.floor, floor), eq(storeTraffic.userId, user.id), gte(storeTraffic.createdAt, oneHourAgo)))
            .limit(1);
        if (existing.length > 0) {
            return c.json({ error: `您在过去一小时内已提交过该楼层 (${floor < 0 ? 'B' + Math.abs(floor) : floor + 'F'}) 的客流量，请稍后再试` }, 400);
        }
        // 构造当前所在的小时块 (YYYY-MM-DD-HH) 以匹配底层数据库的 Unique 约束
        const now = new Date();
        const dateHour = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}`;
        await db.insert(storeTraffic).values({
            storeId,
            floor,
            level,
            userId: user.id,
            dateHour
        });
        return c.json({ message: 'Success' });
    }
    catch (error) {
        console.error('Error submitting traffic:', error);
        return c.json({ error: 'Failed to submit traffic' }, 500);
    }
});
