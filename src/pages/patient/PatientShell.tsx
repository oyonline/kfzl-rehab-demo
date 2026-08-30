import { useEffect, useState } from 'react'
import { NavLink, Route, Routes, useNavigate } from 'react-router-dom'
import { authFetch, currentSession, signOut } from '../../auth/auth'
import { ContentProvider, PatientProvider, usePatientData } from '../../data/context'

import { useDemoLoaded, useDemoState } from '../../store/store'
import { IconAlert, IconCaret, IconFile, IconLeaf } from '../../components/Icons'
import { ReminderBell } from '../../components/ReminderBell'
import { ReminderBanner } from '../../components/ReminderBanner'
import { ProfileDrawer } from '../../components/ProfileDrawer'
import { TodayView } from './TodayView'
import { ChatView } from './ChatView'
import { CheckinCalendar } from '../../components/CheckinCalendar'
import { GuidanceView } from './GuidanceView'
import { VitalsView } from './VitalsView'
import { GuidanceDetailView } from './GuidanceDetailView'
import { VideoLibraryView } from './VideoLibraryView'
import { VideoDetailView } from './VideoDetailView'
import '../../styles/app.css'

const NAV = [
  { to: '/patient', label: '今日', end: true },
  { to: '/patient/chat', label: '康复咨询' },
  { to: '/patient/calendar', label: '打卡日历' },
  { to: '/patient/guidance', label: '饮食与健康' },
  { to: '/patient/vitals', label: '健康数据' },
]

/**
 * 家属端外壳。
 *
 * 拆成两层是必须的：本组件既要**提供**患者上下文，又要**消费**它
 * （顶栏显示姓名、档案抽屉）。同一个组件不能同时做这两件事 ——
 * useContext 读不到自己这一层的 Provider。
 *
 * 家属绑定哪位患者由服务端决定（patient_members），不由前端猜。
 * 绑定多位时取第一位；真要支持切换是后续的事，这里先不臆造 UI。
 */
export function PatientShell() {
  const [patientId, setPatientId] = useState<string | null>(null)
  const [noPatient, setNoPatient] = useState(false)

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const res = await authFetch('/api/auth/me')
        if (!res.ok) return
        const d = await res.json()
        if (!alive) return
        if (d.patientIds?.length) setPatientId(d.patientIds[0])
        else setNoPatient(true)
      } catch { /* 会话失效由 authFetch 处理 */ }
    })()
    return () => { alive = false }
  }, [])

  if (noPatient) {
    return (
      <div className="app" data-skin="warm" style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        <div className="card card-pad" style={{ maxWidth: 420 }}>
          <h2 className="card-title">尚未关联老人档案</h2>
          <p className="card-note" style={{ marginTop: 8 }}>
            请联系康复师为您的账号关联老人档案后再登录。
          </p>
        </div>
      </div>
    )
  }
  if (!patientId) return <div className="app" style={{ minHeight: '100vh' }} />

  return (
    <ContentProvider>
      <PatientProvider patientId={patientId}>
        <PatientShellInner />
      </PatientProvider>
    </ContentProvider>
  )
}

