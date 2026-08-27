import { useMemo, useState } from 'react'
import { HOMECARE_START, taskDefs, toISODate } from '../data/seed'
import { effectiveStatus, useDemoState } from '../store/store'
import { IconCheck, IconChevron } from './Icons'

const WEEK = ['日', '一', '二', '三', '四', '五', '六']

/** norecord = 建档前或尚无记录的日子，必须与 none（有安排但一项没做）区分开 */
type State = 'out' | 'future' | 'full' | 'partial' | 'none' | 'norecord'

/** 打卡日历 —— 两端共用，保证家属与康复师看到的是同一套判定 */
export function CheckinCalendar() {
  const state = useDemoState()
  const today = new Date()
  const todayKey = toISODate(today)
  const [view, setView] = useState({ y: today.getFullYear(), m: today.getMonth() })
  const [selected, setSelected] = useState<string | null>(todayKey)

  /** 可翻阅的最早月份：居家康复建档当月 */
  const startKey = HOMECARE_START
  const start = new Date(startKey)
  const minIdx = start.getFullYear() * 12 + start.getMonth()
  const maxIdx = today.getFullYear() * 12 + today.getMonth()
  const viewIdx = view.y * 12 + view.m
  const canPrev = viewIdx > minIdx
  const canNext = viewIdx < maxIdx
  const isThisMonth = viewIdx === maxIdx

  function step(d: number) {
    const i = Math.min(maxIdx, Math.max(minIdx, viewIdx + d))
    setView({ y: Math.floor(i / 12), m: i % 12 })
    setSelected(null)
  }

  const { cells, tracked, allDone } = useMemo(() => {
    const { y, m } = view
    const lead = new Date(y, m, 1).getDay()
    const days = new Date(y, m + 1, 0).getDate()
    const total = taskDefs.length
    const out: { key: string; day: number; state: State; done: number }[] = []

    for (let i = 0; i < lead; i++) {
      const d = new Date(y, m, i - lead + 1)
      out.push({ key: toISODate(d), day: d.getDate(), state: 'out', done: 0 })
    }
    for (let day = 1; day <= days; day++) {
      const key = toISODate(new Date(y, m, day))
      const hits = state.checkIns.filter((c) => c.date === key)
      const done = hits.filter((c) => c.status === 'done').length
      let st: State
      let d = done
      if (key > todayKey) st = 'future'
      else if (key < startKey) st = 'norecord'
      else if (key === todayKey) {
        // 今天必须与今日页同一判定，否则两处会各说各话
        const eff = taskDefs.map((t) => effectiveStatus(t, hits.find((c) => c.taskId === t.id)))
        d = eff.filter((x) => x === 'done').length
        st = d >= total ? 'full' : d === 0 ? 'none' : 'partial'
      } else if (hits.length === 0) st = 'norecord'
      else st = done >= total ? 'full' : done === 0 ? 'none' : 'partial'
      out.push({ key, day, state: st, done: d })
    }
    // 补足末行：偏移必须从 1 递增。曾误用 out.length % 7 作偏移，
    // 8 月排到第 37 格时 37 % 7 = 2，于是从次月 2 号补起，1 号被跳过。
    let tail = 1
    while (out.length % 7 !== 0) {
      const d = new Date(y, m, days + tail)
      out.push({ key: toISODate(d), day: d.getDate(), state: 'out', done: 0 })
      tail++
    }
    const t = out.filter((c) => ['full', 'partial', 'none'].includes(c.state))
    return { cells: out, tracked: t.length, allDone: t.filter((c) => c.state === 'full').length }
  }, [view, state.checkIns, todayKey, startKey])

  const detail = selected
    ? taskDefs.map((t) => {
        const hit = state.checkIns.find((c) => c.date === selected && c.taskId === t.id)
        const status = selected === todayKey ? effectiveStatus(t, hit) : hit?.status ?? 'missed'
        return { task: t, status, hasRecord: !!hit }
      })
    : []
  const selectedHasRecord = detail.some((d) => d.hasRecord) || selected === todayKey

  return (
    <div className="stack">
      <section className="card card-pad">
        <div className="card-hd">
          <div>
            <div className="eyebrow">坚持记录</div>
            <h2 className="card-title num">{view.y} 年 {view.m + 1} 月</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="card-note num">本月全部完成 {allDone} / {tracked} 天</span>
            <div className="mnav">
              <button onClick={() => step(-1)} disabled={!canPrev} aria-label="上个月">
                <span style={{ transform: 'rotate(180deg)', display: 'grid' }}><IconChevron size={15} /></span>
              </button>
              <button onClick={() => step(1)} disabled={!canNext} aria-label="下个月">
                <IconChevron size={15} />
              </button>
            </div>
            {!isThisMonth && (
              <button className="btn-quiet" onClick={() => { setView({ y: today.getFullYear(), m: today.getMonth() }); setSelected(todayKey) }}>
                回到本月
              </button>
            )}
          </div>
        </div>

        <div className="cal-hd">{WEEK.map((w) => <span key={w}>{w}</span>)}</div>
        <div className="cal">
          {cells.map((c, i) => {
            const clickable = ['full', 'partial', 'none'].includes(c.state)
            return (
              <div
                className="cell"
                key={c.key + i}
                data-state={c.state}
                data-today={c.key === todayKey}
                data-selected={c.key === selected}
                data-clickable={clickable}
                onClick={() => clickable && setSelected(c.key)}
              >
                <span className="cell-d num">{c.day}</span>
                <span className="cell-mark">
                  {c.state === 'full' && <IconCheck size={12} />}
                  {c.state === 'partial' && <span className="num">缺 {taskDefs.length - c.done}</span>}
                  {c.state === 'none' && <span>未完成</span>}
                </span>
              </div>
            )
          })}
        </div>

        <div className="legend">
          <span><i style={{ background: 'var(--ok-bg)' }} />全部完成</span>
          <span><i style={{ background: 'var(--wait-bg)' }} />部分完成</span>
          <span><i style={{ background: 'var(--miss-bg)' }} />未完成</span>
          <span><i style={{ background: 'var(--surface-2)' }} />无记录</span>
          <span><i style={{ background: 'transparent', border: '1px dashed var(--line-2)' }} />未到</span>
        </div>
      </section>

      {selected && selectedHasRecord && (
        <section className="card card-pad">
          <div className="card-hd">
            <h2 className="card-title" style={{ fontSize: 'var(--t-md)' }}>
              {selected === todayKey ? '今天' : selected} 的执行情况
            </h2>
          </div>
          <table className="tbl">
            <thead><tr><th>时间</th><th>项目</th><th style={{ textAlign: 'right' }}>状态</th></tr></thead>
            <tbody>
              {detail.map(({ task, status }) => (
                <tr key={task.id}>
                  <td className="num" style={{ color: 'var(--ink-2)', fontWeight: 600 }}>{task.scheduledTime}</td>
                  <td style={{ fontWeight: 550 }}>{task.title}</td>
                  <td style={{ textAlign: 'right' }}>
                    {status === 'done'
                      ? <span className="chip chip-ok"><IconCheck size={10} /> 已完成</span>
                      : status === 'difficulty'
                        ? <span className="chip chip-wait">已反馈困难</span>
                        : status === 'missed'
                          ? <span className="chip chip-miss">未完成</span>
                          : <span className="chip">待完成</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  )
}
