/**
 * 全局内容库 —— 视频、分步说明、饮食指导卡、预设问答。
 * 这些不属于任何一位患者，所有登录用户共用一份。
 */

import { Router } from 'express'
import { getDb } from '../db/index.ts'
import { requireAuth } from '../auth/middleware.ts'
import { toVideo, toGuidanceCard, toPresetQA } from './mappers.ts'

export const contentRouter = Router()

contentRouter.get('/', requireAuth, (_req, res) => {
  const db = getDb()

  const videos = (db.prepare('SELECT * FROM videos ORDER BY sort_order').all() as any[]).map(toVideo)

  // 分步说明按视频归组，形状对齐前端原来的 VIDEO_STEPS: Record<id, Step[]>
  const steps: Record<string, { title: string; detail: string }[]> = {}
  for (const r of db.prepare(`SELECT st.* FROM video_steps st
    JOIN videos v ON v.id=st.video_id
    WHERE v.steps_review_status='approved'
    ORDER BY st.video_id,st.seq`).all() as any[]) {
    (steps[r.video_id] ??= []).push({ title: r.title, detail: r.detail })
  }

  res.json({
    videos,
    videoSteps: steps,
    // 只有已通过内容才能下发；新增或改写内容会回到 pending，等待重新审核。
    guidance: (db.prepare(
      `SELECT * FROM guidance_articles WHERE review_status='approved' ORDER BY sort_order`,
    ).all() as any[]).map(toGuidanceCard),
    presetQA: (db.prepare(
      `SELECT * FROM preset_qa WHERE review_status='approved' ORDER BY sort_order`,
    ).all() as any[]).map(toPresetQA),
    videoCategories: (db.prepare(
      'SELECT DISTINCT category FROM videos ORDER BY sort_order',
    ).all() as any[]).map((r) => r.category),
  })
})
