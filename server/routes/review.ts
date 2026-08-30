/**
 * 审核后台（P6）。
 *
 * 目的：让康复师在页面上审内容，而不是改代码。此前 qa.ts / guidance.ts /
 * videoSteps.ts 三个文件头部都挂着 `⚠️ REVIEW REQUIRED`，审核意味着
 * 改源码再重新部署 —— 康复专业人员做不到，红线因此一直悬着。
 *
 * 审核动作全部写 audit_log：医疗内容「谁在什么时候批准了什么」必须可追溯。
 */

import { Router } from 'express'
import { randomUUID } from 'crypto'
import { getDb } from '../db/index.ts'
import { requireAuth, requireRole } from '../auth/middleware.ts'
import { toGuidanceCard, toPresetQA } from './mappers.ts'

export const reviewRouter = Router()

const one = (v: string | string[] | undefined): string =>
  Array.isArray(v) ? (v[0] ?? '') : (v ?? '')

const STATUSES = ['pending', 'approved', 'rejected'] as const
type Status = (typeof STATUSES)[number]

/** 可审核的三类内容 —— 与 README 里那三个 REVIEW REQUIRED 文件一一对应 */
const KINDS = {
  preset_qa: { table: 'preset_qa', label: '咨询预设答案', source: 'src/data/qa.ts' },
  guidance: { table: 'guidance_articles', label: '饮食与健康指导', source: 'src/data/guidance.ts' },
  video_steps: { table: 'videos', label: '训练分步说明', source: 'src/data/videoSteps.ts' },
} as const
type Kind = keyof typeof KINDS

function audit(userId: string, action: string, entity: string, entityId: string, detail: unknown, ip?: string) {
  getDb().prepare(
    `INSERT INTO audit_log (id,user_id,action,entity,entity_id,detail,ip,at) VALUES (?,?,?,?,?,?,?,?)`,
  ).run(randomUUID(), userId, action, entity, entityId, JSON.stringify(detail), ip ?? null, new Date().toISOString())
}

/* ---------------- 概览 ---------------- */

reviewRouter.get('/summary', requireAuth, (_req, res) => {
  const db = getDb()
  const count = (sql: string) => (db.prepare(sql).all() as any[])
    .reduce((m, r) => ({ ...m, [r.s]: r.c }), {} as Record<string, number>)

  res.json({
    preset_qa: count(`SELECT review_status s, count(*) c FROM preset_qa GROUP BY s`),
    guidance: count(`SELECT review_status s, count(*) c FROM guidance_articles GROUP BY s`),
    // 只统计真的有分步说明的视频；没说明的不该显示为「待审」
    video_steps: count(`SELECT v.steps_review_status s, count(*) c FROM videos v
      WHERE EXISTS (SELECT 1 FROM video_steps st WHERE st.video_id = v.id) GROUP BY s`),
    kb_documents: count(`SELECT review_status s, count(*) c FROM kb_documents GROUP BY s`),
  })
})

/* ---------------- 列表（带正文，供逐条审阅） ---------------- */

