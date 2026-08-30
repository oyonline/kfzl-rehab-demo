/**
 * docx 正文抽取 —— 只读 word/document.xml，不依赖 Office 或 Python。
 *
 * 甲方 57 篇实测：无一篇解析失败，无图片依赖，去标签即得干净正文。
 */

import { unzipSync, strFromU8 } from 'fflate'
import { readFileSync } from 'fs'

const ENTITIES: Record<string, string> = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'", '&nbsp;': ' ',
}

export function extractDocx(path: string): string {
  const zip = unzipSync(readFileSync(path))
  const doc = zip['word/document.xml']
  if (!doc) throw new Error(`${path}: 缺少 word/document.xml`)

  let xml = strFromU8(doc)
  // 段落与换行先转成真的换行，否则去标签后整篇会黏成一行，切片无从下手
  xml = xml.replace(/<w:p\b[^>]*\/>/g, '\n')
  xml = xml.replace(/<\/w:p>/g, '\n')
  xml = xml.replace(/<w:br\b[^>]*\/?>/g, '\n')
  xml = xml.replace(/<w:tab\b[^>]*\/?>/g, ' ')
  const text = xml.replace(/<[^>]+>/g, '')

  return text
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&\w+;/g, (m) => ENTITIES[m] ?? m)
    .split('\n')
    .map((l) => l.replace(/[ \t　]+/g, ' ').trim())
    .filter((l, i, a) => l.length > 0 || (i > 0 && a[i - 1].length > 0))
    .join('\n')
    .trim()
}

export interface Provenance {
  tier: 'attributed' | 'unattributed' | 'ai_flagged'
  author?: string
  sourceNote?: string
}

/**
 * 判定来源等级。
 *
 * ai_flagged 优先于 unattributed：文中自述「部分内容可能由 AI 生成」的，
 * 哪怕带署名也降到最低档 —— 署名的是转载者，不是内容的专业背书。
 * 甲方 57 篇里这一档占 21 篇（37%），政策集合 13 篇中占 10 篇。
 */
export function detectProvenance(text: string): Provenance {
  const head = text.slice(0, 500)
  const aiFlagged = /AI\s*生成|人工智能生成|AI\s*辅助生成/.test(text)

  // 行内匹配，不锚定行首 —— 甲方多数篇目把标题与「来源：X」写在同一段里。
  //
  // 必须紧跟冒号，这一条同时挡掉了散文里的误判：
  //「减少"痰"的来源。」「前面作者有提到」都不带冒号，不会被当成署名。
  //
  // 值取到第一个空格或句读为止：机构名里没有空格，空格之后已是正文
  //（实测「来源：北京市顺义区第二医院 在康复科，…」）。宁可少截一段
  // 后缀，也不要把正文吞进署名里。
  const VALUE = String.raw`([^\s。！？；，、\n|]{2,30})`
  // 顺带剥掉值前面的分隔符：甲方文案里常写「作者丨董小妹」这种竖线样式
  const pick = (re: RegExp, scope: string) =>
    scope.match(re)?.[1]?.trim().replace(/^[丨|｜\/·:：\-—]+\s*/, '') || undefined

  const author =
    pick(new RegExp(String.raw`(?:作者|供稿)\s*[:：]\s*` + VALUE), head) ??
    // 有些篇目把供稿放在文末
    pick(new RegExp(String.raw`供稿\s*[:：]?\s*` + VALUE), text.slice(-300))
  const sourceNote = pick(new RegExp(String.raw`(?:信息来源|来源|出处|转载自)\s*[:：]\s*` + VALUE), head)

  if (aiFlagged) return { tier: 'ai_flagged', author, sourceNote }
  if (author || sourceNote) return { tier: 'attributed', author, sourceNote }
  return { tier: 'unattributed' }
}
