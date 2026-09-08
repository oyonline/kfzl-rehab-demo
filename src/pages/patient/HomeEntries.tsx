import { NavLink } from 'react-router-dom'
import {
  IconCalendar, IconChat, IconClipboardList, IconFile, IconHeart,
  IconPlay, IconUsers, IconUtensils,
} from '../../components/Icons'

/**
 * 首页大入口 —— 门户式导航。
 *
 * 2026-09 起顶栏不再放 8 项链接，功能入口改为本页宫格（大图标 + 大字，
 * 家属端「暖 / 大字 / 疏朗」基线）。名称与顺序是 2026-09-03 用户裁决，
 * 改名或重排须先经用户确认。
 *
 * 图标全部内联 SVG —— 仓内硬约束：不引外部图标库 / CDN。
 * 除首页项（end）外均不做前缀隔离，子路由（如 /patient/videos/:id）
 * 也会让对应入口保持高亮。
 */
const ENTRIES = [
  { to: '/patient', label: '个性化康复计划与提醒', icon: IconClipboardList, end: true },
  { to: '/patient/chat', label: '智能对话咨询', icon: IconChat, end: false },
  { to: '/patient/videos', label: '康复训练视频库', icon: IconPlay, end: false },
  { to: '/patient/calendar', label: '打卡日历', icon: IconCalendar, end: false },
  { to: '/patient/guidance', label: '饮食指导', icon: IconUtensils, end: false },
  { to: '/patient/vitals', label: '健康数据', icon: IconHeart, end: false },
  { to: '/patient/resources', label: '宣传册·政策·专家', icon: IconFile, end: false },
  { to: '/patient/forum', label: '家属互助论坛', icon: IconUsers, end: false },
]

export function HomeEntries() {
  return (
    <nav className="entry-grid" aria-label="功能入口">
      {ENTRIES.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to} to={to} end={end}
          className={({ isActive }) => `entry-card${isActive ? ' active' : ''}`}
        >
          <span className="entry-ico"><Icon size={22} /></span>
          <span className="entry-name">{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
