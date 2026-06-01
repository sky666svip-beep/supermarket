import { Hono } from 'hono';
import { db } from '../db/index.js';
import { posts, postLikes, postCollections, users, comments, commentLikes, stores, reports } from '../db/schema.js';
import { eq, desc, and, sql } from 'drizzle-orm';
import { authMiddleware } from './auth.js';
export const postRouter = new Hono();
// 获取帖子列表 (支持分页和分类、tab)
postRouter.get('/', async (c) => {
    const category = c.req.query('category');
    const tab = c.req.query('tab') || 'latest'; // latest, hot, elite
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '10');
    const offset = (page - 1) * limit;
    let conditions = [eq(posts.status, 'approved')];
    if (category) {
        conditions.push(eq(posts.category, category));
    }
    if (tab === 'elite') {
        conditions.push(eq(posts.isElite, true));
    }
    const queryConditions = conditions.length > 1 ? and(...conditions) : conditions[0];
    let orderFn = desc(posts.createdAt);
    if (tab === 'hot') {
        orderFn = desc(posts.viewCount); // 可以根据 viewCount, likeCount 等综合排序
    }
    try {
        const list = await db
            .select({
            id: posts.id,
            title: posts.title,
            content: posts.content,
            images: posts.images,
            category: posts.category,
            isTop: posts.isTop,
            isElite: posts.isElite,
            viewCount: posts.viewCount,
            likeCount: posts.likeCount,
            commentCount: posts.commentCount,
            createdAt: posts.createdAt,
            storeId: posts.storeId,
            storeName: stores.name,
            author: {
                id: users.id,
                username: users.username,
                nickname: users.nickname,
                avatar: users.avatar
            }
        })
            .from(posts)
            .innerJoin(users, eq(posts.userId, users.id))
            .leftJoin(stores, eq(posts.storeId, stores.id))
            .where(queryConditions)
            .orderBy(desc(posts.isTop), orderFn)
            .limit(limit)
            .offset(offset);
        return c.json({ success: true, data: list, message: '获取成功' });
    }
    catch (error) {
        console.error(error);
        return c.json({ success: false, data: null, message: '获取失败' }, 500);
    }
});
// 获取我的帖子
postRouter.get('/my', authMiddleware, async (c) => {
    const user = c.get('user');
    try {
        const list = await db.select().from(posts).where(eq(posts.userId, user.id)).orderBy(desc(posts.createdAt));
        return c.json({ success: true, data: list, message: '获取成功' });
    }
    catch (error) {
        return c.json({ success: false, data: null, message: '获取失败' }, 500);
    }
});
// 获取我的收藏
postRouter.get('/collections', authMiddleware, async (c) => {
    const user = c.get('user');
    try {
        const list = await db
            .select({
            post: posts,
            author: {
                id: users.id,
                nickname: users.nickname,
                avatar: users.avatar
            }
        })
            .from(postCollections)
            .innerJoin(posts, eq(postCollections.postId, posts.id))
            .innerJoin(users, eq(posts.userId, users.id))
            .where(eq(postCollections.userId, user.id))
            .orderBy(desc(postCollections.createdAt));
        return c.json({ success: true, data: list, message: '获取成功' });
    }
    catch (error) {
        return c.json({ success: false, data: null, message: '获取失败' }, 500);
    }
});
// 获取帖子详情
postRouter.get('/:id', async (c) => {
    const id = parseInt(c.req.param('id') || '');
    try {
        // 浏览量+1
        await db.update(posts).set({ viewCount: sql `${posts.viewCount} + 1` }).where(eq(posts.id, id));
        const postDetails = await db
            .select({
            post: posts,
            storeName: stores.name,
            author: {
                id: users.id,
                nickname: users.nickname,
                avatar: users.avatar
            }
        })
            .from(posts)
            .innerJoin(users, eq(posts.userId, users.id))
            .leftJoin(stores, eq(posts.storeId, stores.id))
            .where(eq(posts.id, id))
            .limit(1);
        if (postDetails.length === 0) {
            return c.json({ success: false, data: null, message: '帖子不存在' }, 404);
        }
        return c.json({ success: true, data: postDetails[0], message: '获取成功' });
    }
    catch (error) {
        return c.json({ success: false, data: null, message: '获取失败' }, 500);
    }
});
// 发布帖子
postRouter.post('/', authMiddleware, async (c) => {
    const user = c.get('user');
    const body = await c.req.json();
    const { title, content, images, category, storeId } = body;
    if (!title || !content || !category || !storeId) {
        return c.json({ success: false, data: null, message: '参数不完整，必须选择门店' }, 400);
    }
    const linkRegex = /(http[s]?:\/\/|www\.)|([a-zA-Z0-9\-\_]+\.(com|cn|net|org|io|me|cc|co))/i;
    if (linkRegex.test(title) || linkRegex.test(content)) {
        return c.json({ success: false, data: null, message: '内容中禁止包含链接' }, 400);
    }
    try {
        const newPost = await db.insert(posts).values({
            userId: user.id,
            storeId,
            title,
            content,
            images: JSON.stringify(images || []),
            category,
            status: 'pending' // 按照需求，新增需审核
        }).returning();
        return c.json({ success: true, data: newPost[0], message: '发布成功，等待审核' });
    }
    catch (error) {
        return c.json({ success: false, data: null, message: '发布失败' }, 500);
    }
});
// 修改帖子
postRouter.put('/:id', authMiddleware, async (c) => {
    const user = c.get('user');
    const id = parseInt(c.req.param('id') || '');
    const body = await c.req.json();
    const { title, content, images, category } = body;
    const linkRegex = /(http[s]?:\/\/|www\.)|([a-zA-Z0-9\-\_]+\.(com|cn|net|org|io|me|cc|co))/i;
    if (linkRegex.test(title) || linkRegex.test(content)) {
        return c.json({ success: false, data: null, message: '内容中禁止包含链接' }, 400);
    }
    try {
        const post = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
        if (post.length === 0 || post[0].userId !== user.id) {
            return c.json({ success: false, data: null, message: '无权操作或帖子不存在' }, 403);
        }
        // 根据 user 意见，修改后不需要重新审核
        const updateData = {
            title,
            content,
            images: JSON.stringify(images || []),
            category,
            updatedAt: new Date()
        };
        if (body.storeId)
            updateData.storeId = body.storeId;
        await db.update(posts).set(updateData).where(eq(posts.id, id));
        return c.json({ success: true, data: null, message: '修改成功' });
    }
    catch (error) {
        return c.json({ success: false, data: null, message: '修改失败' }, 500);
    }
});
// 删除帖子
postRouter.delete('/:id', authMiddleware, async (c) => {
    const user = c.get('user');
    const id = parseInt(c.req.param('id') || '');
    try {
        const post = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
        if (post.length === 0 || (post[0].userId !== user.id && user.role !== 'admin')) {
            return c.json({ success: false, data: null, message: '无权操作' }, 403);
        }
        // 手动级联删除关联数据，避免外键约束报错
        await db.delete(postLikes).where(eq(postLikes.postId, id));
        await db.delete(postCollections).where(eq(postCollections.postId, id));
        const postComments = await db.select({ id: comments.id }).from(comments).where(eq(comments.postId, id));
        for (const comment of postComments) {
            await db.delete(commentLikes).where(eq(commentLikes.commentId, comment.id));
        }
        await db.delete(comments).where(eq(comments.postId, id));
        await db.delete(posts).where(eq(posts.id, id));
        return c.json({ success: true, data: null, message: '删除成功' });
    }
    catch (error) {
        return c.json({ success: false, data: null, message: '删除失败' }, 500);
    }
});
// 点赞/取消点赞
postRouter.post('/:id/like', authMiddleware, async (c) => {
    const user = c.get('user');
    const id = parseInt(c.req.param('id') || '');
    try {
        const existingLike = await db.select().from(postLikes).where(and(eq(postLikes.userId, user.id), eq(postLikes.postId, id))).limit(1);
        if (existingLike.length > 0) {
            await db.delete(postLikes).where(eq(postLikes.id, existingLike[0].id));
            await db.update(posts).set({ likeCount: sql `${posts.likeCount} - 1` }).where(eq(posts.id, id));
            return c.json({ success: true, data: { liked: false }, message: '已取消点赞' });
        }
        else {
            await db.insert(postLikes).values({ userId: user.id, postId: id });
            await db.update(posts).set({ likeCount: sql `${posts.likeCount} + 1` }).where(eq(posts.id, id));
            return c.json({ success: true, data: { liked: true }, message: '点赞成功' });
        }
    }
    catch (error) {
        return c.json({ success: false, data: null, message: '操作失败' }, 500);
    }
});
// 收藏/取消收藏
postRouter.post('/:id/collect', authMiddleware, async (c) => {
    const user = c.get('user');
    const id = parseInt(c.req.param('id') || '');
    try {
        const existing = await db.select().from(postCollections).where(and(eq(postCollections.userId, user.id), eq(postCollections.postId, id))).limit(1);
        if (existing.length > 0) {
            await db.delete(postCollections).where(eq(postCollections.id, existing[0].id));
            return c.json({ success: true, data: { collected: false }, message: '已取消收藏' });
        }
        else {
            await db.insert(postCollections).values({ userId: user.id, postId: id });
            return c.json({ success: true, data: { collected: true }, message: '收藏成功' });
        }
    }
    catch (error) {
        return c.json({ success: false, data: null, message: '操作失败' }, 500);
    }
});
// 查询我是否点赞/收藏了某贴
postRouter.get('/:id/interaction', authMiddleware, async (c) => {
    const user = c.get('user');
    const id = parseInt(c.req.param('id') || '');
    try {
        const like = await db.select().from(postLikes).where(and(eq(postLikes.userId, user.id), eq(postLikes.postId, id))).limit(1);
        const collect = await db.select().from(postCollections).where(and(eq(postCollections.userId, user.id), eq(postCollections.postId, id))).limit(1);
        return c.json({ success: true, data: { liked: like.length > 0, collected: collect.length > 0 }, message: '获取成功' });
    }
    catch (error) {
        return c.json({ success: false, data: null, message: '获取失败' }, 500);
    }
});
// 举报帖子
postRouter.post('/:id/report', authMiddleware, async (c) => {
    const user = c.get('user');
    const id = parseInt(c.req.param('id') || '');
    const { reason, description } = await c.req.json();
    if (!reason) {
        return c.json({ success: false, data: null, message: '举报原因不能为空' }, 400);
    }
    try {
        const post = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
        if (post.length === 0) {
            return c.json({ success: false, data: null, message: '帖子不存在' }, 404);
        }
        await db.insert(reports).values({
            userId: user.id,
            targetType: 'post',
            targetId: id,
            reason,
            description
        });
        return c.json({ success: true, data: null, message: '举报成功' });
    }
    catch (error) {
        return c.json({ success: false, data: null, message: '举报失败' }, 500);
    }
});
