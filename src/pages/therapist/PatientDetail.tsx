import { useState } from 'react'
import { Link, NavLink, Route, Routes, useParams } from 'react-router-dom'
import {toISODate} from '../../data/seed'
import { ContentProvider, PatientProvider, usePatientData } from '../../data/context'
import { effectiveStatus, hasAbnormalVital, pendingEscalations, todayCheckIns, useDemoState } from '../../store/store'
import { IconFile } from '../../components/Icons'
import { ProfileDrawer } from '../../components/ProfileDrawer'
import { CheckinCalendar } from '../../components/CheckinCalendar'
import { FollowupView } from './FollowupView'
import { ConsultView } from './ConsultView'
import { GuidanceLogView } from './GuidanceLogView'
import { VitalsPanel } from './VitalsPanel'

/**
 * 患者详情 —— 从列表进入，内部再按页签切换。
 *
 * 与家属端同理拆两层：本层按路由参数提供上下文，内层消费。
 * 患者 id 来自 URL，不再是写死的 PATIENT_ID —— 康复师点哪位就是哪位。
 */
export function PatientDetail() {
  const { id } = useParams()
  if (!id) return null
  return (
    <ContentProvider>
      <PatientProvider patientId={id}>
        <PatientDetailInner />
      </PatientProvider>
    </ContentProvider>
  )
}

function PatientDetailInner() {
  const { patientId: PATIENT_ID, patient, taskDefs } = usePatientData()
  const state = useDemoState()
  const [profileOpen, setProfileOpen] = useState(false)

  const rows = todayCheckIns(state, taskDefs, toISODate(new Date()))
  const done = rows.filter((r) => effectiveStatus(r.task, r.checkIn) === 'done').length
  const pending = pendingEscalations(state).length
  // 今日出现过超标血压时，页签上打一个红点 —— 康复师不必点进去才知道
  const bpAlert = hasAbnormalVital(state)

  const TABS = [
    { to: `/therapist/patients/${PATIENT_ID}`, label: '随访概览', end: true },
    { to: `/therapist/patients/${PATIENT_ID}/consult`, label: '咨询记录', badge: pending },
    { to: `/therapist/patients/${PATIENT_ID}/vitals`, label: '健康数据', alert: bpAlert },
    { to: `/therapist/patients/${PATIENT_ID}/adherence`, label: '依从性' },
    { to: `/therapist/patients/${PATIENT_ID}/guidance`, label: '指导记录' },
  ]

  return (
    <div className="stack">
      <div className="crumb">
        <Link to="/therapist">在管患者</Link>
        <span>/</span>
        <span>{patient.name}</span>
      </div>

      <section className="card detail-hd">
        <span className="avatar" style={{ width: 62, height: 62, fontSize: 24, marginBottom: 0 }}>{patient.name[0]}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 className="card-title" style={{ fontSize: 'var(--t-xl)' }}>{patient.name}</h1>
          <p className="card-note" style={{ marginTop: 3 }}>
            {patient.gender} · {patient.ageBand} · {patient.diagnosis.strokeType} · {patient.diagnosis.stage}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className={`chip ${done >= rows.length ? 'chip-ok' : ''} num`}>今日 {done}/{rows.length}</span>
          <span className="chip chip-brand">下次复评 {patient.goals.nextReviewDate}</span>
          <button className="btn-quiet" onClick={() => setProfileOpen(true)}><IconFile size={14} /> 完整档案</button>
        </div>
      </section>

      <nav className="tabs">
        {TABS.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => (isActive ? 'active' : '')}>
            {t.label}
            {!!t.badge && <span className="nav-badge num">{t.badge}</span>}
            {t.alert && <span className="nav-dot" aria-label="有异常" />}
          </NavLink>
        ))}
      </nav>

      <Routes>
        <Route index element={<FollowupView />} />
        <Route path="consult" element={<ConsultView />} />
        <Route path="vitals" element={<VitalsPanel />} />
        <Route path="adherence" element={<CheckinCalendar />} />
        <Route path="guidance" element={<GuidanceLogView />} />
      </Routes>

      <ProfileDrawer open={profileOpen} onClose={() => setProfileOpen(false)} audience="therapist" />
    </div>
  )
}
