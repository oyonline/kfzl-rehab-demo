import { useEffect, useRef, useState } from 'react'
import { ReminderLog, pendingCount, useTodayReminders } from './ReminderLog'
import { IconBell } from './Icons'

/**
 * 顶栏铃铛 —— 消息中心入口。
 *
 * 提醒记录原先是今日页最下面的一整块，要滚到底才看得见，
 * 演示时基本翻不到。挪到铃铛里：铃铛本来就是「有新消息」的通用位置，
 * 也让提醒在任何页面都点得到，不再依附于今日页。
 *
 * 角标数 = 已推送但对应任务尚未完成的条数，加上未读的康复师留言。
 * 不是「未读数」——提醒本来就不需要逐条已读，家属真正关心的是
 * 「催过了、我还没做」还剩几件。
 */
export function ReminderBell({ unreadGuidance }: { unreadGuidance: number }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const items = useTodayReminders()
  const badge = pendingCount(items) + unreadGuidance

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="bellwrap" ref={wrapRef}>
      <button
        className="bell"
        data-unread={badge > 0}
        data-open={open}
        onClick={() => setOpen((v) => !v)}
        aria-label={badge > 0 ? `${badge} 条待处理提醒` : '今日提醒记录'}
      >
        <IconBell size={17} />
        {badge > 0 && <span className="bell-n num">{badge}</span>}
      </button>

      {open && (
        <div className="pop" role="dialog" aria-label="今日提醒记录">
          <ReminderLog items={items} />
        </div>
      )}
    </div>
  )
}
