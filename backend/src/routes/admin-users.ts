import { Hono } from 'hono'
import { db } from '../db/index.js'
import { users } from '../db/schema.js'
import { eq, like, or, count, desc } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { clearAuthCache } from './auth.js'

export const adminUsersRouter = new Hono()

// GET /api/admin/users
adminUsersRouter.get('/', async (c) => {
  try {
    const page = parseInt(c.req.query('page') || '1')
    const limit = parseInt(c.req.query('limit') || '10')
    const search = c.req.query('search') || ''
    const offset = (page - 1) * limit

    let queryConditions = undefined
    if (search) {
      queryConditions = or(
        like(users.username, `%${search}%`),
        like(users.nickname, `%${search}%`)
      )
    }

    const [totalCount] = await db
      .select({ count: count() })
      .from(users)
      .where(queryConditions)

    const list = await db
      .select({
        id: users.id,
        username: users.username,
        nickname: users.nickname,
        role: users.role,
        isBanned: users.isBanned,
        bannedUntil: users.bannedUntil,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(queryConditions)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset)

    return c.json({
      success: true,
      data: {
        list,
        total: totalCount.count,
        page,
        limit,
      }
    })
  } catch (error) {
    console.error('Fetch users error:', error)
    return c.json({ success: false, message: '获取用户列表失败' }, 500)
  }
})

// PUT /api/admin/users/:id
adminUsersRouter.put('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'))
    if (isNaN(id)) {
      return c.json({ success: false, message: '无效的用户 ID' }, 400)
    }
    const { username, password } = await c.req.json()

    if (!username) {
      return c.json({ success: false, message: '用户名不能为空' }, 400)
    }

    const updates: any = { username }

    if (password) {
      const salt = await bcrypt.genSalt(10)
      updates.password = await bcrypt.hash(password, salt)
    }

    await db.update(users).set(updates).where(eq(users.id, id))
    clearAuthCache(id)

    return c.json({ success: true, message: '更新成功' })
  } catch (error: any) {
    if (error?.message?.includes('UNIQUE')) {
      return c.json({ success: false, message: '用户名已被使用' }, 400)
    }
    console.error('Update user error:', error)
    return c.json({ success: false, message: '更新失败' }, 500)
  }
})

// POST /api/admin/users/:id/ban
adminUsersRouter.post('/:id/ban', async (c) => {
  try {
    const id = parseInt(c.req.param('id'))
    if (isNaN(id)) return c.json({ success: false, message: '无效的ID' }, 400)
    
    const body = await c.req.json()
    // Coerce isBanned to a strict boolean, tolerating strings like "true"
    const isBanned = typeof body.isBanned === 'string' ? body.isBanned === 'true' : Boolean(body.isBanned)
    
    let bannedUntil = null
    if (isBanned) {
      if (body.durationDays && typeof body.durationDays === 'number') {
        bannedUntil = new Date(Date.now() + body.durationDays * 24 * 60 * 60 * 1000)
      }
    }
    
    await db.update(users).set({ isBanned, bannedUntil }).where(eq(users.id, id))
    clearAuthCache(id)
    
    return c.json({ success: true, message: isBanned ? '已封禁' : '已解封' })
  } catch (error) {
    console.error('Ban user error:', error)
    return c.json({ success: false, message: '操作失败' }, 500)
  }
})

// DELETE /api/admin/users/:id
adminUsersRouter.delete('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'))
    if (isNaN(id)) return c.json({ success: false, message: '无效的ID' }, 400)
    
    // Physical delete (Cascade delete is handled by DB). 
    // Idempotent delete: returns 200 OK even if the user didn't exist.
    await db.delete(users).where(eq(users.id, id))
    clearAuthCache(id)
    
    return c.json({ success: true, message: '删除成功' })
  } catch (error) {
    console.error('Delete user error:', error)
    return c.json({ success: false, message: '删除失败，可能存在未级联的数据约束' }, 500)
  }
})