function PatientShellInner() {
  const { patient, careAlerts } = usePatientData()
  const nav = useNavigate()
  const session = currentSession()
  const [profileOpen, setProfileOpen] = useState(false)
  const state = useDemoState()
  const loaded = useDemoLoaded()
  const unread = state.guidances.filter((g) => !g.readByFamily).length

  // 只取家属可见、且给了短形式的量表；顺序按 TILE_ORDER，不依赖 seed 的书写顺序
  const assessTiles = TILE_ORDER
    .map((n) => patient.assessments.find((a) => a.name === n))
    .filter((a): a is NonNullable<typeof a> => Boolean(a?.tile && a.visibleToFamily))
    .map((a) => a.tile!)
  const assessDate = patient.assessments.find((a) => a.tile)?.date ?? ''

  // 首屏数据来自服务端，未到之前先不渲染 —— 否则会闪一下"全部未完成"

  // 再跳成真实值，康复师看到的第一眼是错的。

  if (!loaded) return <div className="app" style={{ minHeight: '100vh' }} />


  return (
    <div className="app" data-skin="warm">
      <header className="topbar">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div className="brand">
            <span className="brand-mark"><IconLeaf size={17} /></span>
            <span>
              <div className="brand-name">银康安馨</div>
              <div className="brand-sub">居家康复智能助手</div>
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
          {/* 消息中心：今日提醒记录 + 未读留言数。任何页面都点得到 */}
          <ReminderBell unreadGuidance={unread} />
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
        {/*
          档案卡三段式：身份 → 评估摘要 → 今日须注意。
          这根左栏演示全程常驻可见，是评委看得最久的一块，所以只放三样东西：
          她是谁、现在什么水平、今天要当心什么。
          诊断细节、活动能力全文、入院经过等长文都收进「查看完整档案」——
          放在这里既读不完，也把真正值钱的量表分值挤没了。
        */}
        <aside className="card profile">
          {/* ① 身份 */}
          {/*
            头像与右侧两行文字上下对齐：头像 56px，恰好等于姓名行 + 年龄行的高度。
            阶段徽标不再塞进姓名行 —— 它靠 vertical-align 魔数跟 25px 的姓名凑基线，
            姓名一长就换行，徽标跟着飘。移到下面与诊断同一行，两者本就是同一类信息。
            不放身高体重：甲方未提供，是合成值，不值得占这个位置。
          */}
          <div className="profile-hd">
            <div className="avatar">{patient.name[0]}</div>
            <div>
              <div className="profile-name">{patient.name}</div>
              <div className="profile-meta">{patient.gender} · {patient.ageBand}</div>
            </div>
          </div>

          <div className="profile-tags">
            <span className="chip chip-brand">{patient.diagnosis.stage.replace('居家康复·', '')}</span>
            <span className="profile-dx">{patient.diagnosis.strokeType}</span>
          </div>

          {/* ② 评估摘要 —— 四张量表的分值，全卡最有说服力的部分 */}
          <div className="fgroup fgroup-bare">评估摘要</div>
          <div className="assess">
            {assessTiles.map((t) => (
              <div className="assess-i" key={t.label}>
                <div className="assess-k">{t.label}</div>
                <div className="assess-v num">{t.value}</div>
                <div className="assess-n">{t.note}</div>
              </div>
            ))}
          </div>
          <div className="assess-src">{assessDate} · 康复团队评估</div>

          <dl className="facts" style={{ marginTop: 18 }}>
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

          {/* ③ 今日须注意 —— 三条各自对应一项评估结论与一项今日任务 */}
          <div className="risk">
            <div className="risk-t"><IconAlert size={15} /> 今日须注意</div>
            <ul>
              {careAlerts.map((a) => <li key={a}>{a}</li>)}
            </ul>
          </div>
        </aside>

        <Routes>
          <Route index element={<TodayView />} />
          <Route path="videos" element={<VideoLibraryView />} />
          <Route path="videos/:id" element={<VideoDetailView />} />
          <Route path="chat" element={<ChatView />} />
          <Route path="calendar" element={<CheckinCalendar />} />
          <Route path="vitals" element={<VitalsView />} />
          <Route path="guidance" element={<GuidanceView />} />
          <Route path="guidance/:id" element={<GuidanceDetailView />} />
        </Routes>
      </main>

      {/* 推送浮层挂在外壳上：它浮在所有页面之上，不属于任何一页的内容流 */}
      <ReminderBanner />

      <ProfileDrawer open={profileOpen} onClose={() => setProfileOpen(false)} audience="family" />
    </div>
  )
}

/**
 * 按今日任务的相关度排序：下肢训练→肌力、吞咽操→洼田、
 * 认知训练→MMSE、皮肤检查→Braden。四项正好对上四项训练。
 */
const TILE_ORDER = ['MMT 徒手肌力测试', '洼田饮水试验', 'MMSE 简易智能量表', 'Braden 压疮风险']

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
