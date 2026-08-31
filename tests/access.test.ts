/**
 * 行级权限 —— 产品线最核心的安全不变量。
 *
 * 比赛版 PATIENT_ID 写死在 seed.ts，任何人拿到页面就能看全部数据。
 * 产品线必须逐患者校验，越权时还不能泄露「这个患者是否存在」。
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getDb, closeDb } from '../server/db/index.ts'
import { runSeed } from '../server/seed/run.ts'
import { visiblePatientIds } from '../server/auth/middleware.ts'

beforeAll(() => { getDb(); runSeed() })
afterAll(() => closeDb())

describe('种子数据', () => {
  it('灌出两个可登录账号', () => {
    const rows = getDb().prepare('SELECT username, role, status FROM users ORDER BY username').all() as any[]
    expect(rows.map((r) => r.username)).toContain('chen')
    expect(rows.map((r) => r.username)).toContain('xiaoting')
    // 停用账号登不进来，见 requireAuth 每次回库核 status
    expect(rows.every((r) => r.status === 'active')).toBe(true)
  })

  it('密码不落明文', () => {
    const rows = getDb().prepare('SELECT password_hash, password_salt FROM users').all() as any[]
    expect(rows.length).toBeGreaterThan(0)
    for (const r of rows) {
      expect(r.password_hash).not.toBe('123456')
      expect(r.password_salt).toBeTruthy()
    }
  })
})

describe('行级权限 patient_members', () => {
  it('家属与康复师都被授权到 p-001', () => {
    expect(visiblePatientIds('u-family-chen', 'family')).toContain('p-001')
    expect(visiblePatientIds('u-th-xiaoting', 'therapist')).toContain('p-001')
  })

  it('未授权用户看不到任何患者 —— 不是「看到空档案」而是「没有这一行」', () => {
    expect(visiblePatientIds('u-someone-else', 'family')).toEqual([])
  })

  it('授权是逐患者的，不是按角色一刀切', () => {
    const db = getDb()
    // 造一个第二患者，但不给任何人授权
    const now = new Date().toISOString()
    db.prepare(`INSERT INTO patients (id,name,gender,age_band,status,created_at,updated_at)
                VALUES ('p-test-002','测试患者','女','80 岁','active',?,?)`).run(now, now)

    // 康复师能看到 p-001，但看不到没授权的 p-test-002
    const visible = visiblePatientIds('u-th-xiaoting', 'therapist')
    expect(visible).toContain('p-001')
    expect(visible).not.toContain('p-test-002')
  })

  it('admin 直通全部在管患者', () => {
    expect(visiblePatientIds('whoever', 'admin')).toContain('p-001')
  })
})
