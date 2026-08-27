import { Link } from 'react-router-dom'
import { PATIENT_ID, roster, toISODate } from '../../data/seed'
import { effectiveStatus, pendingEscalations, todayCheckIns, useDemoState } from '../../store/store'
import { IconAlert, IconChat, IconPlay, IconUser } from '../../components/Icons'

/** 工作台首页 —— 先看在管患者，再点进具体患者 */
export function PatientListView() {
  const state = useDemoState()
  const today = toISODate(new Date())
  const rows = todayCheckIns(state, today)
  const doneToday = rows.filter((r) => effectiveStatus(r.task, r.checkIn) === 'done').length
  const pending = pendingEscalations(state)
  const uploadsToday = state.uploads.filter((u) => u.date === today).length

  const list = roster.map((r) =>
    r.id === PATIENT_ID
      ? {
          ...r,
          todayDone: doneToday,
          flag: pending.length > 0 ? `${pending.length} 条咨询待回复` : r.flag,
          hasUpload: uploadsToday > 0,
          open: true,
        }
      : { ...r, hasUpload: false, open: false },
  )

  const behind = list.filter((r) => r.todayDone < r.todayTotal).length

  return (
    <div className="stack">
      <section className="card card-pad">
        <div className="card-hd" style={{ marginBottom: 0 }}>
          <div>
            <div className="eyebrow">工作台</div>
            <h1 className="card-title" style={{ fontSize: 'var(--t-xl)' }}>在管患者</h1>
          </div>
        </div>

        <div className="stats" style={{ marginTop: 20 }}>
          <Stat k="在管患者" v={`${roster.length}`} unit="人" />
          <Stat k="今日未完成" v={`${behind}`} unit="人" tone={behind > 0 ? 'wait' : undefined} />
          <Stat k="待回复咨询" v={`${pending.length}`} unit="条" tone={pending.length > 0 ? 'miss' : undefined} />
          <Stat k="今日视频回传" v={`${uploadsToday}`} unit="条" />
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
            {list.map((r) => (
              <tr key={r.id} data-open={r.open}>
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
                  <span className={`chip ${r.todayDone >= r.todayTotal ? 'chip-ok' : 'chip-wait'} num`}>
                    {r.todayDone}/{r.todayTotal}
                  </span>
                </td>
                <td>
                  <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {r.flag && (
                      <span className="chip chip-miss">
                        {r.flag.includes('咨询') ? <IconChat size={11} /> : <IconAlert size={11} />} {r.flag}
                      </span>
                    )}
                    {r.hasUpload && <span className="chip chip-brand"><IconPlay size={10} /> 视频回传</span>}
                    {!r.flag && !r.hasUpload && <span style={{ color: 'var(--ink-4)' }}>—</span>}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  {r.open
                    ? <Link className="btn-quiet" to={`/therapist/patients/${r.id}`}><IconUser size={13} /> 查看详情</Link>
                    : <span style={{ color: 'var(--ink-4)', fontSize: 'var(--t-xs)' }}>另一位康复师主责</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
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
