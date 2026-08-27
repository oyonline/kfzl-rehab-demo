import { NavLink, Route, Routes, useNavigate } from 'react-router-dom'
import { currentSession, signOut } from '../../auth/auth'
import { therapist } from '../../data/seed'
import { pendingEscalations, useDemoState } from '../../store/store'
import { IconLeaf } from '../../components/Icons'
import { PatientListView } from './PatientListView'
import { PatientDetail } from './PatientDetail'
import { InboxView } from './InboxView'
import '../../styles/app.css'

/**
 * 康复师端外壳。
 *
 * 信息架构：工作台级导航（在管患者 / 待处理）→ 患者列表 → 患者详情 → 详情内页签。
 * 顶部只放工作台级入口，患者内的分页放在详情页里，不混在同一层。
 */
export function TherapistShell() {
  const nav = useNavigate()
  const session = currentSession()
  const state = useDemoState()
  const pending = pendingEscalations(state).length

  const NAV = [
    { to: '/therapist', label: '在管患者', end: true },
    { to: '/therapist/inbox', label: '待处理', badge: pending },
  ]

  return (
    <div className="app" data-skin="cool">
      <header className="topbar">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div className="brand">
            <span className="brand-mark"><IconLeaf size={17} /></span>
            <span>
              <div className="brand-name">康复师工作台</div>
              <div className="brand-sub">THERAPIST CONSOLE</div>
            </span>
          </div>
          <nav className="nav">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => (isActive ? 'active' : '')}>
                {n.label}
                {!!n.badge && <span className="nav-badge num">{n.badge}</span>}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="topbar-right">
          <span className="who">
            <span className="who-dot">{session?.displayName?.[0] ?? '·'}</span>
            {session?.displayName} · {therapist.title}
          </span>
          <button className="btn-quiet" onClick={() => { signOut(); nav('/therapist/login', { replace: true }) }}>
            退出
          </button>
        </div>
      </header>

      <main className="page">
        <Routes>
          <Route index element={<PatientListView />} />
          <Route path="inbox" element={<InboxView />} />
          <Route path="patients/:id/*" element={<PatientDetail />} />
          <Route path="*" element={<PatientListView />} />
        </Routes>
      </main>
    </div>
  )
}
