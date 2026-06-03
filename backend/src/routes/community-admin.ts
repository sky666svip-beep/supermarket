import { Hono } from 'hono'
import { db } from '../db/index.js'
import { posts, reports, users, comments, commentLikes, postLikes, postCollections } from '../db/schema.js'
import { eq, desc, sql, inArray, and } from 'drizzle-orm'
import { authMiddleware, AuthContext } from './auth.js'

export const communityAdminRouter = new Hono<AuthContext>()

// 需要验证admin权限
communityAdminRouter.use('*', authMiddleware, async (c, next) => {
  const user = c.get('user')
  if (user.role !== 'admin') {
    return c.json({ success: false, data: null, message: '权限不足' }, 403)
  }
  await next()
})

// 获取所有待审核或全部帖子
communityAdminRouter.get('/posts', async (c) => {
  const status = c.req.query('status')
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
      .from(posts)
      .innerJoin(users, eq(posts.userId, users.id))
      .where(status ? eq(posts.status, status as any) : undefined)
      .orderBy(desc(posts.createdAt))
      
    return c.json({ success: true, data: list, message: '获取成功' })
  } catch (error) {
    return c.json({ success: false, data: null, message: '获取失败' }, 500)
  }
})

// 审批帖子
communityAdminRouter.put('/posts/:id/status', async (c) => {
  const id = parseInt(c.req.param('id') || '')
  const { status } = await c.req.json()
  try {
    await db.update(posts).set({ status }).where(eq(posts.id, id))
    return c.json({ success: true, data: null, message: '更新状态成功' })
  } catch (error) {
    return c.json({ success: false, data: null, message: '操作失败' }, 500)
  }
})

// 置顶/加精
communityAdminRouter.put('/posts/:id/attributes', async (c) => {
  const id = parseInt(c.req.param('id') || '')
  const { isTop, isElite } = await c.req.json()
  try {
    const updateData: any = {}
    if (isTop !== undefined) updateData.isTop = isTop
    if (isElite !== undefined) updateData.isElite = isElite
    await db.update(posts).set(updateData).where(eq(posts.id, id))
    return c.json({ success: true, data: null, message: '更新属性成功' })
  } catch (error) {
    return c.json({ success: false, data: null, message: '操作失败' }, 500)
  }
})

// 获取举报列表
communityAdminRouter.get('/reports', async (c) => {
  try {
    const rawReports = await db.select().from(reports).orderBy(desc(reports.createdAt))
    
    const postIds = rawReports.filter(r => r.targetType === 'post').map(r => r.targetId)
    const commentIds = rawReports.filter(r => r.targetType === 'comment').map(r => r.targetId)
    
    const fetchedPosts = postIds.length > 0 ? await db.select().from(posts).where(inArray(posts.id, postIds)) : []
    const fetchedComments = commentIds.length > 0 ? await db.select().from(comments).where(inArray(comments.id, commentIds)) : []
    
    const postMap = new Map(fetchedPosts.map(p => [p.id, p]))
    const commentMap = new Map(fetchedComments.map(c => [c.id, c]))

    const result = rawReports.map(report => ({
      report,
      targetPost: report.targetType === 'post' ? (postMap.get(report.targetId) || null) : null,
      targetComment: report.targetType === 'comment' ? (commentMap.get(report.targetId) || null) : null
    }))

    return c.json({ success: true, data: result, message: '获取成功' })
  } catch (error) {
    console.error('Fetch reports error:', error)
    return c.json({ success: false, data: null, message: '获取失败' }, 500)
  }
})

// 处理举报
communityAdminRouter.put('/reports/:id/status', async (c) => {
  const id = parseInt(c.req.param('id') || '')
  const { status } = await c.req.json()
  try {
    const reportList = await db.select().from(reports).where(eq(reports.id, id)).limit(1)
    if (reportList.length === 0) {
      return c.json({ success: false, data: null, message: '举报不存在' }, 404)
    }
    const report = reportList[0]

    // 如果举报属实 (resolved)，隐藏/删除被举报的内容
    if (status === 'resolved') {
      db.transaction((tx) => {
        if (report.targetType === 'post') {
          // 直接删除违规帖子及关联数据
          const post = tx.select().from(posts).where(eq(posts.id, report.targetId)).limit(1).all()
          if (post.length > 0) {
            tx.delete(postLikes).where(eq(postLikes.postId, report.targetId)).run()
            tx.delete(postCollections).where(eq(postCollections.postId, report.targetId)).run()
            
            const postComments = tx.select({ id: comments.id }).from(comments).where(eq(comments.postId, report.targetId)).all()
            for (const comment of postComments) {
              tx.delete(commentLikes).where(eq(commentLikes.commentId, comment.id)).run()
            }
            tx.delete(comments).where(eq(comments.postId, report.targetId)).run()
            tx.delete(posts).where(eq(posts.id, report.targetId)).run()
            
            // 删除相关的举报记录 (避免脏数据)
            tx.delete(reports).where(and(eq(reports.targetType, 'post'), eq(reports.targetId, report.targetId))).run()
            if (postComments.length > 0) {
              const commentIds = postComments.map(c => c.id)
              tx.delete(reports).where(and(eq(reports.targetType, 'comment'), inArray(reports.targetId, commentIds))).run()
            }
          }
        } else if (report.targetType === 'comment') {
          // 级联删除子评论
          const childComments = tx.select().from(comments).where(eq(comments.parentId, report.targetId)).all()
          if (childComments.length > 0) {
            tx.delete(comments).where(eq(comments.parentId, report.targetId)).run()
          }
          
          const deleted = tx.delete(comments).where(eq(comments.id, report.targetId)).returning().all()
          if (deleted.length > 0) {
            tx.delete(commentLikes).where(eq(commentLikes.commentId, report.targetId)).run()
            const countToSubtract = 1 + childComments.length
            tx.update(posts)
              .set({ commentCount: sql`${posts.commentCount} - ${countToSubtract}` })
              .where(eq(posts.id, deleted[0].postId)).run()
              
            const allDeletedCommentIds = [report.targetId, ...childComments.map(c => c.id)]
            tx.delete(reports).where(and(eq(reports.targetType, 'comment'), inArray(reports.targetId, allDeletedCommentIds))).run()
          }
        }
      })
    } else {
      await db.update(reports).set({ status }).where(eq(reports.id, id))
    }
    return c.json({ success: true, data: null, message: '处理成功' })
  } catch (error) {
    console.error('Update report status error:', error)
    return c.json({ success: false, data: null, message: '操作失败' }, 500)
  }
})

// 删除举报记录
communityAdminRouter.delete('/reports/:id', async (c) => {
  const id = parseInt(c.req.param('id') || '')
  try {
    await db.delete(reports).where(eq(reports.id, id))
    return c.json({ success: true, data: null, message: '删除成功' })
  } catch (error) {
    return c.json({ success: false, data: null, message: '删除失败' }, 500)
  }
})
