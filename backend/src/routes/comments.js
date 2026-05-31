import { Hono } from 'hono';
import { db } from '../db/index.js';
import { comments, commentLikes, users, posts } from '../db/schema.js';
import { eq, desc, and, sql } from 'drizzle-orm';
import { authMiddleware } from './auth.js';
export const commentRouter = new Hono();
// 获取帖子的评论
commentRouter.get('/post/:postId', async (c) => {
    const postId = parseInt(c.req.param('postId') || '');
    try {
        const list = await db
            .select({
            comment: comments,
            author: {
                id: users.id,
                nickname: users.nickname,
                avatar: users.avatar
            }
        })
            .from(comments)
            .innerJoin(users, eq(comments.userId, users.id))
            .where(eq(comments.postId, postId))
            .orderBy(desc(comments.createdAt));
        // 在前端处理树形结构或者后端处理，这里后端直接平铺返回，前端或后端皆可。
        // 为了简单起见，可以先平铺，通过 parentId 在前端组合
        return c.json({ success: true, data: list, message: '获取成功' });
    }
    catch (error) {
        console.error(error);
        return c.json({ success: false, data: null, message: '获取失败' }, 500);
    }
});
// 我收到的评论回复
commentRouter.get('/my/received', authMiddleware, async (c) => {
    const user = c.get('user');
    try {
        // 获取别人对我发帖的评论，或者对我评论的回复
        // 简单实现：我发的帖子收到的评论
        const myPosts = await db.select({ id: posts.id }).from(posts).where(eq(posts.userId, user.id));
        const postIds = myPosts.map(p => p.id);
        if (postIds.length === 0)
            return c.json({ success: true, data: [], message: '获取成功' });
        // 待优化：使用 inArray，并且包含别人回复我的评论 (parentId)
        const list = await db
            .select({
            comment: comments,
            author: {
                id: users.id,
                nickname: users.nickname,
                avatar: users.avatar
            },
            post: {
                id: posts.id,
                title: posts.title
            }
        })
            .from(comments)
            .innerJoin(users, eq(comments.userId, users.id))
            .innerJoin(posts, eq(comments.postId, posts.id));
        // .where(inArray(comments.postId, postIds)) // simplified
        // 这里因为 sql 问题，自己实现一个简单的过滤
        const result = list.filter(item => postIds.includes(item.post.id) && item.comment.userId !== user.id);
        return c.json({ success: true, data: result, message: '获取成功' });
    }
    catch (error) {
        return c.json({ success: false, data: null, message: '获取失败' }, 500);
    }
});
// 发布评论
commentRouter.post('/', authMiddleware, async (c) => {
    const user = c.get('user');
    const body = await c.req.json();
    const { postId, parentId, content, images } = body;
    if (!postId || !content) {
        return c.json({ success: false, data: null, message: '参数不完整' }, 400);
    }
    try {
        const newComment = await db.insert(comments).values({
            userId: user.id,
            postId,
            parentId: parentId || null,
            content,
            images: JSON.stringify(images || [])
        }).returning();
        // 帖子评论数+1
        await db.update(posts).set({ commentCount: sql `${posts.commentCount} + 1` }).where(eq(posts.id, postId));
        return c.json({ success: true, data: newComment[0], message: '评论成功' });
    }
    catch (error) {
        return c.json({ success: false, data: null, message: '评论失败' }, 500);
    }
});
// 删除评论
commentRouter.delete('/:id', authMiddleware, async (c) => {
    const user = c.get('user');
    const id = parseInt(c.req.param('id') || '');
    try {
        const comment = await db.select().from(comments).where(eq(comments.id, id)).limit(1);
        if (comment.length === 0 || (comment[0].userId !== user.id && user.role !== 'admin')) {
            return c.json({ success: false, data: null, message: '无权操作' }, 403);
        }
        await db.delete(comments).where(eq(comments.id, id));
        // 评论数-1
        await db.update(posts).set({ commentCount: sql `${posts.commentCount} - 1` }).where(eq(posts.id, comment[0].postId));
        return c.json({ success: true, data: null, message: '删除成功' });
    }
    catch (error) {
        return c.json({ success: false, data: null, message: '删除失败' }, 500);
    }
});
// 评论点赞
commentRouter.post('/:id/like', authMiddleware, async (c) => {
    const user = c.get('user');
    const id = parseInt(c.req.param('id') || '');
    try {
        const existingLike = await db.select().from(commentLikes).where(and(eq(commentLikes.userId, user.id), eq(commentLikes.commentId, id))).limit(1);
        if (existingLike.length > 0) {
            await db.delete(commentLikes).where(eq(commentLikes.id, existingLike[0].id));
            await db.update(comments).set({ likeCount: sql `${comments.likeCount} - 1` }).where(eq(comments.id, id));
            return c.json({ success: true, data: { liked: false }, message: '已取消点赞' });
        }
        else {
            await db.insert(commentLikes).values({ userId: user.id, commentId: id });
            await db.update(comments).set({ likeCount: sql `${comments.likeCount} + 1` }).where(eq(comments.id, id));
            return c.json({ success: true, data: { liked: true }, message: '点赞成功' });
        }
    }
    catch (error) {
        return c.json({ success: false, data: null, message: '操作失败' }, 500);
    }
});
