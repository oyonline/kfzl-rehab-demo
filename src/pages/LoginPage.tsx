import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { signIn, type Role } from '../auth/auth'
import { IconLeaf } from '../components/Icons'
import '../styles/app.css'

interface Props {
  role: Role
  title: string
  subtitle: string
  home: string
  /** 页脚提示语，按角色不同；账号与入口地址不上屏，见 README */
  hint: string
  skin: 'warm' | 'cool'
}

/**
 * 排练便利：只在开发模式预填表单。
 *
 * P2 起密码校验在服务端，前端不再持有任何凭据。这里的常量被
 * `import.meta.env.DEV` 包住，Vite 生产构建会整块摇掉 ——
 * `pnpm build` 的产物里不含账号密码，`pnpm dev` 仍然免手输。
 */
const DEV_PREFILL: Record<Role, { username: string; password: string }> = {
  family: { username: 'chen', password: '123456' },
  therapist: { username: 'xiaoting', password: '123456' },
}

/** 账号 + 密码登录，无验证码、无扫码、无第三方授权 */
export function LoginPage({ role, title, subtitle, home, hint, skin }: Props) {
  const nav = useNavigate()
  const pre = import.meta.env.DEV ? DEV_PREFILL[role] : { username: '', password: '' }
  const [username, setUsername] = useState(pre.username)
  const [password, setPassword] = useState(pre.password)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    setError('')
    setBusy(true)
    try {
      const session = await signIn(username, password, role)
      if (!session) {
        setError('账号或密码不正确')
        return
      }
      nav(home, { replace: true })
    } catch {
      // 与「密码错」区分开：这是服务没起来或网络断了，让人知道该去查什么
      setError('无法连接登录服务，请确认服务端已启动')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="app" data-skin={skin} style={{ display: 'grid', placeItems: 'center', padding: 24 }}>
      <div style={{ width: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 26 }}>
          <span className="brand-mark" style={{ width: 46, height: 46, borderRadius: 15, margin: '0 auto 14px' }}>
            <IconLeaf size={23} />
          </span>
          <h1 style={{ fontSize: 'var(--t-xl)', fontWeight: 640, letterSpacing: '.02em' }}>{title}</h1>
          <p style={{ color: 'var(--ink-3)', fontSize: 'var(--t-sm)', marginTop: 5 }}>{subtitle}</p>
        </div>

        <div className="card" style={{ padding: '30px 32px 26px' }}>
          <form onSubmit={onSubmit}>
            <label className="field">
              <span>账号</span>
              <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" disabled={busy} />
            </label>
            <label className="field">
              <span>密码</span>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" disabled={busy} />
            </label>
            {error && <p style={{ color: 'var(--miss)', fontSize: 'var(--t-sm)', marginBottom: 14 }}>{error}</p>}
            <button className="btn btn-lg btn-block" type="submit" disabled={busy}>{busy ? '登录中…' : '登录'}</button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 'var(--t-xs)', color: 'var(--ink-4)' }}>
          {hint}
        </p>
      </div>
    </div>
  )
}
