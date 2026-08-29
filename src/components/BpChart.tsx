import type { VitalRecord } from '../data/types'
import { BP_SAFE, isBpAbnormal } from '../data/seed'

/**
 * 血压趋势图 —— 手写 SVG。
 *
 * 不引图表库：v0.2 §6.2 定了不引入任何外部依赖，现场断网也要完整呈现；
 * 而这里要画的只是两条折线加两条参考线，为它装一个几百 KB 的库不划算。
 *
 * 甲方需求书 3.5：「曲线上标注安全范围（收缩压 90-139，舒张压 60-89），
 * 超出范围的数据点用红色标示」。
 *
 * 上限画成虚线而不是把 60–139 整段涂成色块 —— 两个安全区首尾相接，
 * 涂出来会连成一大片，反而看不出「哪条线该低于哪条界」。
 */

const W = 680
const H = 230
const PAD = { top: 16, right: 60, bottom: 28, left: 38 }

export function BpChart({ records }: { records: VitalRecord[] }) {
  if (records.length < 2) {
    return <div className="card-note" style={{ padding: '28px 0', textAlign: 'center' }}>记录满两次后显示趋势</div>
  }

  const sys = records.map((r) => r.systolic)
  const dia = records.map((r) => r.diastolic)
  // 纵轴范围要同时容下安全线与实际值，两端各留 10 的余量
  const lo = Math.min(BP_SAFE.diaMin, ...dia) - 10
  const hi = Math.max(BP_SAFE.sysMax, ...sys) + 10

  const iw = W - PAD.left - PAD.right
  const ih = H - PAD.top - PAD.bottom
  const x = (i: number) => PAD.left + (records.length === 1 ? iw / 2 : (i * iw) / (records.length - 1))
  const y = (v: number) => PAD.top + ih - ((v - lo) / (hi - lo)) * ih
  const path = (vals: number[]) => vals.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')

  // 每个日期的第一个点打标签，末点必打；点多时不会挤成一团
  const labelIdx = new Set<number>()
  let lastDate = ''
  records.forEach((r, i) => {
    if (r.date !== lastDate) { labelIdx.add(i); lastDate = r.date }
  })
  labelIdx.add(records.length - 1)

  const yTicks = [BP_SAFE.diaMax, BP_SAFE.sysMax]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="bpchart" role="img" aria-label="血压趋势">
      {/* 安全上限参考线 */}
      {yTicks.map((t) => (
        <g key={t}>
          <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--line-2)" strokeDasharray="4 4" />
          <text x={W - PAD.right + 7} y={y(t) + 4} className="bpchart-ref">
            {t === BP_SAFE.sysMax ? `高压 ${t}` : `低压 ${t}`}
          </text>
        </g>
      ))}

      {/* 纵轴刻度 */}
      {[lo, Math.round((lo + hi) / 2), hi].map((v) => (
        <text key={v} x={PAD.left - 8} y={y(v) + 4} className="bpchart-axis" textAnchor="end">{Math.round(v)}</text>
      ))}

      {/* 折线 */}
      <path d={path(dia)} fill="none" stroke="var(--teal-300)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <path d={path(sys)} fill="none" stroke="var(--teal-700)" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />

      {/* 数据点：超出安全范围的标红并加大 */}
      {records.map((r, i) => {
        const bad = isBpAbnormal(r)
        return (
          <g key={r.id}>
            <circle cx={x(i)} cy={y(r.diastolic)} r={bad ? 4.5 : 3} fill={bad ? 'var(--miss)' : 'var(--teal-300)'} />
            <circle cx={x(i)} cy={y(r.systolic)} r={bad ? 5 : 3.4} fill={bad ? 'var(--miss)' : 'var(--teal-700)'} />
            {bad && <text x={x(i)} y={y(r.systolic) - 11} className="bpchart-bad" textAnchor="middle">{r.systolic}/{r.diastolic}</text>}
          </g>
        )
      })}

      {/* 横轴标签 */}
      {records.map((r, i) =>
        labelIdx.has(i) ? (
          <text key={r.id} x={x(i)} y={H - 8} className="bpchart-axis" textAnchor={i === 0 ? 'start' : i === records.length - 1 ? 'end' : 'middle'}>
            {i === records.length - 1 ? r.time : `${Number(r.date.slice(5, 7))}/${Number(r.date.slice(8, 10))}`}
          </text>
        ) : null,
      )}
    </svg>
  )
}
