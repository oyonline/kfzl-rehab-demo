import { toISODate, videos } from '../../data/seed'
import { setCheckIn, todayCheckIns, useDemoState } from '../../store/store'
import { IconActivity, IconCheck, IconClock, IconPill, IconPlay } from '../../components/Icons'

export function TodayView() {
  const state = useDemoState()
  const today = toISODate(new Date())
  const rows = todayCheckIns(state, today)

  const total = rows.length
  const done = rows.filter((r) => r.checkIn?.status === 'done').length
  const remaining = total - done
  const next = rows.find((r) => r.checkIn?.status !== 'done')
  const guidances = [...state.guidances].reverse()

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
            {remaining === 0 ? '坚持得很好，明天继续保持' : `下一项 ${next?.task.scheduledTime} · ${next?.task.title}`}
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
                      {video && <span className="chip" style={{ padding: '2px 9px' }}><IconPlay size={10} /> 示范视频</span>}
                    </div>
                  </div>
                  <div className="tl-actions">
                    {isDone ? (
                      <>
                        <span className="chip chip-ok"><IconCheck size={10} /> 已完成</span>
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
