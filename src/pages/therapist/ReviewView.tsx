import { useCallback, useEffect, useState } from 'react'
import { authFetch } from '../../auth/auth'
import { IconAlert, IconFile } from '../../components/Icons'
import { Lines } from '../../components/Lines'

/**
 * 内容审核后台（P6）。
 *
 * 解决的是一条卡了很久的红线：qa.ts / guidance.ts / videoSteps.ts 三个文件
 * 头上挂着 `⚠️ REVIEW REQUIRED`，而「审核」在此之前意味着改源码 + 重新部署
 * —— 康复专业人员做不到，红线只能一直悬着。现在他们能在页面上逐条批或驳。
 *
 * 只是工具。**审核本身仍须由康复专业人员完成**，页面不替任何人背书。
 */

type Status = 'pending' | 'approved' | 'rejected'
type Kind = 'kb' | 'preset_qa' | 'guidance' | 'video_steps'

interface Item {
  id: string
  title: string
  reviewStatus: Status
  reviewer?: string
  reviewedAt?: string
  body?: string[]
  extra?: string[]
  note?: string
  /** 仅知识库语料有：来源等级与出处 */
  provenance?: 'attributed' | 'unattributed' | 'ai_flagged'
  sourceLabel?: string
  collectionName?: string
}

const TABS: { kind: Kind; label: string; source: string }[] = [
  { kind: 'kb', label: '知识库语料', source: '甲方交付的 57 篇科普与政策' },
  { kind: 'preset_qa', label: '咨询预设答案', source: 'src/data/qa.ts' },
  { kind: 'guidance', label: '饮食指导', source: 'src/data/guidance.ts' },
  { kind: 'video_steps', label: '训练分步说明', source: 'src/data/videoSteps.ts' },
]

const PROV_LABEL: Record<string, { text: string; cls: string }> = {
  attributed: { text: '来源可追溯', cls: 'chip-ok' },
  unattributed: { text: '无署名', cls: 'chip-wait' },
  ai_flagged: { text: '含 AI 生成标注', cls: 'chip-miss' },
}

const STATUS_LABEL: Record<Status, { text: string; cls: string }> = {
  pending: { text: '待审', cls: 'chip-wait' },
  approved: { text: '已通过', cls: 'chip-ok' },
  rejected: { text: '已驳回', cls: 'chip-miss' },
}

