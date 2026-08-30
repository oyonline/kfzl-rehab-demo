/**
 * 认证路由。登录仅账号密码 —— 无验证码、无扫码、无第三方授权（v0.2 §3 硬约束）。
 */

import { Router } from 'express'
import { getDb } from '../db/index.ts'
import { verifyPassword } from '../auth/password.ts'
import { signToken } from '../auth/jwt.ts'
import { requireAuth, visiblePatientIds } from '../auth/middleware.ts'
import { randomUUID } from 'crypto'

export const authRouter = Router()

function audit(userId: string | null, action: string, detail: Record<string, unknown>, ip?: string) {
  getDb().prepare(
    `INSERT INTO audit_log (id, user_id, action, entity, entity_id, detail, ip, at)
     VALUES (?,?,?,'auth',?,?,?,?)`,
  ).run(randomUUID(), userId, action, userId, JSON.stringify(detail), ip ?? null, new Date().toISOString())
}

authRouter.post('/login', async (req, res) => {
  const { username, password, role } = req.body ?? {}
  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'bad_request', message: '账号与密码不能为空' })
  }

  const u = getDb()
    .prepare('SELECT * FROM users WHERE username = ?')
    .get(username.trim()) as any

  // 账号不存在与密码错误返回同一条消息，不泄露哪个账号存在。
  // 但仍要跑一次哈希，避免用响应时间区分出账号是否存在。
  const ok = u
    ? verifyPassword(password, u.password_hash, u.password_salt)
    : (verifyPassword(password, '00'.repeat(64), 'dummy'), false)

  if (!u || !ok) {
    audit(u?.id ?? null, 'login_failed', { username }, req.ip)
    return res.status(401).json({ error: 'invalid_credentials', message: '账号或密码不正确' })
  }
  if (u.status !== 'active') {
    audit(u.id, 'login_blocked', { reason: 'inactive' }, req.ip)
    return res.status(403).json({ error: 'account_inactive', message: '账号已停用' })
  }
  // 登录页按角色分入口，选错入口不放行 —— 家属不能从康复师入口进
  if (role && u.role !== role) {
    audit(u.id, 'login_wrong_portal', { expected: role, actual: u.role }, req.ip)
    return res.status(401).json({ error: 'invalid_credentials', message: '账号或密码不正确' })
  }

  const token = await signToken({
    sub: u.id, username: u.username, role: u.role, displayName: u.display_name,
  })
  audit(u.id, 'login', { role: u.role }, req.ip)

  res.json({
    token,
    user: {
      id: u.id, username: u.username, role: u.role,
      displayName: u.display_name, title: u.title ?? undefined,
    },
  })
})

/**
 * 登出。JWT 无状态，服务端不持有会话，真正的失效是前端丢弃令牌。
 * 本端点只写审计 —— 不假装做了吊销。
 */
authRouter.post('/logout', requireAuth, (req, res) => {
  audit(req.user!.sub, 'logout', {}, req.ip)
  res.json({ ok: true })
})

/** 令牌自检 + 带出可见患者范围，前端启动时后台调用 */
authRouter.get('/me', requireAuth, (req, res) => {
  const u = getDb().prepare(
    'SELECT id, username, role, display_name, title FROM users WHERE id = ?',
  ).get(req.user!.sub) as any
  res.json({
    user: {
      id: u.id, username: u.username, role: u.role,
      displayName: u.display_name, title: u.title ?? undefined,
    },
    patientIds: visiblePatientIds(u.id, u.role),
  })
})
