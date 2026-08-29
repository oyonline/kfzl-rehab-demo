import { DAILY_REMINDERS, abnormalBpReminder } from '../data/reminders'
import { isBpAbnormal, taskDefs, toISODate } from '../data/seed'
import { effectiveStatus, useDemoState } from '../store/store'
import { IconBell, IconCheck } from './Icons'

/**
 * 今日提醒记录。
 *
 * 甲方需求书 3.3：计划设定了时间，到点自动推送消息提醒家属。
 * 但 v0.2 撤销了演示时钟，「到点自动弹提醒」在几分钟的演示里没有呈现路径 ——
 * 真等到 20:30 才弹一条，现场根本看不到。
 *
 * 所以改为把提醒机制**以记录的形式**呈现：已过时间的显示为已推送，
 * 未到时间的显示为待推送，两者都按真实时间判断，不伪造。
 * 讲解时可以直接指着说「到点会推这一条」，而不必等到点。
 *
 * 血压超标那条是触发式的，只有今日确实出现过超标记录时才出现 ——
 * 它是真的被触发出来的，不是预先摆好的。
 */
export function ReminderLog() {
  const state = useDemoState()
  const now = new Date()
  const today = toISODate(now)
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))

  const items = DAILY_REMINDERS.map((r) => {
    const task = r.taskId ? taskDefs.find((t) => t.id === r.taskId) : undefined
    const checkIn = task ? state.checkIns.find((c) => c.taskId === task.id && c.date === today) : undefined
    return {
      ...r,
      sent: toMin(r.time) <= nowMin,
      done: task ? effectiveStatus(task, checkIn) === 'done' : undefined,
    }
  })

  // 触发式：今日出现过超标血压才加进来，按实际发生时间插入
  const badVital = state.vitals
    .filter((v) => v.date === today && isBpAbnormal(v))
    .sort((a, b) => b.at.localeCompare(a.at))[0]

  const all = [
    ...items,
    ...(badVital
      ? [{
          id: 'rm-bp-alert',
          time: badVital.time,
          text: abnormalBpReminder(badVital.systolic, badVital.diastolic),
          sent: true,
          done: undefined as boolean | undefined,
          highlight: true,
          alert: true,
        }]
      : []),
  ].sort((a, b) => toMin(a.time) - toMin(b.time))

  const sentCount = all.filter((r) => r.sent).length

  return (
    <section className="card card-pad">
      <div className="card-hd">
        <div>
          <div className="eyebrow">主动提醒</div>
          <h2 className="card-title" style={{ fontSize: 'var(--t-md)' }}>今日提醒记录</h2>
        </div>
        <span className="card-note num">已推送 {sentCount} / {all.length}</span>
      </div>
      <p className="card-note" style={{ marginTop: 4 }}>
        按康复师计划的时间点自动推送给 {'陈女士'}，不用自己记
      </p>

      <div className="rmlist">
        {all.map((r) => (
          <div className="rmrow" key={r.id} data-sent={r.sent} data-alert={'alert' in r && r.alert}>
            <span className="rmtime num">{r.time}</span>
            <span className="rmdot" />
            <span className="rmbody">
              <span className="rmtext">{r.text}</span>
              <span className="rmmeta">
                {r.sent
                  ? <span className="chip"><IconBell size={10} /> 已推送</span>
                  : <span className="chip" style={{ opacity: .7 }}>待推送</span>}
                {r.done === true && <span className="chip chip-ok"><IconCheck size={10} /> 已完成</span>}
                {r.done === false && r.sent && <span className="chip">尚未完成</span>}
              </span>
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
