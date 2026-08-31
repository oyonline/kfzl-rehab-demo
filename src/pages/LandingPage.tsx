import { useNavigate } from 'react-router-dom'
import { IconLeaf, IconUser, IconFile } from '../components/Icons'
import '../styles/app.css'

/**
 * 落地页 —— 站点根路径的角色选择。
 *
 * 此前 `/` 直接 Navigate 到 /patient，等于把家属端当成了整个产品的门面，
 * 康复师端没有入口，线上只能靠手输地址进。这里给两端各一个明确入口。
 *
 * 仍遵守 README 的口径约束：**不显示账号密码**。那是排练资料，
 * 上屏会削弱真实感；需要时查 README。
 */
const ENTRIES = [
  {
    to: '/patient',
    skin: 'warm' as const,
    title: '老人 / 家属端',
    desc: '查看今日康复安排、打卡、录健康数据，随时向康复师咨询',
    points: ['今日安排与打卡', '训练示范视频', '康复咨询', '饮食与健康指导'],
    icon: <IconUser size={22} />,
  },
  {
    to: '/therapist',
    skin: 'cool' as const,
    title: '康复师工作台',
    desc: '远程查看在管患者的执行情况，回写指导、处理咨询',
    points: ['在管患者与依从性', '健康数据与预警', '待回复咨询', '回写康复指导'],
    icon: <IconFile size={22} />,
  },
]

export function LandingPage() {
  const nav = useNavigate()

  return (
    <div className="app" data-skin="cool" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '32px 24px' }}>
      <div style={{ width: '100%', maxWidth: 860 }}>
        <header style={{ textAlign: 'center', marginBottom: 34 }}>
          <span className="brand-mark" style={{ width: 52, height: 52, borderRadius: 17, margin: '0 auto 16px' }}>
            <IconLeaf size={26} />
          </span>
          <h1 style={{ fontSize: 'var(--t-2xl)', fontWeight: 660, letterSpacing: '.02em' }}>银康安馨</h1>
          <p style={{ color: 'var(--ink-3)', fontSize: 'var(--t-md)', marginTop: 8 }}>
            居家康复智能助手
          </p>
          <p style={{ color: 'var(--ink-4)', fontSize: 'var(--t-sm)', marginTop: 14 }}>
            请选择您的身份进入
          </p>
        </header>

        <div className="landing-grid">
          {ENTRIES.map((e) => (
            <button
              key={e.to}
              className="landing-card"
              data-skin={e.skin}
              onClick={() => nav(e.to)}
              aria-label={`进入${e.title}`}
            >
              <span className="landing-ico">{e.icon}</span>
              <span className="landing-title">{e.title}</span>
              <span className="landing-desc">{e.desc}</span>
              <ul className="landing-points">
                {e.points.map((p) => <li key={p}>{p}</li>)}
              </ul>
              <span className="landing-go">进入 →</span>
            </button>
          ))}
        </div>

        <p style={{ textAlign: 'center', marginTop: 26, fontSize: 'var(--t-xs)', color: 'var(--ink-4)' }}>
          页面人物与数据均为演示示例，不作为诊疗依据
        </p>
      </div>
    </div>
  )
}
