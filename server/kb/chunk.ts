/**
 * 切片。目标 300–500 字、重叠 80 字，按段落边界切，不从句子中间断开。
 *
 * 重叠是为了答案跨切片时不丢上下文：一条「出现 X 情况请立即就医」的升级条件
 * 如果正好落在切片边界，两边都读不全就等于没有。
 */

export interface Chunk {
  seq: number
  heading?: string
  text: string
}

const TARGET = 420
const MAX = 560
const OVERLAP = 80

/** 小标题：短、且不以句末标点结尾。用于给切片标出所属小节 */
function isHeading(line: string): boolean {
  if (line.length === 0 || line.length > 40) return false
  if (/[。！？；：，]$/.test(line)) return false
  return /^(?:[一二三四五六七八九十]+[、.．]|\d+[、.．)）]|【.+】|#+\s)/.test(line) || line.length <= 20
}

/**
 * 超长单行再切。
 *
 * 部分篇目整篇只有一个段落（无换行），按行切根本切不动，会产出三千多字的
 * 巨型切片 —— BM25 在这种块上几乎失去区分度，注入提示词时也是一大坨。
 * 先按句末标点切，仍超长再硬切，保证没有任何一片超过 MAX。
 */
function splitLong(line: string): string[] {
  if (line.length <= MAX) return [line]
  const out: string[] = []
  let buf = ''
  for (const seg of line.split(/(?<=[。！？；])/)) {
    if (buf && buf.length + seg.length > MAX) { out.push(buf); buf = '' }
    if (seg.length > MAX) {
      // 连句读都没有的超长串：硬切，宁可切在词中间也不放行巨型块
      if (buf) { out.push(buf); buf = '' }
      for (let i = 0; i < seg.length; i += MAX) out.push(seg.slice(i, i + MAX))
      continue
    }
    buf += seg
  }
  if (buf) out.push(buf)
  return out
}

export function chunkText(text: string): Chunk[] {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean).flatMap(splitLong)
  const chunks: Chunk[] = []
  let buf = ''
  let heading: string | undefined
  let pendingHeading: string | undefined

  const flush = () => {
    const t = buf.trim()
    if (!t) return
    chunks.push({ seq: chunks.length, heading, text: t })
    // 结尾重叠一段带进下一片
    buf = t.length > OVERLAP ? t.slice(-OVERLAP) : ''
  }

  for (const line of lines) {
    if (isHeading(line)) {
      // 标题前先收口，让标题成为下一片的开头而不是上一片的尾巴
      if (buf.trim().length >= TARGET * 0.6) flush()
      pendingHeading = line
    }
    if (buf.length + line.length + 1 > MAX) flush()
    if (pendingHeading) {
      heading = pendingHeading
      pendingHeading = undefined
    }
    buf += (buf ? '\n' : '') + line
    if (buf.length >= TARGET && /[。！？]$/.test(line)) flush()
  }
  flush()

  // 末片过短就并回上一片，避免出现十几个字的碎片挤占检索结果
  if (chunks.length > 1 && chunks[chunks.length - 1].text.length < 120) {
    const last = chunks.pop()!
    chunks[chunks.length - 1].text += '\n' + last.text
  }
  return chunks.map((c, i) => ({ ...c, seq: i }))
}

/** 近重复判定：token 集合的 Jaccard 相似度 */
export function jaccard(a: Set<string>, b: Set<string>): number {
  let inter = 0
  for (const x of a) if (b.has(x)) inter++
  const union = a.size + b.size - inter
  return union === 0 ? 0 : inter / union
}
