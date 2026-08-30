/**
 * 鉴权中间件。
 *
 * requireAuth          —— 认令牌，认不出就 401
 * requireRole          —— 角色闸
 * requirePatientAccess —— **行级权限**：查 patient_members，无授权即 403
 *
 * 第三个是多患者的核心。此前 PATIENT_ID 写死在 seed.ts:18，
 * 任何人拿到页面就能看全部数据；产品线下必须逐患者校验。
 */

import type { NextFunction, Request, Response } from 'express'
import { verifyToken, type TokenClaims } from './jwt.ts'
import { getDb } from '../db/index.ts'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: TokenClaims
      patientAccess?: string
    }
  }
}

function bearer(req: Request): string | null {
  const h = req.headers.authorization
  if (!h || !h.startsWith('Bearer ')) return null
  const t = h.slice(7).trim()
  return t.length > 0 ? t : null
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = bearer(req)
  if (!token) return res.status(401).json({ error: 'unauthorized', message: '未提供登录凭证' })

  const claims = await verifyToken(token)
  if (!claims) return res.status(401).json({ error: 'invalid_token', message: '登录已过期，请重新登录' })

  // 令牌有效不等于账号仍有效：可能已被停用或删除。每次都回库核一次。
  const row = getDb().prepare('SELECT id, status FROM users WHERE id = ?').get(claims.sub) as
    | { id: string; status: string } | undefined
  if (!row || row.status !== 'active') {
    return res.status(401).json({ error: 'account_inactive', message: '账号已停用' })
  }

  req.user = claims
  next()
}

export function requireRole(...roles: Array<TokenClaims['role']>) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'unauthorized' })
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'forbidden', message: '无此操作权限' })
    }
    next()
  }
}

/**
 * 行级权限。patientId 默认取 req.params.id。
 * admin 直通；其余必须在 patient_members 里有记录。
 */
export function requirePatientAccess(param = 'id') {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'unauthorized' })
    const patientId = req.params[param]
    if (!patientId) return res.status(400).json({ error: 'bad_request', message: '缺少患者标识' })

    if (req.user.role === 'admin') {
      req.patientAccess = 'owner'
      return next()
    }

    const row = getDb()
      .prepare('SELECT access FROM patient_members WHERE patient_id = ? AND user_id = ?')
      .get(patientId, req.user.sub) as { access: string } | undefined

    if (!row) {
      // 不区分「患者不存在」与「无权访问」—— 否则可以靠状态码枚举出系统里有哪些患者
      return res.status(403).json({ error: 'forbidden', message: '无权访问该患者数据' })
    }
    req.patientAccess = row.access
    next()
  }
}

/** 当前用户可见的患者 id 列表 */
export function visiblePatientIds(userId: string, role: TokenClaims['role']): string[] {
  const db = getDb()
  if (role === 'admin') {
    return (db.prepare('SELECT id FROM patients WHERE status = ?').all('active') as any[]).map((r) => r.id)
  }
  return (db.prepare('SELECT patient_id FROM patient_members WHERE user_id = ?').all(userId) as any[])
    .map((r) => r.patient_id)
}
