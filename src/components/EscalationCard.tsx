import { useState } from 'react'
import { patient, taskDefs, therapist } from '../data/seed'
import { answerEscalation } from '../store/store'
import type { Escalation } from '../data/types'
import { IconAlert, IconSend } from './Icons'
import { Lines } from './Lines'

/** 待处理咨询卡 —— 全局待处理页与患者咨询页共用 */
export function EscalationCard({ esc }: { esc: Escalation }) {
  const [draft, setDraft] = useState('')
  const task = esc.taskId ? taskDefs.find((t) => t.id === esc.taskId) : undefined

  return (
    <article className="esc-card">
      <div className="esc-hd">
        <span className="chip chip-wait">
          <IconAlert size={11} /> {esc.source === 'task' ? '训练困难' : '对话转人工'}
        </span>
        <span className="card-note num">
          {new Date(esc.at).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      <Lines className="esc-q" text={esc.question} />

      <div className="basis" style={{ marginTop: 10 }}>
        <b>上下文</b>
        {[...esc.context, ...(task ? [`${task.scheduledTime} ${task.title}`] : [])].map((c) => (
          <span className="chip" key={c} style={{ padding: '2px 9px' }}>{c}</span>
        ))}
      </div>

      <textarea
        className="ta" rows={2} style={{ marginTop: 14 }}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={`回复 ${patient.caregiver.name}，内容会直接出现在家属的对话里`}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
        <button
          className="btn"
          disabled={!draft.trim()}
          onClick={() => { answerEscalation(esc.id, draft.trim(), therapist.name); setDraft('') }}
        >
          <IconSend size={13} /> 回复家属
        </button>
      </div>
    </article>
  )
}
