/**
 * 知识库路由。
 *
 * /search 与 /api/chat 解耦：家属端的「依据」直接调 /search 拿命中项，
 * 不经模型。这样本机没有模型凭据、甚至现场断网时，检索与出处照常工作 ——
 * 符合 README 第三条硬约束「断网也必须完整呈现」。
 */

import { Router } from 'express'
import { randomUUID } from 'crypto'
import { getDb } from '../db/index.ts'
import { requireAuth, requireRole } from '../auth/middleware.ts'
import { search, logSearch, sourceLabel } from '../kb/search.ts'

export const kbRouter = Router()

const one = (v: string | string[] | undefined): string =>
  Array.isArray(v) ? (v[0] ?? '') : (v ?? '')

kbRouter.post('/search', requireAuth, (req, res) => {
  const { q, topK, collections, patientId } = req.body ?? {}
  if (typeof q !== 'string' || !q.trim()) {
    return res.status(400).json({ error: 'bad_request', message: '检索词不能为空' })
  }
  const t0 = Date.now()
  const hits = search(q, {
    topK: Number.isFinite(topK) ? Math.min(Number(topK), 10) : 5,
    collections: Array.isArray(collections) ? collections : undefined,
  })
  const ms = Date.now() - t0
  logSearch(q, hits, ms, typeof patientId === 'string' ? patientId : undefined, req.user!.sub)

  // 命中政策类时把声明带出去，前端必须显示（政策有时效，且该集合 10/13 为 AI 生成）
  const disclaimers = [...new Set(hits.map((h) => h.disclaimer).filter(Boolean))]
  res.json({ hits, disclaimers, latencyMs: ms })
})

/** 语料台账，供审核后台使用 */
kbRouter.get('/documents', requireAuth, (_req, res) => {
  const db = getDb()
  const rows = db.prepare(`
    SELECT d.id, d.title, d.author, d.source_note, d.provenance, d.review_status,
           d.enabled, d.weight, d.char_count, d.source_path, d.dup_group,
           col.name AS collection_name, col.id AS collection_id,
           (SELECT count(*) FROM kb_chunks c WHERE c.doc_id = d.id) AS chunks
    FROM kb_documents d JOIN kb_collections col ON col.id = d.collection_id
    ORDER BY col.sort_order, d.provenance, d.title
  `).all() as any[]
  res.json({
    documents: rows.map((r) => ({
      id: r.id, title: r.title, collectionId: r.collection_id, collectionName: r.collection_name,
      provenance: r.provenance, sourceLabel: sourceLabel(r), reviewStatus: r.review_status,
      enabled: r.enabled === 1, weight: r.weight, charCount: r.char_count,
      chunks: r.chunks, sourcePath: r.source_path, dupGroup: r.dup_group,
    })),
    summary: db.prepare(`SELECT collection_id, provenance, count(*) c
      FROM kb_documents GROUP BY collection_id, provenance`).all(),
  })
})

/** 审核：改状态、启停、调权重。康复师审完直接改这里，不用改代码 */
kbRouter.patch('/documents/:id', requireAuth, requireRole('therapist', 'admin'), (req, res) => {
  const db = getDb()
  const id = one(req.params.id)
  const doc = db.prepare('SELECT id FROM kb_documents WHERE id = ?').get(id)
  if (!doc) return res.status(404).json({ error: 'not_found' })

  const { reviewStatus, enabled, weight } = req.body ?? {}
  const sets: string[] = []
  const args: unknown[] = []
  if (reviewStatus === 'pending' || reviewStatus === 'approved' || reviewStatus === 'rejected') {
    sets.push('review_status = ?', 'reviewed_by = ?', 'reviewed_at = ?')
    args.push(reviewStatus, req.user!.sub, new Date().toISOString())
  }
  if (typeof enabled === 'boolean') { sets.push('enabled = ?'); args.push(enabled ? 1 : 0) }
  if (Number.isFinite(weight)) { sets.push('weight = ?'); args.push(Math.max(0, Math.min(3, Number(weight)))) }
  if (!sets.length) return res.status(400).json({ error: 'bad_request', message: '没有可更新的字段' })

  db.prepare(`UPDATE kb_documents SET ${sets.join(', ')} WHERE id = ?`).run(...args, id)

  // 与 /api/review 的三类文案一视同仁地留痕。P5 初版漏了这一段，
  // 结果「语料被谁驳回」查不到，而这恰恰是版权与专业审核最需要追溯的一类。
  db.prepare(
    `INSERT INTO audit_log (id,user_id,action,entity,entity_id,detail,ip,at) VALUES (?,?,?,'kb_document',?,?,?,?)`,
  ).run(
    randomUUID(), req.user!.sub,
    reviewStatus ? `review_${reviewStatus}` : 'kb_document_update',
    id, JSON.stringify({ reviewStatus, enabled, weight }), req.ip ?? null, new Date().toISOString(),
  )
  res.json({ ok: true })
})

kbRouter.get('/collections', requireAuth, (_req, res) => {
  res.json({
    collections: getDb().prepare(
      'SELECT id, name, description, disclaimer, enabled FROM kb_collections ORDER BY sort_order',
    ).all(),
  })
})
