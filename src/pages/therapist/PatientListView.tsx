import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { authFetch } from '../../auth/auth'
import { useNavigate } from 'react-router-dom'
import { IconAlert, IconChat, IconPlay, IconUser } from '../../components/Icons'

/**
 * 工作台首页 —— 先看在管患者，再点进具体患者。
 *
 * 这一页是**跨患者**的，因此不读 store（store 缓存是当前患者的），
 * 逐患者的今日完成数、待回复条数、血压超标、视频回传全部由服务端一次算好。
 * 拆成前端逐个请求的话，7 位患者就是 7 轮往返。
 */
interface Row {
  id: string
  name: string
  gender: string
  ageBand: string
  stage: string
  todayDone: number
  todayTotal: number
  pendingCount: number
  uploadsToday: number
  bpAlert: boolean
  canOpen: boolean
}

export function PatientListView() {
  const nav = useNavigate()
  const [list, setList] = useState<Row[] | null>(null)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const res = await authFetch('/api/patients')
        if (!res.ok) return
        const d = await res.json()
        if (alive) setList(d.patients ?? [])
      } catch { /* 会话失效由 authFetch 处理 */ }
    })()
    return () => { alive = false }
  }, [])

  if (!list) return <div className="stack" />

  const behind = list.filter((r) => r.todayDone < r.todayTotal).length
  const pendingTotal = list.reduce((n, r) => n + r.pendingCount, 0)
  const uploadsTotal = list.reduce((n, r) => n + r.uploadsToday, 0)

  return (
    <div className="stack">
      {creating && (
        <NewPatientForm
          onCancel={() => setCreating(false)}
          onCreated={(id) => nav(`/therapist/patients/${id}`)}
        />
      )}
      <section className="card card-pad">
        <div className="card-hd" style={{ marginBottom: 0 }}>
          <div>
            <div className="eyebrow">工作台</div>
            <h1 className="card-title" style={{ fontSize: 'var(--t-xl)' }}>在管患者</h1>
          </div>
          <button className="btn" onClick={() => setCreating(true)}>+ 新建档案</button>
        </div>

        <div className="stats" style={{ marginTop: 20 }}>
          <Stat k="在管患者" v={`${list.length}`} unit="人" />
          <Stat k="今日未完成" v={`${behind}`} unit="人" tone={behind > 0 ? 'wait' : undefined} />
          <Stat k="待回复咨询" v={`${pendingTotal}`} unit="条" tone={pendingTotal > 0 ? 'miss' : undefined} />
          <Stat k="今日视频回传" v={`${uploadsTotal}`} unit="条" />
        </div>
      </section>

      <section className="card card-pad">
        <table className="tbl ptable">
          <thead>
            <tr>
              <th>患者</th>
              <th>康复阶段</th>
              <th>今日完成</th>
              <th>需要关注</th>
              <th style={{ textAlign: 'right' }}></th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => {
              // 血压异常优先于咨询待回复 —— 前者是身体出状况，后者是沟通事项
              const flag = r.bpAlert
                ? '血压超出安全范围'
                : r.pendingCount > 0
                  ? `${r.pendingCount} 条咨询待回复`
                  : r.todayDone < r.todayTotal && r.todayTotal > 0
                    ? '今日尚未完成'
                    : ''
              return (
              <tr key={r.id} data-open={r.canOpen}>
                <td>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span className="who-dot" style={{ width: 34, height: 34 }}>{r.name[0]}</span>
                    <span>
                      <div style={{ fontWeight: 620 }}>{r.name}</div>
                      <div className="plist-meta">{r.gender} · {r.ageBand}</div>
                    </span>
                  </span>
                </td>
                <td style={{ color: 'var(--ink-2)' }}>{r.stage}</td>
                <td>
                  <span className={`chip ${r.todayDone >= r.todayTotal ? 'chip-ok' : ''} num`}>
                    {r.todayDone}/{r.todayTotal}
                  </span>
                </td>
                <td>
                  <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {flag && (() => {
                      // 红色只用于异常：血压超标与漏做属异常；待回复咨询属提醒
                      const abnormal = flag.includes('未完成') || flag.includes('血压')
                      return (
                        <span className={`chip ${abnormal ? 'chip-miss' : 'chip-wait'}`}>
                          {flag.includes('咨询') ? <IconChat size={11} /> : <IconAlert size={11} />} {flag}
                        </span>
                      )
                    })()}
                    {r.uploadsToday > 0 && <span className="chip chip-brand"><IconPlay size={10} /> 视频回传</span>}
                    {!flag && r.uploadsToday === 0 && <span style={{ color: 'var(--ink-4)' }}>—</span>}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  {r.canOpen
                    ? <Link className="btn-quiet" to={`/therapist/patients/${r.id}`}><IconUser size={13} /> 查看详情</Link>
                    : <span style={{ color: 'var(--ink-4)', fontSize: 'var(--t-xs)' }}>另一位康复师主责</span>}
                </td>
              </tr>
              )
            })}
          </tbody>
        </table>
      </section>
    </div>
  )
}

