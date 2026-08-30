import { usePatientData } from '../../data/context'
import { pendingEscalations, useDemoState } from '../../store/store'
import { IconChat, IconUser } from '../../components/Icons'
import { EscalationCard } from '../../components/EscalationCard'

/**
 * 咨询记录 —— 补齐此前缺失的两条链路：
 * 1. 家属问了什么、AI 怎么答的，康复师必须看得到（v0.2 §4.1 第 9 条）；
 * 2. 家属点「转康复师」后要在这里形成待处理项，否则那个按钮是死的。
 */
export function ConsultView() {
  const { patient, therapist } = usePatientData()
  const state = useDemoState()
  const pending = pendingEscalations(state)

  return (
    <div className="stack">
      <section className="card card-pad">
        <div className="card-hd">
          <div>
            <div className="eyebrow">待处理</div>
            <h2 className="card-title">
              转来的咨询{pending.length > 0 && <span className="chip chip-wait" style={{ marginLeft: 10 }}>{pending.length}</span>}
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
            {pending.map((e) => <EscalationCard esc={e} key={e.id} />)}
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
                    <span className={`bub-av${m.role === 'therapist' ? ' bub-av-th' : ''}`}
                          style={m.role === 'therapist' ? undefined : { background: 'var(--surface-3)', color: 'var(--ink-2)' }}>
                      {m.role === 'therapist' ? therapist.name[0] : <IconChat size={16} />}
                    </span>
                  )}
                  <div className={`bub ${isFamily ? 'bub-me' : m.role === 'therapist' ? 'bub-th' : 'bub-ai'}`}>
                    <div className="bub-who">
                      {isFamily
                        ? patient.caregiver.name
                        : m.role === 'therapist'
                          ? <><span className="bub-tag bub-tag-th">康复师</span>{therapist.name}</>
                          : <><span className="bub-tag">AI</span>智能助手</>}
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
