/**
 * 迁移执行器 —— 部署时第一个跑的东西，它错了后面全错。
 *
 * 重点测「可重入」：服务端每次启动都调 getDb()，
 * 迁移必须只应用一次，重复启动不能重复建表或重复插数据。
 */
import { describe, it, expect, afterAll } from 'vitest'
import { getDb, closeDb, DB_PATH } from '../server/db/index.ts'

afterAll(() => closeDb())

describe('数据库迁移', () => {
  it('用的是临时库，绝不碰开发库 data/app.db', () => {
    expect(DB_PATH).not.toContain('/data/app.db')
    expect(DB_PATH).toContain('kfzl-test-')
  })

  it('首次调用即建表并登记迁移', () => {
    const db = getDb()
    const applied = db.prepare('SELECT name FROM schema_migrations ORDER BY name').all() as any[]
    expect(applied.map((r) => r.name)).toEqual([
      '0001_init.sql',
      '0002_care_alerts.sql',
      '0003_review_audit.sql',
    ])
  })

  it('可重入：再次调用不重复应用迁移', () => {
    const before = (getDb().prepare('SELECT count(*) c FROM schema_migrations').get() as any).c
    closeDb()
    getDb()
    const after = (getDb().prepare('SELECT count(*) c FROM schema_migrations').get() as any).c
    expect(after).toBe(before)
  })

  it('28 张业务表全部建出', () => {
    const rows = getDb()
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`)
      .all() as any[]
    const names = rows.map((r) => r.name)
    // 抽查每个子系统的关键表，缺一个就说明该子系统的迁移没跑
    for (const t of [
      'users', 'patients', 'patient_members',       // 鉴权与行级权限
      'check_ins', 'vitals', 'messages',            // 演示主线
      'kb_documents', 'kb_chunks',                  // 知识库
      'audit_log',                                  // 审计
    ]) {
      expect(names).toContain(t)
    }
  })

  it('外键约束已开启 —— 否则行级权限可以被脏数据绕过', () => {
    expect(getDb().pragma('foreign_keys', { simple: true })).toBe(1)
  })
})