/**
 * 建档表单。
 *
 * 只收身份与照护信息 —— 诊断、评估、用药、康复计划都必须由专业人员
 * 按实际情况录入，本表单不代为生成任何医学内容（沿用项目一贯边界）。
 */
function NewPatientForm({ onCancel, onCreated }: { onCancel: () => void; onCreated: (id: string) => void }) {
  const [f, setF] = useState({ name: '', gender: '女', ageBand: '', stage: '', caregiverName: '', caregiverRelation: '' })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })

  async function submit() {
    if (!f.name.trim() || busy) return
    setBusy(true); setErr('')
    try {
      const res = await authFetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(f),
      })
      const d = await res.json()
      if (!res.ok) { setErr(d.message ?? '建档失败'); return }
      onCreated(d.id)
    } catch {
      setErr('无法连接服务端')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card card-pad">
      <div className="card-hd">
        <div>
          <div className="eyebrow">建档</div>
          <h2 className="card-title">新建患者档案</h2>
        </div>
        <span className="card-note">诊断、评估与康复计划建档后再由您逐项录入</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, marginTop: 16 }}>
        <label className="field"><span>姓名</span>
          <input value={f.name} onChange={set('name')} placeholder="如：李奶奶" disabled={busy} /></label>
        <label className="field"><span>性别</span>
          <select className="ta" value={f.gender} onChange={set('gender')} disabled={busy} style={{ height: 42 }}>
            <option value="女">女</option><option value="男">男</option>
          </select></label>
        <label className="field"><span>年龄段</span>
          <input value={f.ageBand} onChange={set('ageBand')} placeholder="如：78 岁" disabled={busy} /></label>
        <label className="field"><span>康复阶段</span>
          <input value={f.stage} onChange={set('stage')} placeholder="如：居家康复·准备期" disabled={busy} /></label>
        <label className="field"><span>主要照护人</span>
          <input value={f.caregiverName} onChange={set('caregiverName')} placeholder="如：李女士" disabled={busy} /></label>
        <label className="field"><span>与患者关系</span>
          <input value={f.caregiverRelation} onChange={set('caregiverRelation')} placeholder="如：女儿" disabled={busy} /></label>
      </div>
      {err && <p style={{ color: 'var(--miss)', fontSize: 'var(--t-sm)', marginTop: 10 }}>{err}</p>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
        <button className="btn-quiet" onClick={onCancel} disabled={busy}>取消</button>
        <button className="btn" onClick={() => { void submit() }} disabled={!f.name.trim() || busy}>
          {busy ? '建档中…' : '建档'}
        </button>
      </div>
    </section>
  )
}

function Stat({ k, v, unit, tone }: { k: string; v: string; unit?: string; tone?: 'wait' | 'miss' }) {
  return (
    <div className="stat">
      <div className="stat-k">{k}</div>
      <div className="stat-v num" style={tone ? { color: tone === 'miss' ? 'var(--miss)' : 'var(--wait)' } : undefined}>
        {v}{unit && <small>{unit}</small>}
      </div>
    </div>
  )
}
