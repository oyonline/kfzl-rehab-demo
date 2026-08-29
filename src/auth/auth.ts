/**
 * 登录 —— 现场硬约束：只能账号密码，禁微信登录、手机验证码、扫码（v0.2 §3）。
 * 演示用固定账号，无注册、无找回、无验证码。
 */

export type Role = 'family' | 'therapist'

interface Account {
  username: string
  password: string
  role: Role
  displayName: string
}

const ACCOUNTS: Account[] = [
  // 甲方资料里家属只称「陈女士（女儿）」、康复师只称「小婷」，未给全名，
  // 因此账号名也只用姓／昵称，不替他们编造名字。
  { username: 'chen', password: '123456', role: 'family', displayName: '陈女士（女儿）' },
  { username: 'xiaoting', password: '123456', role: 'therapist', displayName: '小婷' },
]

const KEY = 'kfzl.session.v1'

/**
 * 登录态用 sessionStorage（按标签页隔离），不用 localStorage。
 *
 * 原因：演示要左右两窗并排——左边家属端、右边康复师端。
 * 若登录态存 localStorage（同源共享），后登录的一端会顶掉另一端的会话，
 * 两个角色无法同时在线，并排演示直接不成立。
 * 演示数据仍走 localStorage 共享，这是联动闭环的基础（见 store.ts）。
 */

export interface Session {
  role: Role
  username: string
  displayName: string
}

export function signIn(username: string, password: string, expectRole: Role): Session | null {
  const hit = ACCOUNTS.find(
    (a) => a.username === username.trim() && a.password === password && a.role === expectRole,
  )
  if (!hit) return null
  const session: Session = { role: hit.role, username: hit.username, displayName: hit.displayName }
  try {
    sessionStorage.setItem(KEY, JSON.stringify(session))
  } catch {
    // 存储不可用时退化为单页会话
  }
  return session
}

export function currentSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    return null
  }
}

export function signOut() {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}

export const DEMO_CREDENTIALS = {
  family: { username: 'chen', password: '123456' },
  therapist: { username: 'xiaoting', password: '123456' },
}