export function ReviewView() {
  const [tab, setTab] = useState<Kind>('kb')
  const [items, setItems] = useState<Item[] | null>(null)
  const [summary, setSummary] = useState<Record<string, Record<string, number>>>({})
  const [audit, setAudit] = useState<any[] | null>(null)
  const [showAudit, setShowAudit] = useState(false)
  const [onlyPending, setOnlyPending] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const loadSummary = useCallback(async () => {
    try {
      const r = await authFetch('/api/review/summary')
      if (r.ok) setSummary(await r.json())
    } catch { /* 会话失效由 authFetch 处理 */ }
  }, [])

  const loadItems = useCallback(async (k: Kind) => {
    setItems(null)
    try {
      if (k === 'kb') {
        const r = await authFetch('/api/kb/documents')
        if (!r.ok) return
        const d = await r.json()
        setItems(d.documents.map((x: any) => ({
          id: x.id, title: x.title, reviewStatus: x.reviewStatus,
          provenance: x.provenance, sourceLabel: x.sourceLabel,
          collectionName: x.collectionName,
          note: `${x.chunks} 个切片 · ${x.charCount} 字`,
        })))
      } else {
        const r = await authFetch(`/api/review/items?kind=${k}`)
        if (!r.ok) return
        setItems((await r.json()).items)
      }
    } catch { /* 同上 */ }
  }, [])

  useEffect(() => { void loadSummary() }, [loadSummary])
  useEffect(() => { void loadItems(tab) }, [tab, loadItems])

  async function setStatus(item: Item, status: Status) {
    setBusyId(item.id)
    try {
      const url = tab === 'kb'
        ? `/api/kb/documents/${item.id}`
        : `/api/review/items/${tab}/${item.id}`
      const r = await authFetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewStatus: status }),
      })
      if (!r.ok) return
      setItems((prev) => prev?.map((x) => (x.id === item.id ? { ...x, reviewStatus: status } : x)) ?? prev)
      void loadSummary()
      // 顶栏角标只在换页时重取，同页审核不会更新 —— 广播一下让它跟着降
      window.dispatchEvent(new CustomEvent('kfzl:review-changed'))
      if (showAudit) void loadAudit()
    } finally {
      setBusyId(null)
    }
  }

  const loadAudit = useCallback(async () => {
    try {
      const r = await authFetch('/api/review/audit?limit=80')
      if (r.ok) setAudit((await r.json()).entries)
    } catch { /* 同上 */ }
  }, [])

  const counts = summary[tab === 'kb' ? 'kb_documents' : tab] ?? {}
  const pendingTotal = Object.entries(summary).reduce((n, [, v]) => n + (v.pending ?? 0), 0)
  const shown = items?.filter((i) => !onlyPending || i.reviewStatus === 'pending') ?? null

  return (
    <div className="stack">
      <section className="card card-pad">
        <div className="card-hd">
          <div>
            <div className="eyebrow">内容审核</div>
            <h1 className="card-title" style={{ fontSize: 'var(--t-xl)' }}>
              待审内容
              {pendingTotal > 0 && <span className="chip chip-wait" style={{ marginLeft: 10 }}>{pendingTotal}</span>}
            </h1>
          </div>
          <button className="btn-quiet" onClick={() => { setShowAudit(!showAudit); if (!audit) void loadAudit() }}>
            <IconFile size={13} /> {showAudit ? '收起审核记录' : '查看审核记录'}
          </button>
        </div>

        <div className="review-notice">
          <IconAlert size={14} />
          <span>
            本页只是工具。<b>医疗性内容仍须由康复专业人员逐条审核</b>——通过与否由您判断，
            系统不替任何内容背书。驳回的内容立即停止对家属展示。
          </span>
        </div>

        <div className="nav" style={{ marginTop: 18, flexWrap: 'wrap' }}>
          {TABS.map((t) => {
            const c = summary[t.kind === 'kb' ? 'kb_documents' : t.kind]?.pending ?? 0
            return (
              <button
                key={t.kind}
                className={tab === t.kind ? 'active' : ''}
                onClick={() => setTab(t.kind)}
                title={t.source}
              >
                {t.label}
                {c > 0 && <span className="nav-badge num">{c}</span>}
              </button>
            )
          })}
        </div>
      </section>

      {showAudit && (
        <section className="card card-pad">
          <div className="card-hd">
            <h2 className="card-title" style={{ fontSize: 'var(--t-md)' }}>审核记录</h2>
            <span className="card-note">医疗内容的批准与驳回全部留痕，含操作人与时间</span>
          </div>
          {!audit ? <p className="card-note">读取中…</p> : audit.length === 0 ? (
            <p className="card-note">暂无记录</p>
          ) : (
            <ul className="audit-list">
              {audit.map((a) => (
                <li key={a.id}>
                  <span className="num" style={{ color: 'var(--ink-4)', fontSize: 'var(--t-xs)' }}>
                    {new Date(a.at).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span style={{ fontWeight: 560 }}>{a.who}</span>
                  <span style={{ color: 'var(--ink-3)' }}>{a.action}</span>
                  <span style={{ color: 'var(--ink-4)', fontSize: 'var(--t-xs)' }}>{a.entity} · {a.entityId}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="card card-pad">
        <div className="card-hd">
          <div>
            <h2 className="card-title" style={{ fontSize: 'var(--t-md)' }}>
              {TABS.find((t) => t.kind === tab)?.label}
            </h2>
            <p className="card-note" style={{ marginTop: 4 }}>
              待审 {counts.pending ?? 0} · 已通过 {counts.approved ?? 0} · 已驳回 {counts.rejected ?? 0}
            </p>
          </div>
          <label className="card-note" style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}>
            <input type="checkbox" checked={onlyPending} onChange={(e) => setOnlyPending(e.target.checked)} />
            只看待审
          </label>
        </div>

        {!shown ? <p className="card-note">读取中…</p> : shown.length === 0 ? (
          <div className="empty-chat">
            <div className="big">{onlyPending ? '没有待审内容' : '暂无内容'}</div>
            {onlyPending && <div>取消「只看待审」可查看已处理的条目</div>}
          </div>
        ) : (
          <div className="stack" style={{ gap: 12 }}>
            {shown.map((it) => (
              <article key={it.id} className="review-item">
                <div className="review-hd">
                  <span className="review-title">{it.title}</span>
                  <span style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    {it.provenance && (
                      <span className={`chip ${PROV_LABEL[it.provenance].cls}`}>{PROV_LABEL[it.provenance].text}</span>
                    )}
                    <span className={`chip ${STATUS_LABEL[it.reviewStatus].cls}`}>{STATUS_LABEL[it.reviewStatus].text}</span>
                  </span>
                </div>

                {it.sourceLabel && <p className="review-meta">{it.sourceLabel}</p>}
                {it.collectionName && <p className="review-meta">集合：{it.collectionName}</p>}
                {it.note && <p className="review-meta">{it.note}</p>}

                {it.extra && it.extra.length > 0 && (
                  <div className="review-body review-body-quiet">
                    <b>网络参考信息</b>
                    {it.extra.map((t, i) => <Lines key={i} text={t} className="lines-sm lines-ink2" />)}
                  </div>
                )}
                {it.body && it.body.length > 0 && (
                  <div className="review-body">
                    {it.body.map((t, i) => <Lines key={i} text={t} className="lines-sm lines-ink2" />)}
                  </div>
                )}

                <div className="review-act">
                  {it.reviewer && it.reviewedAt && (
                    <span className="card-note" style={{ flex: 1 }}>
                      {it.reviewer} · {new Date(it.reviewedAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                  <button className="btn-quiet" disabled={busyId === it.id || it.reviewStatus === 'rejected'}
                    onClick={() => { void setStatus(it, 'rejected') }}>驳回</button>
                  <button className="btn" disabled={busyId === it.id || it.reviewStatus === 'approved'}
                    onClick={() => { void setStatus(it, 'approved') }}>通过</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
