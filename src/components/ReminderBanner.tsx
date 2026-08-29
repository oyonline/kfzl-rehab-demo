import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { taskDefs } from '../data/seed'
import { useTodayReminders } from './ReminderLog'
import { IconBell, IconChevron, IconClose } from './Icons'

/**
 * 最近一条提醒 —— 浮层通知。
 *
 * 只显示「最近一条已推送、且还没做完」的提醒：做完了就不该再催，
 * 没到点的更不该提前出现。都做完时整条不渲染，页面不留空壳。
 *
 * 做成浮层而不是页内横幅：横幅会把下面的内容整体顶下去，读起来像页面的一部分；
 * 而它要表达的是「系统刚推了一条消息过来」，那就应该浮在内容之上、
 * 不改变页面布局，关掉后一切归位 —— 这才是推送该有的样子。
 * 进场从右上滑入，演示时一眼能看出「又来一条」，
 * 而内容与时间都取自真实状态，没有伪造推送。
 * 关掉后本次会话不再出现（存 sessionStorage，按标签页隔离，
 * 与登录态同一套逻辑：并排两窗互不影响）。
 */
const DISMISS_KEY = 'kfzl.rmbanner.dismissed'

export function ReminderBanner() {
  const items = useTodayReminders()
  const [dismissed, setDismissed] = useState<string[]>(() => {
    try {
      return JSON.parse(sessionStorage.getItem(DISMISS_KEY) ?? '[]') as string[]
    } catch {
      return []
    }
  })

  const latest = [...items].reverse().find((r) => r.sent && r.done !== true && !dismissed.includes(r.id))
  const task = latest?.taskId ? taskDefs.find((t) => t.id === latest.taskId) : undefined

  // 换到下一条时重放一次进场动画，让「又来一条」看得出来
  const [seq, setSeq] = useState(0)
  useEffect(() => { setSeq((n) => n + 1) }, [latest?.id])

  if (!latest) return null

  function dismiss() {
    if (!latest) return
    const next = [...dismissed, latest.id]
    setDismissed(next)
    try { sessionStorage.setItem(DISMISS_KEY, JSON.stringify(next)) } catch { /* 存储不可用时仅本次有效 */ }
  }

  return (
    <div className="rmtoast" data-alert={!!latest.alert} key={seq} role="status">
      <div className="rmtoast-hd">
        <span className="rmtoast-i"><IconBell size={14} /></span>
        <b>{latest.alert ? '异常预警' : '康复提醒'}</b>
        <span className="num rmtoast-time">{latest.time}</span>
        <span className="rmtoast-tag">刚刚推送</span>
        <button className="rmtoast-x" onClick={dismiss} aria-label="关闭"><IconClose size={15} /></button>
      </div>
      <p className="rmtoast-t">{latest.text}</p>
      <div className="rmtoast-ft">
        {task?.videoId
          ? <Link className="btn" to={`/patient/videos/${task.videoId}`} onClick={dismiss}>去做这一项 <IconChevron size={13} /></Link>
          : latest.alert
            ? <Link className="btn" to="/patient/vitals" onClick={dismiss}>查看血压记录 <IconChevron size={13} /></Link>
            : <span />}
        <button className="rmtoast-ok" onClick={dismiss}>知道了</button>
      </div>
    </div>
  )
}
