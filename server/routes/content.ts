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
  for (const r of db.prepare('SELECT * FROM video_steps ORDER BY video_id, seq').all() as any[]) {
    (steps[r.video_id] ??= []).push({ title: r.title, detail: r.detail })
  }

  res.json({
    videos,
    videoSteps: steps,
    // rejected 的不下发；pending 仍下发 —— 演示内容尚未经专业审核是既有事实，
    // 藏起来反而会让页面空掉。审核状态一并带出，后台据此展示。
    guidance: (db.prepare(
      `SELECT * FROM guidance_articles WHERE review_status <> 'rejected' ORDER BY sort_order`,
    ).all() as any[]).map(toGuidanceCard),
    presetQA: (db.prepare(
      `SELECT * FROM preset_qa WHERE review_status <> 'rejected' ORDER BY sort_order`,
    ).all() as any[]).map(toPresetQA),
    videoCategories: (db.prepare(
      'SELECT DISTINCT category FROM videos ORDER BY sort_order',
    ).all() as any[]).map((r) => r.category),
  })
})
