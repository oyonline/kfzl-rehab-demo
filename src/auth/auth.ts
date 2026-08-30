/**
 * 登录 —— 现场硬约束：只能账号密码，禁微信登录、手机验证码、扫码（v0.2 §3）。
 *
 * 2026-08-30（P2）起改为**服务端真实鉴权**：账号不再写在前端，
 * 密码在服务端以 scrypt 哈希比对，登录成功后签发 JWT。
 *
 * 令牌存 sessionStorage、经 Authorization: Bearer 头回传 —— **不得改用 Cookie**。
 * Cookie 天然同源共享，一旦采用，家属端与康复师端并排开两个窗口时会互相顶掉会话，
 * 两个角色无法同时在线，并排演示当场失效（v0.2 §5.5，实测踩过）。
 * sessionStorage 按标签页隔离，左右两窗可各登各的。
 *
 * currentSession() 保持**同步**：路由守卫与两个 Shell 都在渲染期调用它，
 * 改成异步会让每次跳转闪一下加载态。它读的是本地缓存的登录态，
 * 真正的安全边界在服务端每个接口的 requireAuth / requirePatientAccess 上，
 * 不在这一层 —— 前端改这里的值也拿不到任何数据。
 */

export type Role = 'family' | 'therapist'

export interface Session {
  role: Role
  username: string
  displayName: string
  userId: string
  title?: string
}

interface Stored extends Session {
  token: string
}

const KEY = 'kfzl.session.v1'

function read(): Stored | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const s = JSON.parse(raw) as Stored
    // 没有 token 的是 P2 之前的旧会话，一律当未登录，避免半截状态
    return s?.token ? s : null
  } catch {
    return null
  }
}

export function currentSession(): Session | null {
  const s = read()
  if (!s) return null
  const { token: _token, ...session } = s
  return session
}

export function getToken(): string | null {
  return read()?.token ?? null
}

/** 登录失败返回 null（保持原契约），网络异常另抛，供页面区分提示 */
export async function signIn(username: string, password: string, expectRole: Role): Promise<Session | null> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: username.trim(), password, role: expectRole }),
  })

  if (res.status === 401 || res.status === 403) return null
  if (!res.ok) throw new Error(`登录服务异常（${res.status}）`)

  const { token, user } = await res.json()
  const stored: Stored = {
    token,
    userId: user.id,
    username: user.username,
    role: user.role,
    displayName: user.displayName,
    title: user.title,
  }
  try {
    sessionStorage.setItem(KEY, JSON.stringify(stored))
  } catch {
    // 存储不可用时退化为单页会话：本次导航内仍可用，刷新即失效
  }
  const { token: _t, ...session } = stored
  return session
}

export function signOut() {
  const token = getToken()
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    // ignore
  }
  // 只为留审计记录，不阻塞跳转 —— JWT 无状态，真正的失效是上面这行丢弃令牌
  if (token) {
    void fetch('/api/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {})
  }
}

/**
 * 带令牌的 fetch。401 时清掉本地登录态并抛出，
 * 让调用方跳回登录页 —— 否则会停在一个所有请求都失败的空页面上。
 */
export async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const token = getToken()
  const headers = new Headers(init.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const res = await fetch(input, { ...init, headers })
  if (res.status === 401) {
    try { sessionStorage.removeItem(KEY) } catch { /* ignore */ }
    throw new SessionExpiredError()
  }
  return res
}

export class SessionExpiredError extends Error {
  constructor() {
    super('登录已过期')
    this.name = 'SessionExpiredError'
  }
}

/**
 * 后台自检令牌是否仍然有效（可能已过期，或账号被停用）。
 * 有效返回 true；无效时已清掉本地登录态，返回 false。
 * 网络不通返回 true —— 不能因为一次网络抖动就把人踢出去。
 */
export async function verifySession(): Promise<boolean> {
  if (!getToken()) return false
  try {
    await authFetch('/api/auth/me')
    return true
  } catch (e) {
    if (e instanceof SessionExpiredError) return false
    return true
  }
}