reviewRouter.get('/items', requireAuth, (req, res) => {
  const db = getDb()
  const kind = one(req.query.kind as any) as Kind
  if (!(kind in KINDS)) {
    return res.status(400).json({ error: 'bad_request', message: '未知的内容类型' })
  }

  if (kind === 'preset_qa') {
    const rows = db.prepare(`SELECT p.*, u.display_name AS reviewer
      FROM preset_qa p LEFT JOIN users u ON u.id = p.reviewed_by ORDER BY p.sort_order`).all() as any[]
    return res.json({
      kind, ...KINDS[kind],
      items: rows.map((r) => ({
        id: r.id, title: r.question, reviewStatus: r.review_status,
        reviewer: r.reviewer ?? undefined, reviewedAt: r.reviewed_at ?? undefined,
        body: toPresetQA(r).answer, extra: toPresetQA(r).external,
        note: r.escalate ? `触发转康复师：${r.escalate_hint ?? '—'}` : undefined,
      })),
    })
  }

  if (kind === 'guidance') {
    const rows = db.prepare(`SELECT g.*, u.display_name AS reviewer
      FROM guidance_articles g LEFT JOIN users u ON u.id = g.reviewed_by ORDER BY g.sort_order`).all() as any[]
    return res.json({
      kind, ...KINDS[kind],
      items: rows.map((r) => ({
        id: r.id, title: r.title, reviewStatus: r.review_status,
        reviewer: r.reviewer ?? undefined, reviewedAt: r.reviewed_at ?? undefined,
        body: toGuidanceCard(r).items,
        note: r.alert ? `升级条件：${r.alert}` : undefined,
      })),
    })
  }

  // video_steps
  const rows = db.prepare(`SELECT v.id, v.title, v.category, v.steps_review_status, v.steps_reviewed_at,
      u.display_name AS reviewer
    FROM videos v LEFT JOIN users u ON u.id = v.steps_reviewed_by
    WHERE EXISTS (SELECT 1 FROM video_steps st WHERE st.video_id = v.id)
    ORDER BY v.sort_order`).all() as any[]
  const steps = db.prepare('SELECT video_id, title, detail FROM video_steps ORDER BY video_id, seq').all() as any[]
  res.json({
    kind, ...KINDS[kind],
    items: rows.map((r) => ({
      id: r.id, title: `${r.title}（${r.category}）`, reviewStatus: r.steps_review_status,
      reviewer: r.reviewer ?? undefined, reviewedAt: r.steps_reviewed_at ?? undefined,
      body: steps.filter((s) => s.video_id === r.id).map((s) => `${s.title}：${s.detail}`),
    })),
  })
})

/* ---------------- 审核动作 ---------------- */

reviewRouter.patch('/items/:kind/:id', requireAuth, requireRole('therapist', 'admin'), (req, res) => {
  const db = getDb()
  const kind = one(req.params.kind) as Kind
  const id = one(req.params.id)
  const status = req.body?.reviewStatus as Status

  if (!(kind in KINDS)) return res.status(400).json({ error: 'bad_request', message: '未知的内容类型' })
  if (!STATUSES.includes(status)) {
    return res.status(400).json({ error: 'bad_request', message: '状态只能是 pending / approved / rejected' })
  }

  const at = new Date().toISOString()
  const r = kind === 'video_steps'
    ? db.prepare(`UPDATE videos SET steps_review_status=?, steps_reviewed_by=?, steps_reviewed_at=? WHERE id=?`)
        .run(status, req.user!.sub, at, id)
    : db.prepare(`UPDATE ${KINDS[kind].table} SET review_status=?, reviewed_by=?, reviewed_at=? WHERE id=?`)
        .run(status, req.user!.sub, at, id)

  if (r.changes === 0) return res.status(404).json({ error: 'not_found' })

  // 医疗内容的批准/驳回必须留痕：谁、什么时候、批了哪一条
  audit(req.user!.sub, `review_${status}`, kind, id, { source: KINDS[kind].source }, req.ip)
  res.json({ ok: true, reviewStatus: status, reviewedAt: at })
})

/* ---------------- 审计日志 ---------------- */

reviewRouter.get('/audit', requireAuth, requireRole('therapist', 'admin'), (req, res) => {
  const limit = Math.min(Number(one(req.query.limit as any)) || 100, 500)
  const rows = getDb().prepare(`
    SELECT a.id, a.action, a.entity, a.entity_id, a.detail, a.at, u.display_name AS who
    FROM audit_log a LEFT JOIN users u ON u.id = a.user_id
    ORDER BY a.at DESC LIMIT ?`).all(limit) as any[]
  res.json({
    entries: rows.map((r) => ({
      id: r.id, action: r.action, entity: r.entity, entityId: r.entity_id,
      at: r.at, who: r.who ?? '（已删除用户）',
      detail: (() => { try { return JSON.parse(r.detail) } catch { return {} } })(),
    })),
  })
})
