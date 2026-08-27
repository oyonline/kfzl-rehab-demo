import { useEffect, useRef, useState } from 'react'
import { FALLBACK_ANSWER, PRESET_QA, type PresetQA } from '../../data/qa'
import { patient, therapist } from '../../data/seed'
import { addMessage, createEscalation, useDemoState } from '../../store/store'
import { IconChat, IconSend, IconUser } from '../../components/Icons'

/** **加粗** 的极简渲染，避免为一处强调引入 markdown 依赖 */
function RichText({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g)
  return <p>{parts.map((s, i) => (i % 2 ? <strong key={i}>{s}</strong> : s))}</p>
}

export function ChatView() {
  const state = useDemoState()
  const [draft, setDraft] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  const messages = state.messages

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [messages.length])

  function reply(q: PresetQA | null, asked: string) {
    addMessage({ role: 'family', text: asked })
    const a = q ?? FALLBACK_ANSWER
    window.setTimeout(() => {
      addMessage({
        role: 'ai',
        text: a.answer.join('\n'),
        answerSource: 'preset_fallback',
        basis: a.basis,
        escalated: a.escalate,
      })
    }, 420)
  }

  const unasked = PRESET_QA.filter((q) => !messages.some((m) => m.role === 'family' && m.text === q.question))

  return (
    <section className="card card-pad chat">
      <div className="card-hd">
        <div>
          <div className="eyebrow">康复咨询</div>
          <h2 className="card-title">结合 {patient.name} 的档案作答</h2>
        </div>
        <span className="card-note">复杂问题会转交 {therapist.name} 康复师</span>
      </div>

      <div className="chat-body">
        {messages.length === 0 && (
          <div className="empty-chat">
            <div className="big">有什么想问的？</div>
            <div>回答会结合她的诊断、当前康复阶段和康复师确认的计划</div>
          </div>
        )}

        {messages.map((m) => {
          const isMe = m.role === 'family'
          const isTherapist = m.role === 'therapist'
          const q = PRESET_QA.find((x) => x.answer.join('\n') === m.text)
          const hint = q?.escalateHint ?? FALLBACK_ANSWER.escalateHint
          return (
            <div className="bub-row" data-me={isMe} key={m.id}>
              {/* 必须一眼分清 AI 与康复师：产品主张是 AI 不取代专业人员，
                  两者外观相同的话这条主张在界面上就不成立 */}
              {!isMe && (
                <span className={`bub-av${isTherapist ? ' bub-av-th' : ''}`}>
                  {isTherapist ? therapist.name[0] : <IconChat size={17} />}
                </span>
              )}
              <div className={`bub ${isMe ? 'bub-me' : isTherapist ? 'bub-th' : 'bub-ai'}`}>
                {!isMe && (
                  <div className="bub-who">
                    {isTherapist
                      ? <><span className="bub-tag bub-tag-th">康复师</span>{therapist.name} · {therapist.title}</>
                      : <><span className="bub-tag">AI</span>智能助手 · 依据她的康复档案作答</>}
                  </div>
                )}
                {m.text.split('\n').map((line, i) => <RichText key={i} text={line} />)}

                {!isMe && m.basis && (
                  <div className="basis">
                    <b>依据</b>
                    {m.basis.map((b) => <span className="chip" key={b} style={{ padding: '2px 9px' }}>{b}</span>)}
                  </div>
                )}

                {!isMe && m.escalated && (() => {
                  const asked = messages.find((x) => x.role === 'family' && x.at < m.at)
                  const question = [...messages].reverse().find((x) => x.role === 'family' && x.at <= m.at)?.text ?? asked?.text ?? ''
                  const sent = state.escalations.some((e) => e.question === question)
                  return (
                    <div className="escalate">
                      <span style={{ flex: 1 }}>{sent ? `已转交 ${therapist.name} 康复师，回复会显示在这里` : hint}</span>
                      {!sent && (
                        <button className="btn" onClick={() => createEscalation({
                          source: 'chat',
                          question,
                          context: m.basis ?? [],
                        })}>转康复师</button>
                      )}
                    </div>
                  )
                })()}
              </div>
              {isMe && <span className="bub-av" style={{ background: 'var(--surface-3)', color: 'var(--ink-2)' }}><IconUser size={16} /></span>}
            </div>
          )
        })}
        <div ref={endRef} />
      </div>

      <div style={{ marginTop: 20 }}>
        {unasked.length > 0 && (
          <div className="suggests">
            {unasked.map((q) => (
              <button className="suggest" key={q.id} onClick={() => reply(q, q.question)}>{q.question}</button>
            ))}
          </div>
        )}

        <div className="composer">
          <textarea
            className="ta"
            rows={2}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && draft.trim()) {
                e.preventDefault()
                reply(PRESET_QA.find((q) => q.question === draft.trim()) ?? null, draft.trim())
                setDraft('')
              }
            }}
            placeholder="输入您想问的问题…"
          />
          <button
            className="btn btn-lg"
            disabled={!draft.trim()}
            onClick={() => { reply(PRESET_QA.find((q) => q.question === draft.trim()) ?? null, draft.trim()); setDraft('') }}
          >
            <IconSend size={14} /> 发送
          </button>
        </div>
      </div>
    </section>
  )
}
