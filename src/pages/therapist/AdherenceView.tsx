import { taskDefs, toISODate } from '../../data/seed'
import { useDemoState } from '../../store/store'
import { CheckinCalendar } from '../../components/CheckinCalendar'

export function AdherenceView() {
  const state = useDemoState()
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const date = toISODate(d)
    return { date, done: state.checkIns.filter((c) => c.date === date && c.status === 'done').length, total: taskDefs.length }
  })

  return (
    <div className="stack">
      <section className="card card-pad">
        <div className="card-hd">
          <div>
            <div className="eyebrow">依从性</div>
            <h2 className="card-title">近 7 日完成情况</h2>
          </div>
          <span className="card-note">每日 {taskDefs.length} 项</span>
        </div>
        <div className="bars">
          {last7.map((d) => (
            <div className="bar-col" key={d.date}>
              <span className="num" style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>{d.done}</span>
              <div className="bar" data-partial={d.done < d.total} style={{ height: `${Math.max(6, (d.done / d.total) * 78)}px` }} />
              <span className="bar-k num">{d.date.slice(5).replace('-', '/')}</span>
            </div>
          ))}
        </div>
      </section>

      <CheckinCalendar />
    </div>
  )
}
