import { useState } from 'react'
import { taskDefs, toISODate } from '../data/seed'
import { effectiveStatus, useDemoState } from '../store/store'
import { IconCheck } from './Icons'

const WEEK = ['日', '一', '二', '三', '四', '五', '六']

type State = 'out' | 'future' | 'full' | 'partial' | 'none'

/** 打卡日历 —— 两端共用，保证家属与康复师看到的是同一套判定 */
export function CheckinCalendar() {
  const state = useDemoState()
  const today = new Date()
  const todayKey = toISODate(today)
  const [selected, setSelected] = useState<string | null>(todayKey)

  const y = today.getFullYear()
  const m = today.getMonth()
  const first = new Date(y, m, 1)
  const lead = first.getDay()
  const daysInMonth = new Date(y, m + 1, 0).getDate()
  const total = taskDefs.length

  const cells: { key: string; day: number; state: State }[] = []
  for (let i = 0; i < lead; i++) {
    const d = new Date(y, m, i - lead + 1)
    cells.push({ key: toISODate(d), day: d.getDate(), state: 'out' })
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(y, m, day)
    const key = toISODate(d)
    let st: State
    if (key > todayKey) st = 'future'
    else {
      const done = state.checkIns.filter((c) => c.date === key && c.status === 'done').length
      st = done >= total ? 'full' : done === 0 ? 'none' : 'partial'
    }
    cells.push({ key, day, state: st })
  }
  while (cells.length % 7 !== 0) {
    const d = new Date(y, m, daysInMonth + (cells.length % 7))
    cells.push({ key: toISODate(d), day: d.getDate(), state: 'out' })
  }

  const monthDone = cells.filter((c) => c.state === 'full').length
  const tracked = cells.filter((c) => c.state === 'full' || c.state === 'partial' || c.state === 'none').length

  const detail = selected
    ? taskDefs.map((t) => {
        const hit = state.checkIns.find((c) => c.date === selected && c.taskId === t.id)
        const status = selected === todayKey ? effectiveStatus(t, hit) : hit?.status ?? 'missed'
        return { task: t, status }
      })
    : []

  return (
    <div className="stack">
      <section className="card card-pad">
        <div className="card-hd">
          <div>
            <div className="eyebrow">坚持记录</div>
            <h2 className="card-title">{y} 年 {m + 1} 月</h2>
          </div>
          <span className="card-note num">本月全部完成 {monthDone} / {tracked} 天</span>
        </div>

        <div className="cal-hd">{WEEK.map((w) => <span key={w}>{w}</span>)}</div>
        <div className="cal">
          {cells.map((c, i) => {
            const clickable = c.state !== 'out' && c.state !== 'future'
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
                  {c.state === 'partial' && <span className="num">缺 {total - state.checkIns.filter((x) => x.date === c.key && x.status === 'done').length}</span>}
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
          <span><i style={{ background: 'transparent', border: '1px dashed var(--line-2)' }} />未到</span>
        </div>
      </section>

      {selected && (
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
                          : <span className="chip chip-wait">待完成</span>}
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
