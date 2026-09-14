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
import { DEMO_PATIENTS } from '../src/data/demoPatients.ts'

beforeAll(() => { getDb(); runSeed() })
afterAll(() => closeDb())

describe('种子数据', () => {
  it('灌出演示登录账号', () => {
    const rows = getDb().prepare('SELECT username, role, status FROM users ORDER BY username').all() as any[]
    expect(rows.map((r) => r.username)).toContain('chen')
    expect(rows.map((r) => r.username)).toContain('dengyi')
    expect(rows.map((r) => r.username)).toContain('zhou')
    expect(rows).toHaveLength(19)
    for (const patient of DEMO_PATIENTS) {
      expect(rows.map((r) => r.username)).toContain(patient.username)
    }
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
    expect(visiblePatientIds('u-th-zhou', 'therapist')).toContain('p-001')
  })

  it('灌出邓仪第三位患者，并绑定独立家属账号与 zhou 康复师', () => {
    const db = getDb()
    const patient = db.prepare('SELECT name,address FROM patients WHERE id = ?').get('p-dengyi') as any
    expect(patient).toEqual({ name: '邓仪', address: '康乐小区3栋412室' })
    expect(visiblePatientIds('u-family-dengyi', 'family')).toEqual(['p-dengyi'])
    expect(visiblePatientIds('u-family-zhao', 'family')).not.toContain('p-dengyi')
    expect(visiblePatientIds('u-family-zhao', 'family')).toContain('p-zhao-grandpa')
    expect(visiblePatientIds('u-th-zhou', 'therapist')).toContain('p-dengyi')
  })

  it('主病例使用实名林秀兰', () => {
    const row = getDb().prepare('SELECT name FROM patients WHERE id = ?').get('p-001') as any
    expect(row.name).toBe('林秀兰')
  })

  it('邓仪计划已审核执行，并有完整动态记录', () => {
    const db = getDb()
    const plan = db.prepare('SELECT plan_status,plan_date FROM patient_goals WHERE patient_id = ?')
      .get('p-dengyi') as any
    expect(plan).toEqual({ plan_status: 'approved', plan_date: '2026-09-13' })
    const taskCount = (db.prepare('SELECT count(*) count FROM task_defs WHERE patient_id = ?')
      .get('p-dengyi') as any).count
    expect(taskCount).toBe(6)
    const counts = db.prepare(`SELECT
      (SELECT count(*) FROM check_ins WHERE patient_id='p-dengyi') checkIns,
      (SELECT count(*) FROM guidances WHERE patient_id='p-dengyi') guidances,
      (SELECT count(*) FROM messages WHERE patient_id='p-dengyi') messages,
      (SELECT count(*) FROM vitals WHERE patient_id='p-dengyi') vitals`).get() as any
    expect(counts.checkIns).toBeGreaterThan(100)
    expect(counts.guidances).toBeGreaterThanOrEqual(6)
    expect(counts.messages).toBeGreaterThanOrEqual(4)
    expect(counts.vitals).toBeGreaterThanOrEqual(8)
  })

  it('林秀兰处于康复起步期，不预置过往打卡、趋势和大量指导', () => {
    const db = getDb()
    for (const table of ['check_ins', 'vitals', 'guidances', 'messages']) {
      const count = (db.prepare(`SELECT count(*) count FROM ${table} WHERE patient_id='p-001'`).get() as any).count
      expect(count).toBe(0)
    }
    const taskCount = (db.prepare("SELECT count(*) count FROM task_defs WHERE patient_id='p-001'").get() as any).count
    expect(taskCount).toBeGreaterThan(0)
  })

  it('赵福安仅保留最小建档资料', () => {
    const db = getDb()
    const patient = db.prepare("SELECT name,age_band FROM patients WHERE id='p-zhao-grandpa'").get() as any
    expect(patient).toEqual({ name: '赵福安', age_band: '' })
    const taskCount = (db.prepare("SELECT count(*) count FROM task_defs WHERE patient_id='p-zhao-grandpa'").get() as any).count
    expect(taskCount).toBe(0)
  })

  it('新增 15 名患者按 5/5/5 三层灌入', () => {
    const db = getDb()
    expect((db.prepare('SELECT count(*) count FROM patients').get() as any).count).toBe(18)
    expect(visiblePatientIds('u-th-zhou', 'therapist')).toHaveLength(18)

    expect(DEMO_PATIENTS.filter((p) => p.tier === 'rich')).toHaveLength(5)
    expect(DEMO_PATIENTS.filter((p) => p.tier === 'starter')).toHaveLength(5)
    expect(DEMO_PATIENTS.filter((p) => p.tier === 'unassessed')).toHaveLength(5)
  })

  it('新增患者的资料丰富度符合所属阶段', () => {
    const db = getDb()
    for (const patient of DEMO_PATIENTS) {
      const tasks = (db.prepare('SELECT count(*) count FROM task_defs WHERE patient_id=?').get(patient.id) as any).count
      const checkIns = (db.prepare('SELECT count(*) count FROM check_ins WHERE patient_id=?').get(patient.id) as any).count
      const guidance = (db.prepare('SELECT count(*) count FROM guidances WHERE patient_id=?').get(patient.id) as any).count
      const goals = db.prepare('SELECT plan_status FROM patient_goals WHERE patient_id=?').get(patient.id) as any
      if (patient.tier === 'rich') {
        expect(tasks).toBe(3)
        expect(checkIns).toBe(42)
        expect(guidance).toBe(3)
        expect(goals.plan_status).toBe('approved')
      } else if (patient.tier === 'starter') {
        expect(tasks).toBe(2)
        expect(checkIns).toBe(0)
        expect(guidance).toBe(0)
        expect(goals.plan_status).toBe('approved')
      } else {
        expect(tasks).toBe(0)
        expect(checkIns).toBe(0)
        expect(guidance).toBe(0)
        expect(goals.plan_status).toBe('none')
      }
      expect(visiblePatientIds(`u-family-${patient.id.slice(2)}`, 'family')).toEqual([patient.id])
    }
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
    const visible = visiblePatientIds('u-th-zhou', 'therapist')
    expect(visible).toContain('p-001')
    expect(visible).not.toContain('p-test-002')
  })

  it('admin 直通全部在管患者', () => {
    expect(visiblePatientIds('whoever', 'admin')).toContain('p-001')
  })
})
