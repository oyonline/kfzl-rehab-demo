import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { currentSession, signOut } from '../../auth/auth'
import { patient, toISODate, videos } from '../../data/seed'
import { setCheckIn, todayCheckIns, useDemoState } from '../../store/store'
import { IconActivity, IconCalendar, IconChat, IconCheck, IconClock, IconFile, IconLeaf, IconPill, IconPlay, IconUtensils } from '../../components/Icons'
import { ProfileDrawer } from '../../components/ProfileDrawer'
import '../../styles/app.css'

export function PatientShell() {
  const nav = useNavigate()
  const state = useDemoState()
  const session = currentSession()
  const [profileOpen, setProfileOpen] = useState(false)
  const today = toISODate(new Date())
  const rows = todayCheckIns(state, today)

  const total = rows.length
  const done = rows.filter((r) => r.checkIn?.status === 'done').length
  const remaining = total - done
  const next = rows.find((r) => r.checkIn?.status !== 'done')
  const guidances = [...state.guidances].reverse()

  return (
    <div className="app" data-skin="warm">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark"><IconLeaf size={17} /></span>
          <span>
            <div className="brand-name">居家康复助手</div>
            <div className="brand-sub">HOME REHABILITATION</div>
          </span>
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
        {/* 档案 */}
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

        <div className="stack">
          {/* 今日概览 */}
          <section className="hero">
            <Ring done={done} total={total} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div className="hero-eyebrow">今日康复</div>
              <div className="hero-line">
                {remaining === 0 ? '今天的项目已经全部完成' : `今天还有 ${remaining} 项待完成`}
              </div>
              <div className="hero-sub">
                {remaining === 0
                  ? '坚持得很好，明天继续保持'
                  : `下一项 ${next?.task.scheduledTime} · ${next?.task.title}`}
              </div>
            </div>
            <div className="hero-next">
              <div className="hero-next-k">连续坚持</div>
              <div className="hero-next-v num">{streak(state.checkIns, total)}<span style={{ fontSize: 'var(--t-sm)', fontWeight: 500, marginLeft: 4, opacity: .75 }}>天</span></div>
            </div>
          </section>

          {/* 康复师指导 */}
          {guidances.length > 0 && (
            <div className="stack" style={{ gap: 12 }}>
              {guidances.map((g) => (
                <article key={g.id} className="msg">
                  <span className="msg-avatar">{g.therapistName[0]}</span>
                  <div>
                    <div className="msg-who">{g.therapistName} 康复师</div>
                    <div className="msg-body">{g.text}</div>
                    <div className="msg-time">{new Date(g.at).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                </article>
              ))}
            </div>
          )}

          {/* 今日待办 */}
          <section className="card card-pad">
            <div className="card-hd">
              <div>
                <div className="eyebrow">今日安排</div>
                <h2 className="card-title">按康复师制定的计划执行</h2>
              </div>
              <span className="chip chip-brand num">{done} / {total}</span>
            </div>

            <div className="timeline">
              {rows.map(({ task, checkIn }) => {
                const isDone = checkIn?.status === 'done'
                const isNext = !isDone && next?.task.id === task.id
                const video = task.videoId ? videos.find((v) => v.id === task.videoId) : undefined
                return (
                  <div className="tl-item" key={task.id}>
                    <span className={`tl-node${isDone ? ' tl-node-done' : ''}${isNext ? ' tl-node-now' : ''}`}>
                      {isDone && <IconCheck size={9} />}
                    </span>
                    <div className={`tl-card${isDone ? ' tl-card-done' : ''}`}>
                      <time className="tl-time num">{task.scheduledTime}</time>
                      <div>
                        <div className="tl-title">
                          <span style={{ color: 'var(--ink-3)', marginRight: 8, verticalAlign: -2, display: 'inline-block' }}>
                            {task.kind === 'medication' ? <IconPill size={15} /> : <IconActivity size={15} />}
                          </span>
                          {task.title}
                        </div>
                        <div className="tl-desc">
                          <span>{task.reps ?? task.instruction}</span>
                          {video && (
                            <span className="chip" style={{ padding: '2px 9px' }}>
                              <IconPlay size={10} /> 示范视频
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="tl-actions">
                        {isDone ? (
                          <>
                            <span className="chip chip-ok">
                              <IconCheck size={10} /> 已完成
                            </span>
                            <button className="btn-quiet" onClick={() => setCheckIn(task.id, 'pending')}>撤销</button>
                          </>
                        ) : (
                          <>
                            <span className="chip chip-wait"><IconClock size={11} /> 待完成</span>
                            <button className="btn" onClick={() => setCheckIn(task.id, 'done')}>
                              <IconCheck size={11} /> 打卡
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <Soon icon={<IconChat />} t="康复咨询" d="随时提问，结合老人情况作答" />
            <Soon icon={<IconCalendar />} t="打卡日历" d="回看每天的坚持记录" />
          </div>
          <Soon icon={<IconUtensils />} t="饮食与健康指导" d="按当前康复阶段给出的日常建议" />
        </div>
      </main>

      <ProfileDrawer open={profileOpen} onClose={() => setProfileOpen(false)} />
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

function Ring({ done, total }: { done: number; total: number }) {
  const r = 44
  const c = 2 * Math.PI * r
  const pct = total ? done / total : 0
  return (
    <div className="ring" style={{ position: 'relative', zIndex: 1 }}>
      <svg width={104} height={104}>
        <circle cx={52} cy={52} r={r} stroke="rgba(255,255,255,.22)" strokeWidth={9} fill="none" />
        <circle
          cx={52} cy={52} r={r} stroke="#fff" strokeWidth={9} fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
          style={{ transition: 'stroke-dashoffset .55s cubic-bezier(.2,.8,.2,1)' }}
        />
      </svg>
      <div className="ring-label num" style={{ color: '#fff' }}>
        {/* 必须包一层 span：ring-label 是 grid 容器，裸文字节点与 <small>
            会被当成两个格子上下排，导致 "/ 4" 掉到圆环底部 */}
        <span>{done}<small>/{total}</small></span>
      </div>
    </div>
  )
}

function Soon({ icon, t, d }: { icon: React.ReactNode; t: string; d: string }) {
  return (
    <div className="soon">
      <span className="soon-icon">{icon}</span>
      <span>
        <div className="soon-t">{t}</div>
        <div className="soon-d">{d}</div>
      </span>
    </div>
  )
}

/** 连续全部完成的天数（不含今天，今天未完成时不计） */
function streak(checkIns: { date: string; status: string }[], perDay: number) {
  const byDate = new Map<string, number>()
  checkIns.forEach((c) => {
    if (c.status === 'done') byDate.set(c.date, (byDate.get(c.date) ?? 0) + 1)
  })
  let n = 0
  const d = new Date()
  for (;;) {
    const key = toISODate(d)
    const full = (byDate.get(key) ?? 0) >= perDay
    if (!full) {
      if (n === 0 && key === toISODate(new Date())) { d.setDate(d.getDate() - 1); continue }
      break
    }
    n++
    d.setDate(d.getDate() - 1)
  }
  return n
}
