import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { DEMO_CREDENTIALS, signIn, type Role } from '../auth/auth'
import { IconLeaf } from '../components/Icons'
import '../styles/app.css'

interface Props {
  role: Role
  title: string
  subtitle: string
  home: string
  otherLabel: string
  otherPath: string
  skin: 'warm' | 'cool'
}

/** 账号 + 密码登录，无验证码、无扫码、无第三方授权 */
export function LoginPage({ role, title, subtitle, home, otherLabel, otherPath, skin }: Props) {
  const nav = useNavigate()
  const cred = DEMO_CREDENTIALS[role]
  const [username, setUsername] = useState(cred.username)
  const [password, setPassword] = useState(cred.password)
  const [error, setError] = useState('')

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const session = signIn(username, password, role)
    if (!session) return setError('账号或密码不正确')
    nav(home, { replace: true })
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
              <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
            </label>
            <label className="field">
              <span>密码</span>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
            </label>
            {error && <p style={{ color: 'var(--miss)', fontSize: 'var(--t-sm)', marginBottom: 14 }}>{error}</p>}
            <button className="btn btn-lg btn-block" type="submit">登录</button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 18, fontSize: 'var(--t-xs)', color: 'var(--ink-4)', lineHeight: 1.9 }}>
          {cred.username} / {cred.password}
          {' · '}
          <a href={otherPath} style={{ color: 'var(--green-600)' }}>{otherLabel}</a>
          <br />
          本系统用于康复服务能力展示，案例人物与数据均为虚构。
        </p>
      </div>
    </div>
  )
}
