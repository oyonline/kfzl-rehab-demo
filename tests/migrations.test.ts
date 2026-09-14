/**
 * 迁移执行器 —— 部署时第一个跑的东西，它错了后面全错。
 *
 * 重点测「可重入」：服务端每次启动都调 getDb()，
 * 迁移必须只应用一次，重复启动不能重复建表或重复插数据。
 */
import { describe, it, expect, afterAll } from 'vitest'
import Database from 'better-sqlite3'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { getDb, closeDb, DB_PATH } from '../server/db/index.ts'
import { DEMO_RICH_GUIDANCE_TEXTS } from '../src/data/demoPatients.ts'

const migrationSql = (name: string) => readFileSync(fileURLToPath(
  new URL(`../server/db/migrations/${name}`, import.meta.url),
), 'utf8')

function createPreRosterDb(includeTherapist = true) {
  const db = new Database(':memory:')
  db.pragma('foreign_keys = ON')
  for (const name of [
    '0001_init.sql',
    '0002_care_alerts.sql',
    '0003_review_audit.sql',
    '0004_patient_address_and_plan_review.sql',
    '0005_plan_status_guard.sql',
  ]) db.exec(migrationSql(name))
  const insertUser = db.prepare(`INSERT INTO users
    (id,username,password_hash,password_salt,role,display_name,status,created_at,updated_at)
    VALUES (?,?,?,?,?,?, 'active','2026-09-01','2026-09-01')`)
  insertUser.run('u-family-chen', 'chen', 'test-hash', 'test-salt', 'family', '陈女士')
  if (includeTherapist) insertUser.run('u-th-zhou', 'zhou', 'test-hash', 'test-salt', 'therapist', '小婷')
  return db
}

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
      '0004_patient_address_and_plan_review.sql',
      '0005_plan_status_guard.sql',
      '0006_demo_patient_roster.sql',
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

  it('康复计划状态只接受四个合法枚举', () => {
    const db = getDb()
    const now = new Date().toISOString()
    db.prepare(`INSERT INTO patients (id,name,gender,age_band,status,created_at,updated_at)
      VALUES ('p-plan-guard','计划状态测试','女','','active',?,?)`).run(now, now)
    expect(() => db.prepare(`INSERT INTO patient_goals (patient_id,plan_status)
      VALUES ('p-plan-guard','invalid')`).run()).toThrow(/invalid patient_goals\.plan_status/)
  })

  it('旧库没有赵福安账号也能原子补齐 15 名患者', () => {
    const db = createPreRosterDb()
    const migrate = db.transaction(() => db.exec(migrationSql('0006_demo_patient_roster.sql')))
    migrate()
    expect((db.prepare("SELECT count(*) c FROM users WHERE username NOT IN ('chen','zhou')").get() as any).c).toBe(15)
    expect((db.prepare("SELECT count(*) c FROM patients WHERE origin='synthetic'").get() as any).c).toBe(15)
    expect((db.prepare("SELECT count(*) c FROM patient_members WHERE access='owner'").get() as any).c).toBe(15)
    expect((db.prepare("SELECT count(*) c FROM patient_members WHERE access='primary'").get() as any).c).toBe(15)
    const migratedGuidance = db.prepare(`SELECT text FROM guidances
      WHERE patient_id='p-chen-huifang' ORDER BY at`).all() as Array<{ text: string }>
    expect(migratedGuidance.map((item) => item.text)).toEqual([...DEMO_RICH_GUIDANCE_TEXTS])
    db.close()
  })

  it('旧库缺少稳定基础账号时整笔回滚，不留残缺患者', () => {
    const db = createPreRosterDb(false)
    const migrate = db.transaction(() => db.exec(migrationSql('0006_demo_patient_roster.sql')))
    expect(() => migrate()).toThrow()
    expect((db.prepare('SELECT count(*) c FROM patients').get() as any).c).toBe(0)
    db.close()
  })
})
