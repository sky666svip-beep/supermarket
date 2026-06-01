// 模块：用户认证与授权管理 (Auth API)
import { Hono } from 'hono';
import { db } from '../db/index.js';
import { users, verificationCodes } from '../db/schema.js';
import { eq, and, gte, desc, or, ne } from 'drizzle-orm';
import nodemailer from 'nodemailer';
import bcrypt from 'bcryptjs';
export const auth = new Hono();
const transporter = nodemailer.createTransport({
    host: 'smtp.qq.com',
    port: 465,
    secure: true,
    auth: {
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PASSWORD
    }
});
// 统一错误处理
const handleError = (c, error) => {
    console.error('[DB Error]', error);
    return c.json({ error: '服务器内部错误或数据库异常', details: error.message }, 500);
};
// 验证规则
const isValidUsername = (username) => {
    if (!username || typeof username !== 'string')
        return false;
    const len = username.trim().length;
    return len >= 3 && len <= 20;
};
const isValidNickname = (nickname) => {
    if (!nickname || typeof nickname !== 'string')
        return false;
    const len = nickname.trim().length;
    return len >= 3 && len <= 10;
};
const isValidPassword = (password) => {
    if (!password || typeof password !== 'string')
        return false;
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    return password.length >= 6 && hasLetter && hasNumber;
};
const checkVerificationCode = async (email, code, type) => {
    const codes = await db.select().from(verificationCodes)
        .where(and(eq(verificationCodes.email, email.trim()), eq(verificationCodes.code, code.trim()), eq(verificationCodes.type, type), gte(verificationCodes.expiresAt, new Date())))
        .orderBy(desc(verificationCodes.createdAt))
        .limit(1);
    return codes.length > 0;
};
// 发送验证码
auth.post('/send-code', async (c) => {
    try {
        const { email, type } = await c.req.json();
        if (!email || !type)
            return c.json({ error: '参数不完整' }, 400);
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
        await db.insert(verificationCodes).values({
            email: email.trim(),
            code,
            type,
            expiresAt
        });
        let actionName = '操作';
        if (type === 'register')
            actionName = '注册';
        else if (type === 'forgot_password')
            actionName = '找回密码';
        else if (type === 'bind_email')
            actionName = '绑定邮箱';
        await transporter.sendMail({
            from: `"Supermarket" <${process.env.MAIL_USERNAME}>`,
            to: email.trim(),
            subject: `${actionName}验证码`,
            text: `您的${actionName}验证码是 ${code}，5分钟内有效。`
        });
        return c.json({ success: true });
    }
    catch (err) {
        return handleError(c, err);
    }
});
// 注册
auth.post('/register', async (c) => {
    try {
        const body = await c.req.json();
        const { username, password, email, code } = body;
        if (!username || !password) {
            return c.json({ error: '参数不完整' }, 400);
        }
        const cleanUser = username.trim();
        if (!isValidUsername(cleanUser)) {
            return c.json({ error: '用户名必须是3到20个字符' }, 400);
        }
        if (!isValidPassword(password)) {
            return c.json({ error: '密码至少6位，且必须包含字母和数字' }, 400);
        }
        if (email) {
            if (!code)
                return c.json({ error: '请填写邮箱验证码' }, 400);
            const isValid = await checkVerificationCode(email, code, 'register');
            if (!isValid)
                return c.json({ error: '验证码无效或已过期' }, 400);
        }
        const existing = await db.select().from(users).where(eq(users.username, cleanUser));
        if (existing.length > 0)
            return c.json({ error: '用户已存在，请换一个用户名' }, 400);
        await db.insert(users).values({
            username: cleanUser,
            password: bcrypt.hashSync(password, 10),
            email: email ? email.trim() : null,
            role: 'customer'
        });
        return c.json({ success: true });
    }
    catch (err) {
        return handleError(c, err);
    }
});
// 登录
auth.post('/login', async (c) => {
    try {
        const body = await c.req.json();
        const { username, password } = body;
        if (!username || !password) {
            return c.json({ error: '请提供完整的用户名和密码' }, 400);
        }
        const userList = await db.select().from(users).where(eq(users.username, username.trim()));
        if (userList.length === 0 || !bcrypt.compareSync(password, userList[0].password)) {
            return c.json({ error: '用户名或密码错误' }, 401);
        }
        const user = userList[0];
        return c.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                nickname: user.nickname,
                avatar: user.avatar,
                role: user.role
            }
        });
    }
    catch (err) {
        return handleError(c, err);
    }
});
// 修改密码
auth.put('/password', async (c) => {
    try {
        const { userId, oldPassword, newPassword } = await c.req.json();
        if (!userId || !oldPassword || !newPassword) {
            return c.json({ error: '参数不完整' }, 400);
        }
        if (!isValidPassword(newPassword)) {
            return c.json({ error: '新密码至少6位，且必须包含字母和数字' }, 400);
        }
        const userList = await db.select().from(users).where(eq(users.id, userId));
        if (userList.length === 0 || !bcrypt.compareSync(oldPassword, userList[0].password)) {
            return c.json({ error: '原密码错误' }, 401);
        }
        await db.update(users).set({ password: bcrypt.hashSync(newPassword, 10) }).where(eq(users.id, userId));
        return c.json({ success: true });
    }
    catch (err) {
        return handleError(c, err);
    }
});
// 修改个人资料
auth.put('/profile', async (c) => {
    try {
        const { userId, nickname, avatar } = await c.req.json();
        if (!userId)
            return c.json({ error: '缺少用户ID' }, 400);
        // 安全转义/清洗
        const cleanNickname = nickname ? nickname.trim().slice(0, 50).replace(/[<>]/g, '') : null;
        const cleanAvatar = avatar ? avatar.trim().slice(0, 255).replace(/[<>]/g, '') : null;
        const updateData = { avatar: cleanAvatar };
        if (cleanNickname) {
            if (!isValidNickname(cleanNickname)) {
                return c.json({ error: '昵称必须是3到10个字符' }, 400);
            }
            const userList = await db.select().from(users).where(eq(users.id, userId));
            if (userList.length === 0)
                return c.json({ error: '用户不存在' }, 404);
            const user = userList[0];
            if (user.nickname !== cleanNickname) {
                if (user.nicknameUpdatedAt && (Date.now() - user.nicknameUpdatedAt.getTime() < 7 * 24 * 60 * 60 * 1000)) {
                    return c.json({ error: '一个星期只能修改一次昵称' }, 400);
                }
                // 校验唯一性
                const existingNick = await db.select().from(users).where(and(ne(users.id, userId), or(eq(users.nickname, cleanNickname), eq(users.username, cleanNickname))));
                if (existingNick.length > 0) {
                    return c.json({ error: '该昵称太受欢迎啦，换一个试试吧' }, 400);
                }
                updateData.nickname = cleanNickname;
                updateData.nicknameUpdatedAt = new Date();
            }
        }
        await db.update(users).set(updateData).where(eq(users.id, userId));
        return c.json({ success: true, user: { nickname: cleanNickname, avatar: cleanAvatar } });
    }
    catch (err) {
        return handleError(c, err);
    }
});
// 绑定邮箱
auth.put('/email', async (c) => {
    try {
        const { userId, email, code } = await c.req.json();
        if (!userId || !email || !code)
            return c.json({ error: '参数不完整' }, 400);
        const isValid = await checkVerificationCode(email, code, 'bind_email');
        if (!isValid)
            return c.json({ error: '验证码无效或已过期' }, 400);
        const existing = await db.select().from(users).where(eq(users.email, email.trim()));
        if (existing.length > 0)
            return c.json({ error: '该邮箱已被其他账号绑定' }, 400);
        await db.update(users).set({ email: email.trim() }).where(eq(users.id, userId));
        return c.json({ success: true });
    }
    catch (err) {
        return handleError(c, err);
    }
});
// 找回密码
auth.post('/forgot-password', async (c) => {
    try {
        const { username, email, newPassword, code } = await c.req.json();
        if (!username || !email || !newPassword || !code)
            return c.json({ error: '参数不完整' }, 400);
        const userList = await db.select().from(users).where(eq(users.username, username.trim()));
        if (userList.length === 0)
            return c.json({ error: '用户不存在' }, 404);
        const user = userList[0];
        if (!user.email || user.email !== email.trim())
            return c.json({ error: '注册邮箱不匹配或未绑定' }, 400);
        const isValid = await checkVerificationCode(email, code, 'forgot_password');
        if (!isValid)
            return c.json({ error: '验证码无效或已过期' }, 400);
        if (!isValidPassword(newPassword)) {
            return c.json({ error: '新密码至少6位，且必须包含字母和数字' }, 400);
        }
        await db.update(users).set({ password: bcrypt.hashSync(newPassword, 10) }).where(eq(users.id, user.id));
        return c.json({ success: true });
    }
    catch (err) {
        return handleError(c, err);
    }
});
export const authMiddleware = async (c, next) => {
    const userIdStr = c.req.header('x-user-id');
    if (!userIdStr) {
        return c.json({ success: false, data: null, message: '未登录' }, 401);
    }
    const userId = parseInt(userIdStr);
    if (isNaN(userId)) {
        return c.json({ success: false, data: null, message: '无效的用户ID' }, 401);
    }
    const userList = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (userList.length === 0) {
        return c.json({ success: false, data: null, message: '用户不存在' }, 401);
    }
    c.set('user', userList[0]);
    await next();
};
