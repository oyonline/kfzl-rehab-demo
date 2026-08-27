import { patient, taskDefs, toISODate } from '../../data/seed'
import { effectiveStatus, todayCheckIns, useDemoState } from '../../store/store'
import { IconAlert, IconCheck, IconClock } from '../../components/Icons'

export function FollowupView() {
  const state = useDemoState()
  const today = toISODate(new Date())
  const rows = todayCheckIns(state, today).map((r) => ({ ...r, status: effectiveStatus(r.task, r.checkIn) }))
  const done = rows.filter((r) => r.status === 'done').length

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const date = toISODate(d)
    return state.checkIns.filter((c) => c.date === date && c.status === 'done').length
  })
  const weekRate = Math.round((last7.reduce((a, b) => a + b, 0) / (taskDefs.length * 7)) * 100)

  return (
    <div className="stack">
      <section className="card card-pad">
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', marginBottom: 22 }}>
          <span className="avatar" style={{ width: 64, height: 64, fontSize: 24, marginBottom: 0 }}>{patient.name[0]}</span>
          <div style={{ flex: 1 }}>
            <h1 className="card-title" style={{ fontSize: 'var(--t-xl)' }}>{patient.name}</h1>
            <p className="card-note" style={{ marginTop: 3 }}>
              {patient.diagnosis.strokeType} · {patient.diagnosis.stage} · 发病 {patient.diagnosis.onsetDate}
            </p>
          </div>
          <span className="chip chip-brand">下次复评 {patient.goals.nextReviewDate}</span>
        </div>

        <div className="stats">
          <Stat k="今日完成" v={`${done}`} unit={`/ ${rows.length}`} />
          <Stat k="近 7 日完成率" v={`${weekRate}`} unit="%" />
          <Stat k="患侧" v={patient.functionStatus.affectedSide} small />
          <Stat k="吞咽" v="进食稀液偶有呛咳" small />
        </div>
      </section>

      <section className="card card-pad">
        <div className="card-hd">
          <div>
            <div className="eyebrow">远程随访</div>
            <h2 className="card-title">今日执行情况</h2>
          </div>
          <span className="card-note num">{today}</span>
        </div>

        <table className="tbl">
          <thead>
            <tr><th>时间</th><th>训练项目</th><th>处方要求</th><th>状态</th><th style={{ textAlign: 'right' }}>打卡时刻</th></tr>
          </thead>
          <tbody>
            {rows.map(({ task, checkIn, status }) => (
              <tr key={task.id}>
                <td className="num" style={{ color: 'var(--ink-2)', fontWeight: 600 }}>{task.scheduledTime}</td>
                <td style={{ fontWeight: 600 }}>
                  {task.title}
                  {status === 'difficulty' && checkIn?.note && (
                    <div style={{ fontWeight: 400, color: 'var(--clay-700)', fontSize: 'var(--t-xs)', marginTop: 3 }}>
                      家属反馈：{checkIn.note}
                    </div>
                  )}
                </td>
                <td style={{ color: 'var(--ink-3)' }}>{task.reps ?? '—'}</td>
                <td>
                  {status === 'done' && <span className="chip chip-ok"><IconCheck size={10} /> 已完成</span>}
                  {status === 'difficulty' && <span className="chip chip-wait"><IconAlert size={11} /> 反馈困难</span>}
                  {status === 'missed' && <span className="chip chip-miss">未完成</span>}
                  {status === 'pending' && <span className="chip chip-wait"><IconClock size={11} /> 待完成</span>}
                </td>
                <td className="num" style={{ textAlign: 'right', color: 'var(--ink-3)' }}>
                  {checkIn?.at ? new Date(checkIn.at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
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
