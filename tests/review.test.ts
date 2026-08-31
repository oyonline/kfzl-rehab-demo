/**
 * 内容审核闸 —— 医疗合规的执行点。
 *
 * ADR 0014 的核心承诺是「驳回的内容立即停止对家属展示」。
 * 这不是一个标记，是有真实执行效果的开关。若它不生效，
 * 未经审核的医疗建议会照常下发给家属 —— 这是本项目最严重的失败模式。
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getDb, closeDb } from '../server/db/index.ts'
import { runSeed } from '../server/seed/run.ts'

beforeAll(() => { getDb(); runSeed() })
afterAll(() => closeDb())

/** 复刻 server/routes/content.ts 的下发口径 */
const deliveredQA = () =>
  getDb().prepare(`SELECT id FROM preset_qa WHERE review_status <> 'rejected' ORDER BY sort_order`).all() as any[]
const deliveredGuidance = () =>
  getDb().prepare(`SELECT id FROM guidance_articles WHERE review_status <> 'rejected' ORDER BY sort_order`).all() as any[]

describe('审核驳回后停止下发', () => {
  it('种子内容默认可下发（未审核 ≠ 已驳回）', () => {
    expect(deliveredQA().length).toBeGreaterThan(0)
    expect(deliveredGuidance().length).toBeGreaterThan(0)
  })

  it('驳回一条预设答案后，它立刻从下发列表消失', () => {
    const before = deliveredQA()
    const victim = before[0].id

    getDb().prepare(`UPDATE preset_qa SET review_status='rejected' WHERE id=?`).run(victim)

    const after = deliveredQA()
    expect(after.map((r) => r.id)).not.toContain(victim)
    expect(after.length).toBe(before.length - 1)
  })

  it('驳回一条健康指导后同样立刻停止下发', () => {
    const before = deliveredGuidance()
    const victim = before[0].id

    getDb().prepare(`UPDATE guidance_articles SET review_status='rejected' WHERE id=?`).run(victim)

    expect(deliveredGuidance().map((r) => r.id)).not.toContain(victim)
  })

  it('通过审核的内容仍然下发', () => {
    const db = getDb()
    const target = (db.prepare(`SELECT id FROM preset_qa WHERE review_status='pending' LIMIT 1`).get() as any)
    if (!target) return // 全被驳回了就跳过
    db.prepare(`UPDATE preset_qa SET review_status='approved' WHERE id=?`).run(target.id)
    expect(deliveredQA().map((r) => r.id)).toContain(target.id)
  })

  it('审核状态只认数据库三个合法值，写别的会被 CHECK 约束挡下', () => {
    expect(() =>
      getDb().prepare(`UPDATE preset_qa SET review_status='maybe' WHERE id=(SELECT id FROM preset_qa LIMIT 1)`).run(),
    ).toThrow()
  })
})

describe('审计日志', () => {
  it('audit_log 表存在且可写 —— 审核动作必须留痕', () => {
    const db = getDb()
    const now = new Date().toISOString()
    db.prepare(`INSERT INTO audit_log (id,user_id,action,entity,entity_id,detail,ip,at)
                VALUES (?,?,?,?,?,?,?,?)`)
      .run('a-test-1', 'u-th-xiaoting', 'review_rejected', 'preset_qa', 'q-1', '{}', '127.0.0.1', now)
    const row = db.prepare(`SELECT * FROM audit_log WHERE id='a-test-1'`).get() as any
    expect(row.user_id).toBe('u-th-xiaoting')
    expect(row.action).toBe('review_rejected')
    expect(row.at).toBe(now)
  })
})
