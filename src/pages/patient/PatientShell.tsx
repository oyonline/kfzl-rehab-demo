import { useState } from 'react'
import { NavLink, Route, Routes, useNavigate } from 'react-router-dom'
import { currentSession, signOut } from '../../auth/auth'
import { patient } from '../../data/seed'
import { IconFile, IconLeaf } from '../../components/Icons'
import { ProfileDrawer } from '../../components/ProfileDrawer'
import { TodayView } from './TodayView'
import { ChatView } from './ChatView'
import { CheckinCalendar } from '../../components/CheckinCalendar'
import { GuidanceView } from './GuidanceView'
import { VideoLibraryView } from './VideoLibraryView'
import { VideoDetailView } from './VideoDetailView'
import '../../styles/app.css'

const NAV = [
  { to: '/patient', label: '今日', end: true },
  { to: '/patient/chat', label: '康复咨询' },
  { to: '/patient/calendar', label: '打卡日历' },
  { to: '/patient/guidance', label: '饮食与健康' },
]

export function PatientShell() {
  const nav = useNavigate()
  const session = currentSession()
  const [profileOpen, setProfileOpen] = useState(false)

  return (
    <div className="app" data-skin="warm">
      <header className="topbar">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div className="brand">
            <span className="brand-mark"><IconLeaf size={17} /></span>
            <span>
              <div className="brand-name">居家康复助手</div>
              <div className="brand-sub">HOME REHABILITATION</div>
            </span>
          </div>
          <nav className="nav">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => (isActive ? 'active' : '')}>
                {n.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="topbar-right">
          <span className="who">
            <span className="who-dot">{session?.displayName?.[0] ?? '·'}</span>
            {session?.displayName}
          </span>
          <button className="btn-quiet" onClick={() => { signOut(); nav('/patient/login', { replace: true }) }}>
            退出
          </button>
        </div>
      </header>

      <main className="page" style={{ display: 'grid', gridTemplateColumns: '332px 1fr', gap: 22, alignItems: 'start' }}>
        <aside className="card profile">
          <div className="avatar">{patient.name[0]}</div>
          <div className="profile-name">{patient.name}</div>
          <div className="profile-meta">{patient.gender} · {patient.ageBand} · {patient.diagnosis.stage}</div>

          <dl className="facts">
            <Fact k="诊断" v={patient.diagnosis.strokeType} />
            <Fact k="发病时间" v={patient.diagnosis.onsetDate} />
            <Fact k="活动能力" v={patient.functionStatus.mobility} />
            <Fact k="吞咽情况" v={patient.functionStatus.swallowing} />
            <Fact k="合并疾病" v={patient.diagnosis.comorbidities.join(' · ')} />
            <Fact k="主要照护人" v={`${patient.caregiver.name} · ${patient.caregiver.relation}`} />
            <Fact k="下次复评" v={patient.goals.nextReviewDate} />
          </dl>

          <button className="link-more" onClick={() => setProfileOpen(true)}>
            <IconFile /> 查看完整档案
          </button>
        </aside>

        <Routes>
          <Route index element={<TodayView />} />
          <Route path="videos" element={<VideoLibraryView />} />
          <Route path="videos/:id" element={<VideoDetailView />} />
          <Route path="chat" element={<ChatView />} />
          <Route path="calendar" element={<CheckinCalendar />} />
          <Route path="guidance" element={<GuidanceView />} />
        </Routes>
      </main>

      <ProfileDrawer open={profileOpen} onClose={() => setProfileOpen(false)} audience="family" />
    </div>
  )
}

function Fact({ k, v }: { k: string; v: string }) {
  return (
    <div className="fact">
      <dt className="fact-k">{k}</dt>
      <dd className="fact-v">{v}</dd>
    </div>
  )
}
