import { useEffect, useState, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { currentSession, verifySession, type Role } from '../auth/auth'

/**
 * 路由守卫。
 *
 * 先用本地登录态同步放行 —— 不做 loading 态，否则每次跳转都闪一下。
 * 令牌是否仍然有效（过期、账号被停用）在后台异步核，核不过再踢回登录页。
 * 这样做不牺牲安全：真正的边界在服务端每个接口上，前端放行也拿不到数据。
 */
export function RequireAuth({ role, loginPath, children }: { role: Role; loginPath: string; children: ReactNode }) {
  const session = currentSession()
  const [revoked, setRevoked] = useState(false)

  useEffect(() => {
    if (!session) return
    let alive = true
    void verifySession().then((ok) => {
      if (alive && !ok) setRevoked(true)
    })
    return () => { alive = false }
    // 只在会话身份变化时重核，不随每次渲染重复请求
  }, [session?.userId])

  if (!session || session.role !== role || revoked) return <Navigate to={loginPath} replace />
  return <>{children}</>
}
