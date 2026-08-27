import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { currentSession, signOut } from '../../auth/auth'
import { patient, taskDefs, therapist, toISODate } from '../../data/seed'
import { addGuidance, todayCheckIns, useDemoState } from '../../store/store'
import { IconCheck, IconClock, IconLeaf, IconSend } from '../../components/Icons'
import '../../styles/app.css'

/**
 * 康复师端 —— 演示的价值落点：
 * 不必上门，在工作台看到这位老人做了什么、做得怎样，并回写指导。
 */
export function TherapistShell() {
  const nav = useNavigate()
  const state = useDemoState()
  const session = currentSession()
  const today = toISODate(new Date())
  const rows = todayCheckIns(state, today)
  const [draft, setDraft] = useState('')

  const total = rows.length
  const done = rows.filter((r) => r.checkIn?.status === 'done').length

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const date = toISODate(d)
    const items = state.checkIns.filter((c) => c.date === date)
    return { date, done: items.filter((c) => c.status === 'done').length, total: taskDefs.length }
  })
  const week = last7.reduce((a, d) => a + d.done, 0)
  const weekRate = Math.round((week / (taskDefs.length * 7)) * 100)

  return (
    <div className="app" data-skin="cool">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark"><IconLeaf size={17} /></span>
          <span>
            <div className="brand-name">康复师工作台</div>
            <div className="brand-sub">THERAPIST CONSOLE</div>
          </span>
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
        {/* 患者列表 */}
        <aside className="card" style={{ padding: 12 }}>
          <div className="eyebrow" style={{ padding: '8px 14px 6px', marginBottom: 0 }}>我的患者 · 1</div>
          <div className="plist-item" data-active="true">
            <span className="who-dot" style={{ width: 36, height: 36, fontSize: 'var(--t-sm)' }}>{patient.name[0]}</span>
            <span style={{ flex: 1 }}>
              <div className="plist-name">{patient.name}</div>
              <div className="plist-meta">{patient.gender} · {patient.ageBand}</div>
            </span>
            <span className={`chip ${done === total ? 'chip-ok' : 'chip-wait'} num`}>{done}/{total}</span>
          </div>
        </aside>

        <div className="stack">
          {/* 患者概览 */}
          <section className="card card-pad">
            <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', marginBottom: 22 }}>
              <span className="avatar" style={{ width: 64, height: 64, fontSize: 24, marginBottom: 0 }}>
                {patient.name[0]}
              </span>
              <div style={{ flex: 1 }}>
                <h1 className="card-title" style={{ fontSize: 'var(--t-xl)' }}>{patient.name}</h1>
                <p className="card-note" style={{ marginTop: 3 }}>
                  {patient.diagnosis.strokeType} · {patient.diagnosis.stage} · 发病 {patient.diagnosis.onsetDate}
                </p>
              </div>
              <span className="chip chip-brand">下次复评 {patient.goals.nextReviewDate}</span>
            </div>

            <div className="stats">
              <Stat k="今日完成" v={`${done}`} unit={`/ ${total}`} />
              <Stat k="近 7 日完成率" v={`${weekRate}`} unit="%" />
              <Stat k="患侧" v={patient.functionStatus.affectedSide} small />
              <Stat k="吞咽" v="进食稀液偶有呛咳" small />
            </div>
          </section>

          {/* 今日执行 */}
          <section className="card card-pad">
            <div className="card-hd">
              <div>
                <div className="eyebrow">远程随访</div>
                <h2 className="card-title">今日执行情况</h2>
              </div>
              <span className="card-note">{today}</span>
            </div>

            <table className="tbl">
              <thead>
                <tr><th>时间</th><th>训练项目</th><th>处方要求</th><th>状态</th><th style={{ textAlign: 'right' }}>打卡时刻</th></tr>
              </thead>
              <tbody>
                {rows.map(({ task, checkIn }) => (
                  <tr key={task.id}>
                    <td className="num" style={{ color: 'var(--ink-2)', fontWeight: 600 }}>{task.scheduledTime}</td>
                    <td style={{ fontWeight: 600 }}>{task.title}</td>
                    <td style={{ color: 'var(--ink-3)' }}>{task.reps ?? '—'}</td>
                    <td>
                      {checkIn?.status === 'done' ? (
                        <span className="chip chip-ok"><IconCheck size={10} /> 已完成</span>
                      ) : checkIn?.status === 'missed' ? (
                        <span className="chip chip-miss">未完成</span>
                      ) : (
                        <span className="chip chip-wait"><IconClock size={11} /> 待完成</span>
                      )}
                    </td>
                    <td className="num" style={{ textAlign: 'right', color: 'var(--ink-3)' }}>
                      {checkIn?.at
                        ? new Date(checkIn.at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* 趋势 */}
          <section className="card card-pad">
            <div className="card-hd">
              <div>
                <div className="eyebrow">依从性</div>
                <h2 className="card-title">近 7 日完成情况</h2>
              </div>
              <span className="card-note">每日 {taskDefs.length} 项</span>
            </div>
            <div className="bars">
              {last7.map((d) => (
                <div className="bar-col" key={d.date}>
                  <span className="num" style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>{d.done}</span>
                  <div
                    className="bar"
                    data-partial={d.done < d.total}
                    style={{ height: `${Math.max(6, (d.done / d.total) * 78)}px` }}
                  />
                  <span className="bar-k num">{d.date.slice(5).replace('-', '/')}</span>
                </div>
              ))}
            </div>
          </section>

          {/* 回写指导 */}
          <section className="card card-pad">
            <div className="card-hd">
              <div>
                <div className="eyebrow">远程指导</div>
                <h2 className="card-title">给家属的指导意见</h2>
              </div>
              <span className="card-note">提交后家属端立即可见</span>
            </div>

            <textarea
              className="ta"
              rows={3}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="例：今天吞咽训练完成得很好，明天可把空吞咽增加到 15 次；若再出现呛咳，先暂停并告诉我。"
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
              <button
                className="btn"
                disabled={!draft.trim()}
                onClick={() => { addGuidance(draft.trim(), therapist.name); setDraft('') }}
              >
                <IconSend size={13} /> 发送给家属
              </button>
            </div>

            {state.guidances.length > 0 && (
              <ul style={{ marginTop: 22, display: 'grid', gap: 10 }}>
                {[...state.guidances].reverse().map((g) => (
                  <li key={g.id} style={{ padding: '14px 16px', background: 'var(--surface-2)', borderRadius: 'var(--r)' }}>
                    <div style={{ fontSize: 'var(--t-sm)' }}>{g.text}</div>
                    <div style={{ fontSize: 'var(--t-xs)', color: 'var(--ink-4)', marginTop: 6 }}>
                      {new Date(g.at).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      {' · '}
                      {g.readByFamily ? '家属已读' : '已送达'}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}

function Stat({ k, v, unit, small }: { k: string; v: string; unit?: string; small?: boolean }) {
  return (
    <div className="stat">
      <div className="stat-k">{k}</div>
      <div className={`stat-v${small ? '' : ' num'}`} style={small ? { fontSize: 'var(--t-base)', fontWeight: 550, lineHeight: 1.45, marginTop: 7 } : undefined}>
        {v}{unit && <small>{unit}</small>}
      </div>
    </div>
  )
}
