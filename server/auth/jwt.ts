/**
 * JWT 签发与校验（HS256）。
 *
 * 令牌由前端存 sessionStorage、经 Authorization: Bearer 头回传 —— **不用 Cookie**。
 * Cookie 天然同源共享，一旦采用，家属端与康复师端并排开两个窗口时会互相顶掉会话，
 * 违反 v0.2 §5.5（实测踩过）。Bearer + sessionStorage 才能既由服务端真实签发校验，
 * 又保持按标签页隔离。见 docs/后端与知识库方案.md §3.1。
 */

import { SignJWT, jwtVerify } from 'jose'
import { randomBytes } from 'crypto'
import { existsSync, readFileSync, writeFileSync, mkdirSync, chmodSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = join(__dirname, '..', '..')
const SECRET_PATH = join(PROJECT_ROOT, 'data', '.jwt-secret')

/** 8 小时：够覆盖一整天的演示或工作，又不会长到令牌泄露后长期有效 */
export const TOKEN_TTL = '8h'

/**
 * 密钥来源：环境变量优先；否则读本地文件；都没有则生成并落盘。
 *
 * 落盘而非每次启动随机生成 —— 否则服务端一重启（tsx 改代码就重启），
 * 所有已登录的标签页令牌全部失效，开发时每改一次代码就要重登两端。
 * data/ 已在 .gitignore 里，密钥不会进仓。
 */
function loadSecret(): Uint8Array {
  const fromEnv = process.env.JWT_SECRET
  if (fromEnv && fromEnv.length >= 32) return new TextEncoder().encode(fromEnv)

  mkdirSync(dirname(SECRET_PATH), { recursive: true })
  if (!existsSync(SECRET_PATH)) {
    writeFileSync(SECRET_PATH, randomBytes(48).toString('hex'), { mode: 0o600 })
  } else {
    // 修正历史上可能过宽的权限
    try { chmodSync(SECRET_PATH, 0o600) } catch { /* 文件系统不支持时忽略 */ }
  }
  return new TextEncoder().encode(readFileSync(SECRET_PATH, 'utf8').trim())
}

const SECRET = loadSecret()

/**
 * 刻意不继承 jose 的 JWTPayload：它带 `[k: string]: unknown` 索引签名，
 * 一旦继承，`Omit<TokenClaims, 'iat'|'exp'>` 会把 sub 也退化成 unknown，
 * signToken 的入参就失去类型保护。这里自己写全字段。
 */
export interface TokenClaims {
  sub: string           // user id
  username: string
  role: 'family' | 'therapist' | 'admin'
  displayName: string
  iat?: number
  exp?: number
}

export async function signToken(c: Omit<TokenClaims, 'iat' | 'exp'>): Promise<string> {
  return new SignJWT({ username: c.username, role: c.role, displayName: c.displayName })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(c.sub)
    .setIssuedAt()
    .setIssuer('kfzl')
    .setExpirationTime(TOKEN_TTL)
    .sign(SECRET)
}

/** 校验失败一律返回 null，不抛 —— 调用方只需判空 */
export async function verifyToken(token: string): Promise<TokenClaims | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET, { issuer: 'kfzl' })
    if (typeof payload.sub !== 'string') return null
    return payload as unknown as TokenClaims
  } catch {
    return null
  }
}
