import { patient, taskDefs, toISODate, videos } from '../../data/seed'
import { VideoStage } from '../../components/VideoStage'
import { effectiveStatus, todayCheckIns, useDemoState } from '../../store/store'
import { IconAlert, IconCheck, IconClock, IconPlay } from '../../components/Icons'

export function FollowupView() {
  const state = useDemoState()
  const today = toISODate(new Date())
  const rows = todayCheckIns(state, today).map((r) => ({ ...r, status: effectiveStatus(r.task, r.checkIn) }))
  const done = rows.filter((r) => r.status === 'done').length
  const uploads = [...state.uploads].reverse()

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const date = toISODate(d)
    return state.checkIns.filter((c) => c.date === date && c.status === 'done').length
  })
  const weekRate = Math.round((last7.reduce((a, b) => a + b, 0) / (taskDefs.length * 7)) * 100)

  // 不写死：换病例后写死的文案会变成假话（曾把洼田 Ⅱ 级写成「偶有呛咳」）
  const swallowAssessment = patient.assessments.find((a) => a.name.includes('洼田'))
  const swallowBrief = swallowAssessment ? `洼田 ${swallowAssessment.value}` : patient.functionStatus.swallowing

  return (
    <div className="stack">
      <section className="card card-pad">
        <div className="stats">
          <Stat k="今日完成" v={`${done}`} unit={`/ ${rows.length}`} />
          <Stat k="近 7 日完成率" v={`${weekRate}`} unit="%" />
          <Stat k="患侧" v={patient.functionStatus.affectedSide} small />
          <Stat k="吞咽" v={swallowBrief} small />
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
                  {state.uploads.some((u) => u.taskId === task.id && u.date === today) && (
                    <span className="chip chip-brand" style={{ marginTop: 5, padding: '2px 9px' }}>
                      <IconPlay size={10} /> 已回传视频
                    </span>
                  )}
                </td>
                <td style={{ color: 'var(--ink-3)' }}>{task.reps ?? '—'}</td>
                <td>
                  {status === 'done' && <span className="chip chip-ok"><IconCheck size={10} /> 已完成</span>}
                  {status === 'difficulty' && <span className="chip chip-wait"><IconAlert size={11} /> 反馈困难</span>}
                  {status === 'missed' && <span className="chip chip-miss">未完成</span>}
                  {status === 'pending' && <span className="chip"><IconClock size={11} /> 待完成</span>}
                </td>
                <td className="num" style={{ textAlign: 'right', color: 'var(--ink-3)' }}>
                  {checkIn?.at ? new Date(checkIn.at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {uploads.length > 0 && (
        <section className="card card-pad">
          <div className="card-hd">
            <div>
              <div className="eyebrow">训练回传</div>
              <h2 className="card-title">家属上传的训练视频</h2>
            </div>
            <span className="card-note num">共 {uploads.length} 条</span>
          </div>

          <div className="stack" style={{ gap: 16 }}>
            {uploads.map((u) => {
              const task = taskDefs.find((t) => t.id === u.taskId)
              const v = videos.find((x) => x.id === u.playbackVideoId)
              return (
                <div key={u.id}>
                  {v && <VideoStage video={v} />}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}>
                    <span className="upload-ico" style={{ width: 34, height: 34, fontSize: 10 }}>MP4</span>
                    <span style={{ flex: 1 }}>
                      <div className="upload-name">{u.filename}</div>
                      <div className="upload-size num">
                        {u.sizeLabel} · {task?.title} · {new Date(u.uploadedAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}
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
