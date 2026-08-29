import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { taskDefs } from '../data/seed'
import { useTodayReminders } from './ReminderLog'
import { IconBell, IconChevron } from './Icons'

/**
 * 最近一条提醒 —— 今日页顶部的动态。
 *
 * 只显示「最近一条已推送、且还没做完」的提醒：做完了就不该再催，
 * 没到点的更不该提前出现。都做完时整条不渲染，页面不留空壳。
 *
 * 进场带一次滑入动画 —— 演示时它看起来就是「刚推过来一条」，
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
    <div className="rmbanner" data-alert={!!latest.alert} key={seq}>
      <span className="rmbanner-i"><IconBell size={16} /></span>
      <span className="rmbanner-b">
        <span className="rmbanner-h">
          <b>{latest.alert ? '异常预警' : '康复提醒'}</b>
          <span className="num">{latest.time}</span>
          <span className="rmbanner-tag">刚刚推送给您</span>
        </span>
        <span className="rmbanner-t">{latest.text}</span>
      </span>
      {task?.videoId
        ? <Link className="btn" to={`/patient/videos/${task.videoId}`}>去做这一项 <IconChevron size={13} /></Link>
        : latest.alert
          ? <Link className="btn" to="/patient/vitals">查看血压记录 <IconChevron size={13} /></Link>
          : null}
      <button className="rmbanner-x" onClick={dismiss} aria-label="知道了">知道了</button>
    </div>
  )
}
