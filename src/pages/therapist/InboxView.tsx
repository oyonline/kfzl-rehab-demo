import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { authFetch } from '../../auth/auth'
import type { Escalation } from '../../data/types'
import { EscalationCard } from '../../components/EscalationCard'
import { Lines } from '../../components/Lines'

/**
 * 全局待处理 —— 跨患者的待回复咨询集中在这里。
 *
 * 这一页**不属于任何单个患者**，因此不走 PatientProvider，也不读 store
 * （store 的缓存是当前患者的）。直接问接口要跨患者数据。
 */
interface InboxItem extends Escalation {
  patientName: string
  caregiverName: string
  caregiverRelation: string
  taskLabel?: string
}

export function InboxView() {
  const [pending, setPending] = useState<InboxItem[]>([])
  const [answered, setAnswered] = useState<InboxItem[]>([])
  const [loaded, setLoaded] = useState(false)

  const reload = useCallback(async () => {
    try {
      const res = await authFetch('/api/patients/inbox/pending')
      if (!res.ok) return
      const d = await res.json()
      setPending(d.escalations ?? [])
      setAnswered(d.answered ?? [])
    } catch { /* 会话失效由 authFetch 处理 */ } finally {
      setLoaded(true)
    }
  }, [])

  useEffect(() => { void reload() }, [reload])

  if (!loaded) return <div className="stack" />

  return (
    <div className="stack">
      <section className="card card-pad">
        <div className="card-hd">
          <div>
            <div className="eyebrow">待处理</div>
            <h1 className="card-title" style={{ fontSize: 'var(--t-xl)' }}>
              待回复咨询{pending.length > 0 && <span className="chip chip-wait" style={{ marginLeft: 10 }}>{pending.length}</span>}
            </h1>
          </div>
          <span className="card-note">AI 无法安全回答，或家属主动转人工的问题</span>
        </div>

        {pending.length === 0 ? (
          <div className="empty-chat">
            <div className="big">暂无待处理咨询</div>
            <div>家属在对话里点「转康复师」，或在任务上反馈困难，都会出现在这里</div>
          </div>
        ) : (
          <div className="stack" style={{ gap: 14 }}>
            {pending.map((e) => (
              <div key={e.id}>
                <div className="card-note" style={{ marginBottom: 8 }}>
                  来自 <Link to={`/therapist/patients/${e.patientId}`} style={{ color: 'var(--green-700)', fontWeight: 600 }}>{e.patientName}</Link>
                  {e.caregiverName && <>{' · '}{e.caregiverName}（{e.caregiverRelation}）</>}
                </div>
                <EscalationCard
                  esc={e}
                  ctx={{ patientId: e.patientId, caregiverName: e.caregiverName, taskLabel: e.taskLabel }}
                  onAnswered={() => { void reload() }}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {answered.length > 0 && (
        <section className="card card-pad">
          <div className="card-hd">
            <h2 className="card-title" style={{ fontSize: 'var(--t-md)' }}>已回复</h2>
            <span className="card-note num">共 {answered.length} 条</span>
          </div>
          <ul style={{ display: 'grid', gap: 10 }}>
            {answered.map((e) => (
              <li key={e.id} style={{ padding: '14px 16px', background: 'var(--surface-2)', borderRadius: 'var(--r)' }}>
                <div style={{ fontSize: 'var(--t-sm)', fontWeight: 550 }}>{e.question}</div>
                <Lines text={e.answer ?? ''} className="lines-sm lines-ink2" />
                <div style={{ fontSize: 'var(--t-xs)', color: 'var(--ink-4)', marginTop: 6 }}>
                  {e.patientName} · {e.therapistName} · {e.answeredAt && new Date(e.answeredAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
