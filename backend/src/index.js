import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { db } from './db/index.js';
import { itemMemos } from './db/schema.js';
import { and, eq, lte } from 'drizzle-orm';
import customer from './routes/customer.js';
import staff from './routes/staff.js';
import { auth } from './routes/auth.js';
import { admin } from './routes/admin.js';
import { upload } from './routes/upload.js';
import { notice } from './routes/notice.js';
import { postRouter } from './routes/posts.js';
import { commentRouter } from './routes/comments.js';
import { communityAdminRouter } from './routes/community-admin.js';
import { activityRouter } from './routes/activities.js';
import { adminActivityRouter } from './routes/admin-activities.js';
import { trafficRouter } from './routes/traffic.js';
import { parkingRouter } from './routes/parking.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = new Hono();
app.use('*', logger());
app.use('*', cors());
// Serve uploaded files manually (avoid serveStatic compatibility issues with tsx watch)
const mimeTypes = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
};
app.get('/api/uploads/:filename', async (c) => {
    const filename = c.req.param('filename');
    const uploadDir = path.resolve(__dirname, '../data/uploads');
    const filepath = path.join(uploadDir, filename);
    if (!fs.existsSync(filepath)) {
        return c.json({ error: 'File not found' }, 404);
    }
    const ext = path.extname(filename).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    const fileBuffer = fs.readFileSync(filepath);
    return new Response(fileBuffer, {
        headers: { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=86400' }
    });
});
// Routes
app.route('/api/customer', customer);
app.route('/api/staff', staff);
app.route('/api/auth', auth);
app.route('/api/admin', admin);
app.route('/api/upload', upload);
app.route('/api/notice', notice);
app.route('/api/posts', postRouter);
app.route('/api/comments', commentRouter);
app.route('/api/community-admin', communityAdminRouter);
app.route('/api/activities', activityRouter);
app.route('/api/admin/activities', adminActivityRouter);
app.route('/api/traffic', trafficRouter);
app.route('/api/parking', parkingRouter);
app.get('/', (c) => {
    return c.json({ message: 'Welcome to Supermarket API' });
});
const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
console.log(`Server is running on port ${port}`);
serve({
    fetch: app.fetch,
    port
});
// Auto cleanup job: runs every hour to delete memos completed > 24h ago
setInterval(async () => {
    try {
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const oldMemos = await db.select().from(itemMemos)
            .where(and(eq(itemMemos.isCompleted, true), lte(itemMemos.completedAt, cutoff)));
        for (const memo of oldMemos) {
            // delete file
            if (memo.imageUrl) {
                // extract filename from url
                const filename = memo.imageUrl.split('/').pop();
                if (filename) {
                    const filepath = path.resolve(__dirname, '../data/uploads', filename);
                    if (fs.existsSync(filepath)) {
                        fs.unlinkSync(filepath);
                    }
                }
            }
            // delete record
            await db.delete(itemMemos).where(eq(itemMemos.id, memo.id));
        }
    }
    catch (error) {
        console.error('Cleanup job error:', error);
    }
}, 60 * 60 * 1000);
