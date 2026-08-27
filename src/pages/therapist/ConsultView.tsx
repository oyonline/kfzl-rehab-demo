import { useState } from 'react'
import { patient, taskDefs, therapist } from '../../data/seed'
import { answerEscalation, pendingEscalations, useDemoState } from '../../store/store'
import { IconAlert, IconChat, IconSend, IconUser } from '../../components/Icons'

/**
 * 咨询记录 —— 补齐此前缺失的两条链路：
 * 1. 家属问了什么、AI 怎么答的，康复师必须看得到（v0.2 §4.1 第 9 条）；
 * 2. 家属点「转康复师」后要在这里形成待处理项，否则那个按钮是死的。
 */
export function ConsultView() {
  const state = useDemoState()
  const pending = pendingEscalations(state)
  const [drafts, setDrafts] = useState<Record<string, string>>({})

  return (
    <div className="stack">
      <section className="card card-pad">
        <div className="card-hd">
          <div>
            <div className="eyebrow">待处理</div>
            <h2 className="card-title">
              转来的咨询{pending.length > 0 && <span className="chip chip-miss" style={{ marginLeft: 10 }}>{pending.length}</span>}
            </h2>
          </div>
          <span className="card-note">AI 无法安全回答或家属主动转人工的问题</span>
        </div>

        {pending.length === 0 ? (
          <div className="empty-chat">
            <div className="big">暂无待处理咨询</div>
            <div>家属在对话里点「转康复师」，或在任务上反馈困难，都会出现在这里</div>
          </div>
        ) : (
          <div className="stack" style={{ gap: 14 }}>
            {pending.map((e) => {
              const task = e.taskId ? taskDefs.find((t) => t.id === e.taskId) : undefined
              return (
                <article className="esc-card" key={e.id}>
                  <div className="esc-hd">
                    <span className="chip chip-wait">
                      <IconAlert size={11} /> {e.source === 'task' ? '训练困难' : '对话转人工'}
                    </span>
                    <span className="card-note num">
                      {new Date(e.at).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="esc-q">{e.question}</div>
                  <div className="basis" style={{ marginTop: 10 }}>
                    <b>上下文</b>
                    {[...e.context, ...(task ? [`${task.scheduledTime} ${task.title}`] : [])].map((c) => (
                      <span className="chip" key={c} style={{ padding: '2px 9px' }}>{c}</span>
                    ))}
                  </div>
                  <textarea
                    className="ta" rows={2} style={{ marginTop: 14 }}
                    value={drafts[e.id] ?? ''}
                    onChange={(ev) => setDrafts({ ...drafts, [e.id]: ev.target.value })}
                    placeholder={`回复 ${patient.caregiver.name}，内容会直接出现在家属的对话里`}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                    <button
                      className="btn"
                      disabled={!(drafts[e.id] ?? '').trim()}
                      onClick={() => {
                        answerEscalation(e.id, drafts[e.id].trim(), therapist.name)
                        setDrafts({ ...drafts, [e.id]: '' })
                      }}
                    >
                      <IconSend size={13} /> 回复家属
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      <section className="card card-pad">
        <div className="card-hd">
          <div>
            <div className="eyebrow">全部记录</div>
            <h2 className="card-title">家属提问与 AI 回复</h2>
          </div>
          <span className="card-note num">共 {state.messages.length} 条</span>
        </div>

        {state.messages.length === 0 ? (
          <div className="empty-chat"><div className="big">还没有咨询记录</div></div>
        ) : (
          <div className="chat-body">
            {state.messages.map((m) => {
              const isFamily = m.role === 'family'
              return (
                <div className="bub-row" data-me={isFamily} key={m.id}>
                  {!isFamily && (
                    <span className="bub-av" style={m.role === 'therapist' ? undefined : { background: 'var(--surface-3)', color: 'var(--ink-2)' }}>
                      {m.role === 'therapist' ? therapist.name[0] : <IconChat size={16} />}
                    </span>
                  )}
                  <div className={`bub ${isFamily ? 'bub-me' : 'bub-ai'}`}>
                    <div style={{ fontSize: 'var(--t-xs)', opacity: .7, marginBottom: 5 }}>
                      {isFamily ? patient.caregiver.name : m.role === 'therapist' ? `${therapist.name} 康复师` : 'AI 助手'}
                      {' · '}
                      {new Date(m.at).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                    {m.text.split('\n').map((line, i) => <p key={i}>{line.replace(/\*\*/g, '')}</p>)}
                  </div>
                  {isFamily && <span className="bub-av" style={{ background: 'var(--surface-3)', color: 'var(--ink-2)' }}><IconUser size={16} /></span>}
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
