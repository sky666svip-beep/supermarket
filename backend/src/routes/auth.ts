// 模块：用户认证与授权管理 (Auth API)
import { Hono } from 'hono'
import { db } from '../db/index.js'
import { users } from '../db/schema.js'
import { eq } from 'drizzle-orm'

export const auth = new Hono()

// 统一错误处理
const handleError = (c: any, error: any) => {
  console.error('[DB Error]', error)
  return c.json({ error: '服务器内部错误或数据库异常', details: error.message }, 500)
}

// 验证规则
const isValidUsername = (username: string) => {
  if (!username || typeof username !== 'string') return false
  const len = username.trim().length
  return len >= 3 && len <= 20
}

const isValidPassword = (password: string) => {
  if (!password || typeof password !== 'string') return false
  const hasLetter = /[a-zA-Z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  return password.length >= 6 && hasLetter && hasNumber
}

// 注册
auth.post('/register', async (c) => {
  try {
    const body = await c.req.json()
    const { username, password } = body
    
    if (!username || !password) {
      return c.json({ error: '参数不完整' }, 400)
    }
    
    const cleanUser = username.trim()
    
    if (!isValidUsername(cleanUser)) {
      return c.json({ error: '用户名必须是3到20个字符' }, 400)
    }
    if (!isValidPassword(password)) {
      return c.json({ error: '密码至少6位，且必须包含字母和数字' }, 400)
    }
    
    const existing = await db.select().from(users).where(eq(users.username, cleanUser))
    if (existing.length > 0) return c.json({ error: '用户已存在，请换一个用户名' }, 400)
    
    await db.insert(users).values({ 
      username: cleanUser, 
      password, 
      role: 'customer' 
    })
    return c.json({ success: true })
  } catch (err) {
    return handleError(c, err)
  }
})

// 登录
auth.post('/login', async (c) => {
  try {
    const body = await c.req.json()
    const { username, password } = body
    
    if (!username || !password) {
      return c.json({ error: '请提供完整的用户名和密码' }, 400)
    }
    
    const userList = await db.select().from(users).where(eq(users.username, username.trim()))
    if (userList.length === 0 || userList[0].password !== password) {
      return c.json({ error: '用户名或密码错误' }, 401)
    }
    
    const user = userList[0]
    return c.json({ 
      success: true, 
      user: { 
        id: user.id, 
        username: user.username, 
        nickname: user.nickname,
        avatar: user.avatar,
        role: user.role 
      } 
    })
  } catch (err) {
    return handleError(c, err)
  }
})

// 修改密码
auth.put('/password', async (c) => {
  try {
    const { userId, oldPassword, newPassword } = await c.req.json()
    if (!userId || !oldPassword || !newPassword) {
      return c.json({ error: '参数不完整' }, 400)
    }
    if (!isValidPassword(newPassword)) {
      return c.json({ error: '新密码至少6位，且必须包含字母和数字' }, 400)
    }
    
    const userList = await db.select().from(users).where(eq(users.id, userId))
    if (userList.length === 0 || userList[0].password !== oldPassword) {
      return c.json({ error: '原密码错误' }, 401)
    }
    
    await db.update(users).set({ password: newPassword }).where(eq(users.id, userId))
    return c.json({ success: true })
  } catch (err) {
    return handleError(c, err)
  }
})

// 修改个人资料
auth.put('/profile', async (c) => {
  try {
    const { userId, nickname, avatar } = await c.req.json()
    if (!userId) return c.json({ error: '缺少用户ID' }, 400)
    
    // 安全转义/清洗
    const cleanNickname = nickname ? nickname.trim().slice(0, 50).replace(/[<>]/g, '') : null
    const cleanAvatar = avatar ? avatar.trim().slice(0, 255).replace(/[<>]/g, '') : null
    
    await db.update(users).set({ 
      nickname: cleanNickname,
      avatar: cleanAvatar
    }).where(eq(users.id, userId))
    
    return c.json({ success: true, user: { nickname: cleanNickname, avatar: cleanAvatar } })
  } catch (err) {
    return handleError(c, err)
  }
})
