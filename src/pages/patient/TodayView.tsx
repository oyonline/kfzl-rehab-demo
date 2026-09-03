import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {SUPPORT_PHONE, toISODate} from '../../data/seed'
import { usePatientData, useContent } from '../../data/context'
import { createEscalation, effectiveStatus, markAllGuidanceRead, setCheckIn, todayCheckIns, useDemoState } from '../../store/store'
import { IconActivity, IconAlert, IconCheck, IconClock, IconHeart, IconPill, IconPlay, IconShield } from '../../components/Icons'
import { Lines } from '../../components/Lines'

export function TodayView() {
  const { patient, taskDefs, therapist } = usePatientData()
  const { videos } = useContent()
  const nav = useNavigate()
  const state = useDemoState()
  const today = toISODate(new Date())
  const rows = todayCheckIns(state, taskDefs, today).map((r) => ({ ...r, status: effectiveStatus(r.task, r.checkIn) }))
  const [troubleFor, setTroubleFor] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [showAllMsgs, setShowAllMsgs] = useState(false)

  // 打开今日页即视为看过康复师的留言，康复师端据此显示"家属已读"
  useEffect(() => { markAllGuidanceRead() }, [state.guidances.length])

  const total = rows.length
  const hasPlan = total > 0
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
          <div className="hero-eyebrow">个性化康复计划与提醒</div>
          <div className="hero-line">
            {!hasPlan
              ? '康复计划待制定'
              : remaining === 0
                ? '今天的项目已经全部完成'
                : `今天还有 ${remaining} 项待完成`}
          </div>
          <div className="hero-sub">
            {!hasPlan
              ? '康复师制定计划后，今日安排会显示在这里'
              : remaining === 0
              ? '坚持得很好，明天继续保持'
              : next
                ? `下一项 ${next.task.scheduledTime} · ${next.task.title}`
                : '今天的时间点都已过去，未完成的项目可以补做后补打卡'}
          </div>
        </div>
        <div className="hero-next">
          <div className="hero-next-k">{hasPlan ? '连续坚持' : '当前状态'}</div>
          <div className="hero-next-v num">
            {hasPlan ? streak(state.checkIns, total) : '待制定'}
            {hasPlan && <span style={{ fontSize: 'var(--t-sm)', fontWeight: 500, marginLeft: 4, opacity: .75 }}>天</span>}
          </div>
        </div>
      </section>

      {/* 只完整展示最新一条：留言会累积，两条长留言就能把「今日安排」挤出首屏 */}
      {guidances.length > 0 && (
        <div className="stack" style={{ gap: 12 }}>
          {(showAllMsgs ? guidances : guidances.slice(0, 1)).map((g) => (
            <article className="msg" key={g.id}>
              <span className="msg-avatar">{g.therapistName[0]}</span>
              <div>
                <div className="msg-who">{g.therapistName} 康复师</div>
                <Lines className="msg-body" text={g.text} />
                <div className="msg-time">
                  {new Date(g.at).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </article>
          ))}
          {guidances.length > 1 && (
            <button className="msg-more" onClick={() => setShowAllMsgs(!showAllMsgs)}>
              {showAllMsgs ? '收起早前留言' : `还有 ${guidances.length - 1} 条康复师留言`}
            </button>
          )}
        </div>
      )}

      <section className="card card-pad">
        <div className="card-hd">
          <div>
            <div className="eyebrow">今日安排</div>
            <h2 className="card-title">{hasPlan ? '按康复师制定的计划执行' : '尚未制定康复计划'}</h2>
          </div>
          <span style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Link to="/patient/videos" className="card-note" style={{ color: 'var(--green-700)', fontWeight: 550 }}>
              全部训练视频
            </Link>
            <span className="chip chip-brand num">{hasPlan ? `${done} / ${total}` : '待制定'}</span>
          </span>
        </div>

        <div className="timeline">
          {!hasPlan && (
            <div className="empty-chat">
              <div className="big">暂无今日安排</div>
              <div>康复师完成评估并制定计划后，训练和提醒会自动出现在这里。</div>
            </div>
          )}
          {rows.map(({ task, checkIn, status }) => {
            const isDone = status === 'done'
            const isNext = next?.task.id === task.id
            const video = task.videoId ? videos.find((v) => v.id === task.videoId) : undefined
            // 主操作按任务性质区分：服药是终态确认，训练要先看示范再打卡
            const main = task.kind === 'medication'
              ? { label: '确认已服药', run: () => setCheckIn(task.id, 'done') }
              : task.kind === 'record'
                ? { label: '已记录', run: () => setCheckIn(task.id, 'done') }
                : video
                  ? { label: '开始训练', run: () => nav(`/patient/videos/${video.id}`) }
                  : { label: '完成打卡', run: () => setCheckIn(task.id, 'done') }
            return (
              <div className="tl-item" key={task.id}>
                <span className={`tl-node${isDone ? ' tl-node-done' : ''}${isNext ? ' tl-node-now' : ''}`}>
                  {isDone && <IconCheck size={9} />}
                </span>
                <div className={`tl-card${isDone ? ' tl-card-done' : ''}${isNext ? ' tl-card-now' : ''}`}>
                  <time className="tl-time num">{task.scheduledTime}</time>
                  <span className="tl-ico">
                    {task.kind === 'medication'
                      ? <IconPill size={18} />
                      : task.kind === 'record'
                        ? <IconHeart size={18} />
                        : <IconActivity size={18} />}
                  </span>
                  <div>
                    <div className="tl-title">{task.title}</div>
                    <div className="tl-desc">
                      <span>{task.reps ?? task.instruction}</span>
                    </div>
                    {status === 'difficulty' && checkIn?.note && (
                      <div className="tl-desc" style={{ marginTop: 6, color: 'var(--wait)' }}>
                        已反馈：{checkIn.note} · 等待 {therapist.name} 康复师回复
                      </div>
                    )}
                  </div>

                  {/* 独立成列，各行的视频入口才会纵向对齐；无视频的行留空占位 */}
                  <div className="tl-video">
                    {video && (
                      <Link className="chip chip-link" to={`/patient/videos/${video.id}`}>
                        <IconPlay size={11} /> 看示范视频
                      </Link>
                    )}
                  </div>

                  <div className="tl-state">
                    {isDone && <span className="chip chip-ok"><IconCheck size={10} /> 已完成</span>}
                    {status === 'difficulty' && <span className="chip chip-wait"><IconAlert size={11} /> 已反馈困难</span>}
                    {status === 'missed' && <span className="chip chip-miss">未完成</span>}
                    {status === 'pending' && (isNext
                      ? <span className="chip chip-wait"><IconClock size={11} /> 即将开始</span>
                      : <span className="chip">未开始</span>)}
                  </div>

                  <div className="tl-actions">
                    {isDone ? (
                      <button className="btn-quiet" onClick={() => setCheckIn(task.id, 'pending')}>撤销</button>
                    ) : (
                      <>
                        {/* 求助入口固定在旁边，不藏 */}
                        <button className="btn-quiet" onClick={() => { setTroubleFor(troubleFor === task.id ? null : task.id); setNote('') }}>
                          遇到困难
                        </button>
                        <button className="btn" onClick={main.run}>{main.label}</button>
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
                      placeholder="例：做到一半就说累，左腿抬不起来。"
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

        <div className="safety">
          <span className="safety-i"><IconShield size={15} /></span>
          <span style={{ flex: 1 }}>
            如出现头晕、胸闷、恶心、呛咳加重等不适，请立即停止训练并联系康复师或就医。
          </span>
          <span className="safety-tel">服务电话 {SUPPORT_PHONE}</span>
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
        <span>{total ? done : '—'}{total > 0 && <small>/{total}</small>}</span>
      </div>
    </div>
  )
}

/** 连续全部完成的天数（今天未完成时从昨天起算） */
function streak(checkIns: { date: string; status: string }[], perDay: number) {
  if (perDay <= 0) return 0
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
