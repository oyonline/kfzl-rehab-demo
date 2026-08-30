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

/** 8 小时：够覆盖一整天的演示或工作，又不会长到令牌泄露后长期有效 */
export const TOKEN_TTL = '8h'

/**
 * 密钥来源：环境变量优先；否则生成并落盘到第一个可写目录；全不可写退回内存。
 *
 * 落盘而非每次启动随机生成 —— 否则服务端一重启（tsx 改代码就重启），
 * 所有已登录的标签页令牌全部失效，开发时每改一次代码就要重登两端。
 *
 * 候选目录按环境排优先级：
 * - DB_PATH 所在目录：部署管线下发的可写数据目录（FaaS 沙箱里项目目录只读，
 *   写项目内路径会以 ENOENT 崩掉进程 —— 实测踩过）；
 * - 项目 data/：本地开发，密钥持久、重启不掉登录态；
 * - /tmp：FaaS 沙箱的标准可写目录。
 * 密钥不进仓（相关目录均在 .gitignore）。
 */
function loadSecret(): Uint8Array {
  const fromEnv = process.env.JWT_SECRET
  if (fromEnv && fromEnv.length >= 32) return new TextEncoder().encode(fromEnv)

  const candidates = [
    process.env.DB_PATH ? dirname(process.env.DB_PATH) : null,
    join(PROJECT_ROOT, 'data'),
    '/tmp',
  ].filter((d): d is string => Boolean(d))

  for (const dir of candidates) {
    try {
      mkdirSync(dir, { recursive: true })
      const secretPath = join(dir, '.jwt-secret')
      if (!existsSync(secretPath)) {
        writeFileSync(secretPath, randomBytes(48).toString('hex'), { mode: 0o600 })
      } else {
        // 修正历史上可能过宽的权限
        try { chmodSync(secretPath, 0o600) } catch { /* 文件系统不支持时忽略 */ }
      }
      return new TextEncoder().encode(readFileSync(secretPath, 'utf8').trim())
    } catch { /* 该目录不可写，试下一个 */ }
  }

  // 全部不可写：内存密钥。重启后已签发令牌失效（需重新登录），
  // 演示可接受；设 JWT_SECRET 环境变量可彻底避免。
  return new TextEncoder().encode(randomBytes(48).toString('hex'))
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
