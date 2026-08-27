import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { patient, therapist, toISODate, videos } from '../../data/seed'
import { createEscalation, effectiveStatus, markAllGuidanceRead, setCheckIn, todayCheckIns, useDemoState } from '../../store/store'
import { IconActivity, IconAlert, IconCheck, IconClock, IconPill, IconPlay } from '../../components/Icons'

export function TodayView() {
  const state = useDemoState()
  const today = toISODate(new Date())
  const rows = todayCheckIns(state, today).map((r) => ({ ...r, status: effectiveStatus(r.task, r.checkIn) }))
  const [troubleFor, setTroubleFor] = useState<string | null>(null)
  const [note, setNote] = useState('')

  // 打开今日页即视为看过康复师的留言，康复师端据此显示"家属已读"
  useEffect(() => { markAllGuidanceRead() }, [state.guidances.length])

  const total = rows.length
  const done = rows.filter((r) => r.status === 'done').length
  const remaining = total - done
  const next = rows.find((r) => r.status === 'pending')
  const guidances = [...state.guidances].reverse()

  function submitTrouble(taskId: string, title: string) {
    const text = note.trim()
    if (!text) return
    setCheckIn(taskId, 'difficulty', text)
    createEscalation({
      source: 'task',
      taskId,
      question: `${title}：${text}`,
      context: [`${patient.name} · ${patient.diagnosis.stage}`, `${today} 训练反馈`],
    })
    setTroubleFor(null)
    setNote('')
  }

  return (
    <div className="stack">
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
              : next
                ? `下一项 ${next.task.scheduledTime} · ${next.task.title}`
                : '今天的时间点都已过去，未完成的项目可以补做后补打卡'}
          </div>
        </div>
        <div className="hero-next">
          <div className="hero-next-k">连续坚持</div>
          <div className="hero-next-v num">
            {streak(state.checkIns, total)}
            <span style={{ fontSize: 'var(--t-sm)', fontWeight: 500, marginLeft: 4, opacity: .75 }}>天</span>
          </div>
        </div>
      </section>

      {guidances.length > 0 && (
        <div className="stack" style={{ gap: 12 }}>
          {guidances.map((g) => (
            <article className="msg" key={g.id}>
              <span className="msg-avatar">{g.therapistName[0]}</span>
              <div>
                <div className="msg-who">{g.therapistName} 康复师</div>
                <div className="msg-body">{g.text}</div>
                <div className="msg-time">
                  {new Date(g.at).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <section className="card card-pad">
        <div className="card-hd">
          <div>
            <div className="eyebrow">今日安排</div>
            <h2 className="card-title">按康复师制定的计划执行</h2>
          </div>
          <span style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Link to="/patient/videos" className="card-note" style={{ color: 'var(--green-700)', fontWeight: 550 }}>
              全部训练视频
            </Link>
            <span className="chip chip-brand num">{done} / {total}</span>
          </span>
        </div>

        <div className="timeline">
          {rows.map(({ task, checkIn, status }) => {
            const isDone = status === 'done'
            const isNext = next?.task.id === task.id
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
                        <Link className="chip chip-link" to={`/patient/videos/${video.id}`} style={{ padding: '2px 9px' }}>
                          <IconPlay size={10} /> 示范视频
                        </Link>
                      )}
                    </div>
                    {status === 'difficulty' && checkIn?.note && (
                      <div className="tl-desc" style={{ marginTop: 6, color: 'var(--clay-700)' }}>
                        已反馈：{checkIn.note} · 等待 {therapist.name} 康复师回复
                      </div>
                    )}
                  </div>
                  <div className="tl-actions">
                    {isDone && (
                      <>
                        <span className="chip chip-ok"><IconCheck size={10} /> 已完成</span>
                        <button className="btn-quiet" onClick={() => setCheckIn(task.id, 'pending')}>撤销</button>
                      </>
                    )}
                    {status === 'difficulty' && (
                      <>
                        <span className="chip chip-wait"><IconAlert size={11} /> 已反馈困难</span>
                        <button className="btn" onClick={() => setCheckIn(task.id, 'done')}>
                          <IconCheck size={11} /> 已完成
                        </button>
                      </>
                    )}
                    {(status === 'pending' || status === 'missed') && (
                      <>
                        <span className={`chip ${status === 'missed' ? 'chip-miss' : 'chip-wait'}`}>
                          {status === 'missed' ? '未完成' : <><IconClock size={11} /> 待完成</>}
                        </span>
                        <button className="btn-quiet" onClick={() => { setTroubleFor(troubleFor === task.id ? null : task.id); setNote('') }}>
                          遇到困难
                        </button>
                        <button className="btn" onClick={() => setCheckIn(task.id, 'done')}>
                          <IconCheck size={11} /> 打卡
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {troubleFor === task.id && (
                  <div className="trouble">
                    <div className="trouble-t">遇到什么困难？会连同她的档案一起转给 {therapist.name} 康复师</div>
                    <textarea
                      className="ta" rows={2} value={note} autoFocus
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="例：做到一半就说累，右腿抬不起来。"
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                      <button className="btn-quiet" onClick={() => setTroubleFor(null)}>取消</button>
                      <button className="btn" disabled={!note.trim()} onClick={() => submitTrouble(task.id, task.title)}>
                        提交给康复师
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>
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

/** 连续全部完成的天数（今天未完成时从昨天起算） */
function streak(checkIns: { date: string; status: string }[], perDay: number) {
  const byDate = new Map<string, number>()
  checkIns.forEach((c) => { if (c.status === 'done') byDate.set(c.date, (byDate.get(c.date) ?? 0) + 1) })
  let n = 0
  const d = new Date()
  for (;;) {
    const key = toISODate(d)
    if ((byDate.get(key) ?? 0) < perDay) {
      if (n === 0 && key === toISODate(new Date())) { d.setDate(d.getDate() - 1); continue }
      break
    }
    n++
    d.setDate(d.getDate() - 1)
  }
  return n
}
