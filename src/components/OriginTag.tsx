import { ORIGIN_LABEL, type DataOrigin } from '../data/types'

/** 来源标签：v0.1 §5 要求任何模拟内容都必须标明，不得冒充生产事实 */
export function OriginTag({ origin, short }: { origin: DataOrigin; short?: boolean }) {
  const full = ORIGIN_LABEL[origin]
  return (
    <span className="origin-tag" data-kind={origin} title={full}>
      {short ? full.split('｜')[0] : full}
    </span>
  )
}
