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
 * 只弹最新的那一条，关掉就结束 —— 不会接着把更早的几条依次弹出来。
 * 做法是先取最新一条，再判断它是否已被关闭；而不是「找最新的未关闭的一条」，
 * 后者会让关闭动作变成翻页，一条接一条弹个没完。
 *
 * 但之后若**真的又触发了更新的一条**（比如现场录入超标血压），
 * 最新一条随之变化，它仍然会弹 —— 该来的提醒不能因为关过一次就被吞掉。
 *
 * 已关闭的 id 存 sessionStorage，按标签页隔离，与登录态同一套逻辑：
 * 并排两窗互不影响。
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

  // 先取最新一条，再看它是否已关闭 —— 顺序反过来就成了逐条翻页
  const newest = [...items].reverse().find((r) => r.sent && r.done !== true)
  const latest = newest && !dismissed.includes(newest.id) ? newest : undefined
  const task = latest?.taskId ? taskDefs.find((t) => t.id === latest.taskId) : undefined

  // 真的又来了更新的一条时重放进场动画，让「又来一条」看得出来
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
