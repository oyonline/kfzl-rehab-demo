import { useState } from 'react'
import { patient, therapist } from '../../data/seed'
import { addGuidance, useDemoState } from '../../store/store'
import { IconSend } from '../../components/Icons'

export function GuidanceLogView() {
  const state = useDemoState()
  const [draft, setDraft] = useState('')
  const list = [...state.guidances].reverse()

  return (
    <div className="stack">
      <section className="card card-pad">
        <div className="card-hd">
          <div>
            <div className="eyebrow">远程指导</div>
            <h2 className="card-title">给家属的指导意见</h2>
          </div>
          <span className="card-note">提交后 {patient.caregiver.name} 立即可见</span>
        </div>

        <textarea
          className="ta" rows={3} value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="例：今天吞咽训练完成得很好，明天可把空吞咽增加到 15 次；若再出现呛咳，先暂停并告诉我。"
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
          <button className="btn" disabled={!draft.trim()} onClick={() => { addGuidance(draft.trim(), therapist.name); setDraft('') }}>
            <IconSend size={13} /> 发送给家属
          </button>
        </div>
      </section>

      <section className="card card-pad">
        <div className="card-hd">
          <h2 className="card-title" style={{ fontSize: 'var(--t-md)' }}>历史指导</h2>
          <span className="card-note num">共 {list.length} 条</span>
        </div>
        {list.length === 0 ? (
          <div className="empty-chat"><div className="big">还没有发出指导</div></div>
        ) : (
          <ul style={{ display: 'grid', gap: 10 }}>
            {list.map((g) => (
              <li key={g.id} style={{ padding: '14px 16px', background: 'var(--surface-2)', borderRadius: 'var(--r)' }}>
                <div style={{ fontSize: 'var(--t-sm)' }}>{g.text}</div>
                <div style={{ fontSize: 'var(--t-xs)', color: 'var(--ink-4)', marginTop: 6 }}>
                  {new Date(g.at).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  {' · '}
                  <span style={{ color: g.readByFamily ? 'var(--ok)' : undefined }}>{g.readByFamily ? '家属已读' : '已送达'}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
