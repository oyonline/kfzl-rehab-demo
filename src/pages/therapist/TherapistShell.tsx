import { useEffect, useState } from 'react'
import { NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { authFetch, currentSession, signOut } from '../../auth/auth'
import { IconLeaf } from '../../components/Icons'
import { PatientListView } from './PatientListView'
import { PatientDetail } from './PatientDetail'
import { InboxView } from './InboxView'
import { ReviewView } from './ReviewView'
import '../../styles/app.css'

/**
 * 康复师端外壳。
 *
 * 信息架构：工作台级导航（在管患者 / 待处理）→ 患者列表 → 患者详情 → 详情内页签。
 * 顶部只放工作台级入口，患者内的分页放在详情页里，不混在同一层。
 */
export function TherapistShell() {
  const nav = useNavigate()
  const loc = useLocation()
  const session = currentSession()

  /**
   * 待处理角标是**跨患者**的，不能读 store —— store 的缓存只装当前患者。
   * 换页时重取一次：康复师回复完再切回来，角标要跟着降下去。
  */
  const [pending, setPending] = useState(0)
  const [reviewPending, setReviewPending] = useState(0)
  const [reviewTick, setReviewTick] = useState(0)
  useEffect(() => {
    const handleReviewChange = () => setReviewTick((n) => n + 1)
    window.addEventListener('kfzl:review-changed', handleReviewChange)
    return () => window.removeEventListener('kfzl:review-changed', handleReviewChange)
  }, [])
  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const res = await authFetch('/api/patients/inbox/pending')
        if (!res.ok) return
        const d = await res.json()
        if (alive) setPending(d.escalations?.length ?? 0)
      } catch { /* 会话失效由 authFetch 处理 */ }
      try {
        const response = await authFetch('/api/review/summary')
        if (!response.ok) return
        const summary = await response.json()
        const count = Object.values(summary).reduce((n: number, value: any) => n + (value?.pending ?? 0), 0)
        if (alive) setReviewPending(count as number)
      } catch { /* 同上 */ }
    })()
    return () => { alive = false }
  }, [loc.pathname, reviewTick])

  const NAV = [
    { to: '/therapist', label: '在管患者', end: true },
    { to: '/therapist/inbox', label: '待处理', badge: pending },
    { to: '/therapist/review', label: '内容审核', badge: reviewPending },
  ]


  return (
    <div className="app" data-skin="cool">
      <header className="topbar">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div className="brand">
            <span className="brand-mark"><IconLeaf size={17} /></span>
            <span>
              <div className="brand-name">银康安馨</div>
              <div className="brand-sub">康复师工作台</div>
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
            {session?.displayName}{session?.title ? ` · ${session.title}` : ''}
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
          <Route path="review" element={<ReviewView />} />
          <Route path="patients/:id/*" element={<PatientDetail />} />
          <Route path="*" element={<PatientListView />} />
        </Routes>
      </main>
    </div>
  )
}
