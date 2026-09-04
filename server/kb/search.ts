/**
 * 知识库检索 —— FTS5 BM25 + 来源等级加权 + 近重复折叠。
 *
 * 排序不是纯相关度：甲方 57 篇里只有 21 篇来源可追溯，21 篇自带
 * 「可能由 AI 生成」标注。相关度相同的两段，来源可靠的那段必须排在前面。
 * 权重存在 kb_documents.weight，康复师审核后逐篇改值即可，不用改代码。
 */

import { getDb } from '../db/index.ts'
import { toMatchQuery } from './tokenize.ts'

export interface Hit {
  chunkId: string
  docId: string
  title: string
  heading?: string
  text: string
  collectionId: string
  collectionName: string
  disclaimer?: string
  provenance: 'attributed' | 'unattributed' | 'ai_flagged'
  /** 展示给家属的出处，如实标注，不美化 */
  sourceLabel: string
  score: number
}

/** 审核通过的额外加权；rejected 直接排除（在 SQL 里） */
const APPROVED_BOOST = 1.2

export function sourceLabel(r: { author?: string | null; source_note?: string | null; provenance: string }): string {
  const who = [r.source_note, r.author].filter(Boolean).join(' · ')
  if (r.provenance === 'ai_flagged') {
    return who ? `来源：${who}（该文含 AI 生成内容标注）` : '来源未标明（该文含 AI 生成内容标注）'
  }
  return who ? `来源：${who}` : '来源未标明'
}

export function search(q: string, opts: { topK?: number; collections?: string[] } = {}): Hit[] {
  const match = toMatchQuery(q)
  if (!match) return []
  const topK = opts.topK ?? 5
  const db = getDb()

  const colFilter = opts.collections?.length
    ? ` AND d.collection_id IN (${opts.collections.map(() => '?').join(',')})`
    : ''

  // 多取候选再折叠：近重复簇会吃掉名额，只取 topK 条会折叠后不够数
  const rows = db.prepare(`
    SELECT c.id, c.doc_id, c.heading, c.text,
           d.title, d.author, d.source_note, d.provenance, d.collection_id,
           d.dup_group, d.weight, d.review_status,
           col.name AS collection_name, col.disclaimer,
           -bm25(kb_chunks_fts) AS raw
    FROM kb_chunks_fts
    JOIN kb_chunks c        ON c.rowid = kb_chunks_fts.rowid
    JOIN kb_documents d     ON d.id = c.doc_id
    JOIN kb_collections col ON col.id = d.collection_id
    WHERE kb_chunks_fts MATCH ?
      AND d.enabled = 1 AND d.review_status = 'approved' AND col.enabled = 1${colFilter}
    ORDER BY raw DESC
    LIMIT 60
  `).all(match, ...(opts.collections ?? [])) as any[]

  const scored = rows.map((r) => ({
    r,
    score: r.raw * r.weight * (r.review_status === 'approved' ? APPROVED_BOOST : 1),
  })).sort((a, b) => b.score - a.score)

  // 近重复折叠：同一簇只留最高分的一条，避免「腿无力」四篇挤满结果
  const seenGroup = new Set<string>()
  const out: Hit[] = []
  for (const { r, score } of scored) {
    if (seenGroup.has(r.dup_group)) continue
    seenGroup.add(r.dup_group)
    out.push({
      chunkId: r.id, docId: r.doc_id, title: r.title,
      heading: r.heading ?? undefined, text: r.text,
      collectionId: r.collection_id, collectionName: r.collection_name,
      disclaimer: r.disclaimer ?? undefined,
      provenance: r.provenance,
      sourceLabel: sourceLabel(r),
      score: Number(score.toFixed(4)),
    })
    if (out.length >= topK) break
  }
  return out
}

/** 检索日志，供后续调优与审计 */
export function logSearch(q: string, hits: Hit[], ms: number, patientId?: string, userId?: string) {
  getDb().prepare(
    `INSERT INTO kb_search_log (id, question, patient_id, user_id, hits, latency_ms, at)
     VALUES (?,?,?,?,?,?,?)`,
  ).run(
    `kbq-${Date.now()}-${Math.floor(Math.random() * 1e4)}`,
    q, patientId ?? null, userId ?? null,
    JSON.stringify(hits.map((h) => ({ docId: h.docId, chunkId: h.chunkId, score: h.score }))),
    Math.round(ms), new Date().toISOString(),
  )
}
