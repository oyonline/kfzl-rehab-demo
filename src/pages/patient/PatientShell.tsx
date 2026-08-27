import { useState } from 'react'
import { NavLink, Route, Routes, useNavigate } from 'react-router-dom'
import { currentSession, signOut } from '../../auth/auth'
import { patient } from '../../data/seed'
import { CARE_ALERTS } from '../../data/guidance'
import { useDemoState } from '../../store/store'
import { IconAlert, IconBell, IconCaret, IconFile, IconLeaf } from '../../components/Icons'
import { ProfileDrawer } from '../../components/ProfileDrawer'
import { TodayView } from './TodayView'
import { ChatView } from './ChatView'
import { CheckinCalendar } from '../../components/CheckinCalendar'
import { GuidanceView } from './GuidanceView'
import { GuidanceDetailView } from './GuidanceDetailView'
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
  const state = useDemoState()
  const unread = state.guidances.filter((g) => !g.readByFamily).length

  return (
    <div className="app" data-skin="warm">
      <header className="topbar">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div className="brand">
            <span className="brand-mark"><IconLeaf size={17} /></span>
            <span>
              <div className="brand-name">居家康复助手</div>
              <div className="brand-sub">科学康复 · 每日陪伴</div>
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
          {/* 康复师留言此前只在今日页顶部，切到别页就看不见了 */}
          <span className="bell" data-unread={unread > 0} title={unread > 0 ? `${unread} 条康复师留言未读` : '暂无新留言'}>
            <IconBell size={17} />
          </span>
          <span className="who">
            <span className="who-dot">{session?.displayName?.[0] ?? '·'}</span>
            {session?.displayName}
            <IconCaret size={13} />
          </span>
          <button className="btn-quiet" onClick={() => { signOut(); nav('/patient/login', { replace: true }) }}>
            退出
          </button>
        </div>
      </header>

      <main className="page" style={{ display: 'grid', gridTemplateColumns: '332px 1fr', gap: 22, alignItems: 'start' }}>
        <aside className="card profile">
          <div className="profile-hd">
            <div className="avatar">{patient.name[0]}</div>
            <div>
              <div className="profile-name">
                {patient.name}
                <span className="chip chip-brand" style={{ marginLeft: 10, verticalAlign: 4 }}>{patient.diagnosis.stage.replace('恢复期·', '')}</span>
              </div>
              <div className="profile-meta">
                {patient.gender} · {patient.ageBand}
                <span className="sep" />身高 {patient.heightCm}cm
                <span className="sep" />体重 {patient.weightKg}kg
              </div>
            </div>
          </div>

          <div className="fgroup">基本情况</div>
          <dl className="facts">
            <Fact k="诊断" v={patient.diagnosis.strokeType} />
            <Fact k="发病时间" v={patient.diagnosis.onsetDate} />
          </dl>

          <div className="fgroup">康复与活动</div>
          <dl className="facts">
            <Fact k="活动能力" v={patient.functionStatus.mobility} />
            <Fact k="吞咽情况" v={patient.functionStatus.swallowing} tag="注意" />
            <div className="fact">
              <dt className="fact-k">合并疾病</dt>
              <dd className="fact-v" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                {patient.diagnosis.comorbidities.map((c) => <span className="chip" key={c}>{c}</span>)}
              </dd>
            </div>
            <Fact k="主要照护人" v={`${patient.caregiver.name}（${patient.caregiver.relation}）`} />
            <Fact k="下次复评" v={patient.goals.nextReviewDate} />
          </dl>

          <button className="link-more" onClick={() => setProfileOpen(true)}>
            <IconFile /> 查看完整档案
          </button>

          {/* 安全信息不该埋在字段里 —— 每次打开就该看到 */}
          <div className="risk">
            <div className="risk-t"><IconAlert size={15} /> 风险与注意事项</div>
            <ul>
              {CARE_ALERTS.map((a) => <li key={a}>{a}</li>)}
            </ul>
          </div>
        </aside>

        <Routes>
          <Route index element={<TodayView />} />
          <Route path="videos" element={<VideoLibraryView />} />
          <Route path="videos/:id" element={<VideoDetailView />} />
          <Route path="chat" element={<ChatView />} />
          <Route path="calendar" element={<CheckinCalendar />} />
          <Route path="guidance" element={<GuidanceView />} />
          <Route path="guidance/:id" element={<GuidanceDetailView />} />
        </Routes>
      </main>

      <ProfileDrawer open={profileOpen} onClose={() => setProfileOpen(false)} audience="family" />
    </div>
  )
}

function Fact({ k, v, tag }: { k: string; v: string; tag?: string }) {
  return (
    <div className="fact">
      <dt className="fact-k">
        {k}
        {tag && <span className="tag-warn">{tag}</span>}
      </dt>
      <dd className="fact-v">{v}</dd>
    </div>
  )
}
