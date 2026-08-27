import { useState } from 'react'
import { NavLink, Route, Routes, useNavigate } from 'react-router-dom'
import { currentSession, signOut } from '../../auth/auth'
import { PATIENT_ID, patient, roster, therapist, toISODate } from '../../data/seed'
import { effectiveStatus, pendingEscalations, todayCheckIns, useDemoState } from '../../store/store'
import { IconAlert, IconFile, IconLeaf } from '../../components/Icons'
import { ProfileDrawer } from '../../components/ProfileDrawer'
import { CheckinCalendar } from '../../components/CheckinCalendar'
import { FollowupView } from './FollowupView'
import { ConsultView } from './ConsultView'
import { GuidanceLogView } from './GuidanceLogView'
import '../../styles/app.css'

/**
 * 康复师端 —— 与家属端同构：顶部分页 + 左侧常驻列表。
 * 不必上门，在工作台看到这位老人做了什么、做得怎样，并回写指导。
 */
export function TherapistShell() {
  const nav = useNavigate()
  const session = currentSession()
  const state = useDemoState()
  const [profileOpen, setProfileOpen] = useState(false)

  const rows = todayCheckIns(state, toISODate(new Date()))
  const doneToday = rows.filter((r) => effectiveStatus(r.task, r.checkIn) === 'done').length
  const pending = pendingEscalations(state).length

  const NAV = [
    { to: '/therapist', label: '随访概览', end: true },
    { to: '/therapist/consult', label: '咨询记录', badge: pending },
    { to: '/therapist/adherence', label: '依从性' },
    { to: '/therapist/guidance', label: '指导记录' },
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

      <main className="page split">
        <aside className="card" style={{ padding: 12 }}>
          <div className="eyebrow" style={{ padding: '8px 14px 6px', marginBottom: 0 }}>
            我的患者 · {roster.length}
          </div>

          {roster.map((r) => {
            const active = r.id === PATIENT_ID
            const done = active ? doneToday : r.todayDone
            const full = done >= r.todayTotal
            return (
              <div className="plist-item" key={r.id} data-active={active} data-muted={!active}>
                <span className="who-dot" style={{ width: 36, height: 36, fontSize: 'var(--t-sm)' }}>{r.name[0]}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <div className="plist-name">{r.name}</div>
                  <div className="plist-meta">
                    {r.flag
                      ? <span style={{ color: 'var(--clay-700)' }}><IconAlert size={10} /> {r.flag}</span>
                      : `${r.gender} · ${r.ageBand}`}
                  </div>
                </span>
                <span className={`chip ${full ? 'chip-ok' : 'chip-wait'} num`}>{done}/{r.todayTotal}</span>
              </div>
            )
          })}

          <button className="link-more" style={{ marginTop: 12 }} onClick={() => setProfileOpen(true)}>
            <IconFile /> {patient.name}的完整档案
          </button>
        </aside>

        <Routes>
          <Route index element={<FollowupView />} />
          <Route path="consult" element={<ConsultView />} />
          <Route path="adherence" element={<CheckinCalendar />} />
          <Route path="guidance" element={<GuidanceLogView />} />
        </Routes>
      </main>

      <ProfileDrawer open={profileOpen} onClose={() => setProfileOpen(false)} audience="therapist" />
    </div>
  )
}
