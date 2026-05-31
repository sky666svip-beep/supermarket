import { Hono } from 'hono';
import { db } from '../db/index.js';
import { maintenance, patrols, feedbacks } from '../db/schema.js';
const staff = new Hono();
// ---- Maintenance ----
staff.post('/maintenance', async (c) => {
    const body = await c.req.json();
    const result = await db.insert(maintenance).values({
        location: body.location,
        message: body.message,
        status: 'pending'
    }).returning();
    return c.json(result[0]);
});
staff.get('/maintenance', async (c) => {
    const result = await db.select().from(maintenance);
    return c.json(result);
});
// ---- Patrol ----
staff.post('/patrol', async (c) => {
    const body = await c.req.json();
    const result = await db.insert(patrols).values({
        area: body.area,
        status: body.status,
        message: body.message
    }).returning();
    return c.json(result[0]);
});
// ---- Dashboard (Todo List) ----
staff.get('/todos', async (c) => {
    const pendingFeedbacks = await db.select().from(feedbacks);
    const pendingMaintenance = await db.select().from(maintenance);
    return c.json({
        feedbacks: pendingFeedbacks,
        maintenance: pendingMaintenance
    });
});
export default staff;
