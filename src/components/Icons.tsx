/** 内联线性图标 —— 不引外部图标库，现场断网也在 */

type P = { size?: number; className?: string }
const base = (size: number) => ({
  width: size, height: size, viewBox: '0 0 24 24',
  fill: 'none', stroke: 'currentColor',
  strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
})

export const IconLeaf = ({ size = 18 }: P) => (
  <svg {...base(size)}><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" /><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" /></svg>
)
export const IconCheck = ({ size = 12 }: P) => (
  <svg {...base(size)} strokeWidth={3}><path d="m20 6-11 11-5-5" /></svg>
)
export const IconPill = ({ size = 16 }: P) => (
  <svg {...base(size)}><path d="m10.5 20.5-7-7a4.95 4.95 0 0 1 7-7l7 7a4.95 4.95 0 0 1-7 7Z" /><path d="m8.5 8.5 7 7" /></svg>
)
export const IconActivity = ({ size = 16 }: P) => (
  <svg {...base(size)}><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
)
export const IconPlay = ({ size = 14 }: P) => (
  <svg {...base(size)}><path d="m6 3 14 9-14 9V3Z" /></svg>
)
export const IconChat = ({ size = 18 }: P) => (
  <svg {...base(size)}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" /></svg>
)
export const IconCalendar = ({ size = 18 }: P) => (
  <svg {...base(size)}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
)
export const IconSend = ({ size = 15 }: P) => (
  <svg {...base(size)}><path d="M22 2 11 13" /><path d="M22 2 15 22l-4-9-9-4Z" /></svg>
)
export const IconClock = ({ size = 14 }: P) => (
  <svg {...base(size)}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
)
export const IconUtensils = ({ size = 18 }: P) => (
  <svg {...base(size)}><path d="M3 2v7a3 3 0 0 0 3 3 3 3 0 0 0 3-3V2M6 2v20M18 2c-1.5 2-2 4-2 6 0 2 1 3 2 3s2-1 2-3c0-2-.5-4-2-6ZM18 11v11" /></svg>
)

export const IconClose = ({ size = 17 }: P) => (
  <svg {...base(size)}><path d="M18 6 6 18M6 6l12 12" /></svg>
)
export const IconFile = ({ size = 15 }: P) => (
  <svg {...base(size)}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M9 13h6M9 17h4" /></svg>
)
