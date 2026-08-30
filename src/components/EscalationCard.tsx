import { useContext, useState } from 'react'
import { PatientCtx } from '../data/context'
import { answerEscalation, answerEscalationFor } from '../store/store'
import type { Escalation } from '../data/types'
import { IconAlert, IconSend } from './Icons'
import { Lines } from './Lines'

/**
 * 待处理咨询卡 —— 患者详情页与跨患者的待处理页共用。
 *
 * 两种上下文：
 * - 患者详情内：外层有 PatientProvider，直接取当前患者，回复走 store 乐观更新；
 * - 待处理页：工作台级，**没有**当前患者（这一页本来就是跨患者的），
 *   由调用方把该条咨询所属患者的信息传进来，回复直接打接口再刷新。
 *
 * 不硬性要求 Provider：那会逼着待处理页为每条咨询套一个 Provider，
 * 等于为渲染一张卡片把别人的完整档案全拉一遍。
 */
export interface EscalationCtx {
  patientId: string
  caregiverName: string
  taskLabel?: string
}

export function EscalationCard({ esc, ctx, onAnswered }: {
  esc: Escalation
  ctx?: EscalationCtx
  onAnswered?: () => void
}) {
  const pd = useContext(PatientCtx)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)

  const caregiverName = ctx?.caregiverName ?? pd?.patient.caregiver.name ?? '家属'
  const therapistName = pd?.therapist.name ?? ''
  const task = !ctx && pd && esc.taskId ? pd.taskDefs.find((t) => t.id === esc.taskId) : undefined
  const taskLabel = ctx?.taskLabel ?? (task ? `${task.scheduledTime} ${task.title}` : undefined)

  async function submit() {
    const text = draft.trim()
    if (!text || busy) return
    setBusy(true)
    try {
      if (ctx) {
        await answerEscalationFor(ctx.patientId, esc.id, text)
        onAnswered?.()
      } else {
        answerEscalation(esc.id, text, therapistName)
      }
      setDraft('')
    } finally {
      setBusy(false)
    }
  }

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
        {[...esc.context, ...(taskLabel ? [taskLabel] : [])].map((c) => (
          <span className="chip" key={c} style={{ padding: '2px 9px' }}>{c}</span>
        ))}
      </div>

      <textarea
        className="ta" rows={2} style={{ marginTop: 14 }}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={`回复 ${caregiverName}，内容会直接出现在家属的对话里`}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
        <button
          className="btn"
          disabled={!draft.trim() || busy}
          onClick={() => { void submit() }}
        >
          <IconSend size={13} /> {busy ? '发送中…' : '回复家属'}
        </button>
      </div>
    </article>
  )
}
