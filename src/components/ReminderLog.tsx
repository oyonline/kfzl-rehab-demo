import {isBpAbnormal, toISODate} from '../data/seed'
import { abnormalBpReminder } from '../data/reminders'
import { usePatientData } from '../data/context'
import { effectiveStatus, useDemoState } from '../store/store'
import { IconBell, IconCheck } from './Icons'

export interface ReminderItem {
  id: string
  time: string
  text: string
  /** 已过推送时间 */
  sent: boolean
  /** 对应任务是否已完成；无关联任务时为 undefined */
  done?: boolean
  /** 异常预警（触发式），整行标红 */
  alert?: boolean
  taskId?: string
}

const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))

/**
 * 今日提醒 —— 顶栏铃铛面板与今日页横幅共用。
 *
 * 甲方需求书 3.3：计划设定了时间，到点自动推送消息提醒家属。
 * v0.2 撤销了演示时钟，几分钟的演示里等不到「到点」，因此按真实时间
 * 判断已推送／待推送，把机制以记录形式呈现，不伪造推送时间。
 */
export function useTodayReminders(): ReminderItem[] {
  const { taskDefs, reminders: DAILY_REMINDERS } = usePatientData()
  const state = useDemoState()
  const now = new Date()
  const today = toISODate(now)
  const nowMin = now.getHours() * 60 + now.getMinutes()

  const items: ReminderItem[] = DAILY_REMINDERS.map((r) => {
    const task = r.taskId ? taskDefs.find((t) => t.id === r.taskId) : undefined
    const checkIn = task ? state.checkIns.find((c) => c.taskId === task.id && c.date === today) : undefined
    return {
      id: r.id,
      time: r.time,
      text: r.text,
      taskId: r.taskId,
      sent: toMin(r.time) <= nowMin,
      done: task ? effectiveStatus(task, checkIn) === 'done' : undefined,
    }
  })

  // 触发式：今日确实录到超标血压才出现，按实际发生时间插入
  const bad = state.vitals
    .filter((v) => v.date === today && isBpAbnormal(v))
    .sort((a, b) => b.at.localeCompare(a.at))[0]
  if (bad) {
    items.push({
      id: 'rm-bp-alert',
      time: bad.time,
      text: abnormalBpReminder(bad.systolic, bad.diastolic),
      sent: true,
      alert: true,
    })
  }

  return items.sort((a, b) => toMin(a.time) - toMin(b.time))
}

/** 已推送、且（有关联任务时）尚未完成的条数 —— 铃铛角标用 */
export function pendingCount(items: ReminderItem[]) {
  return items.filter((r) => r.sent && r.done !== true).length
}

export function ReminderLog({ items }: { items: ReminderItem[] }) {
  const sentCount = items.filter((r) => r.sent).length
  return (
    <>
      <div className="pop-hd">
        <div>
          <div className="eyebrow">主动提醒</div>
          <div className="pop-t">今日提醒记录</div>
        </div>
        <span className="card-note num">已推送 {sentCount} / {items.length}</span>
      </div>
      <p className="card-note" style={{ padding: '0 20px 4px' }}>
        按康复师计划的时间点自动推送，不用自己记
      </p>

      <div className="rmlist">
        {items.map((r) => (
          <div className="rmrow" key={r.id} data-sent={r.sent} data-alert={!!r.alert}>
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
    </>
  )
}
