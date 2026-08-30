/**
 * 种子灌入 —— 把 src/data/ 里的演示数据搬进数据库。
 *
 * 只灌林奶奶一位患者：2026-08-30 用户裁决「不为演示编造第二份病例，
 * 另 6 位改为由建档功能真实录入」。因此 roster 不再预置。
 *
 * 幂等：每次运行先清空业务表再重灌，便于反复排练。
 * 用 `pnpm seed` 执行。
 */

import { getDb, closeDb } from '../db/index.ts'
import { basename } from 'path'
import type { Assessment, CareEvent, Medication } from '../../src/data/types.ts'
import { hashPassword } from '../auth/password.ts'
import {
  patient, taskDefs, videos, therapist,
  PLAN_CONFIRMED_ON, HOMECARE_START, buildHistory, buildVitals,
} from '../../src/data/seed.ts'
import { VIDEO_STEPS } from '../../src/data/videoSteps.ts'
import { CARE_ALERTS, GUIDANCE } from '../../src/data/guidance.ts'
import { PRESET_QA } from '../../src/data/qa.ts'
import { DAILY_REMINDERS } from '../../src/data/reminders.ts'

const now = new Date().toISOString()
const J = (v: unknown) => JSON.stringify(v ?? [])

const db = getDb()

// 清空顺序与外键依赖相反
const TABLES = [
  'audit_log', 'kb_search_log',
  'escalations', 'guidances', 'messages', 'uploads', 'vitals', 'check_ins',
  'preset_qa', 'guidance_articles', 'video_steps', 'reminders', 'task_defs', 'videos',
  'care_events', 'admissions', 'assessments', 'medications',
  'patient_contact', 'patient_goals', 'patient_function', 'patient_diagnosis',
  'patient_members', 'patients', 'users',
]

const seed = db.transaction(() => {
  // 知识库语料不由种子管理（归 pnpm kb:import），但 kb_documents.reviewed_by
  // 指向 users，直接删 users 会撞外键。先摘掉审核人引用 ——
  // 重灌用户等于审核归属已不可考，保留 review_status 但清掉「谁审的」。
  db.prepare('UPDATE kb_documents SET reviewed_by = NULL, reviewed_at = NULL WHERE reviewed_by IS NOT NULL').run()
  for (const t of TABLES) db.prepare(`DELETE FROM ${t}`).run()

  /* ---------- 用户 ---------- */
  // 演示口令沿用 123456，但库里存的是 scrypt 哈希，不再是明文常量。
  // 正式部署必须改密 —— 见方案 §3.2。
  const users = [
    { id: 'u-family-chen', username: 'chen', pw: '123456', role: 'family',
      display: '陈女士（女儿）', title: null },
    { id: 'u-th-xiaoting', username: 'xiaoting', pw: '123456', role: 'therapist',
      display: therapist.name, title: therapist.title },
  ]
  const insUser = db.prepare(`INSERT INTO users
    (id, username, password_hash, password_salt, role, display_name, title, status, created_at, updated_at)
    VALUES (?,?,?,?,?,?,?,'active',?,?)`)
  for (const u of users) {
    const { hash, salt } = hashPassword(u.pw)
    insUser.run(u.id, u.username, hash, salt, u.role, u.display, u.title, now, now)
  }

  /* ---------- 患者 ---------- */
  const p = patient
  db.prepare(`INSERT INTO patients
    (id,name,gender,age_band,height_cm,weight_kg,living_situation,psychosocial,communication,
     avatar,primary_therapist_id,origin,status,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'active',?,?)`)
    .run(p.id, p.name, p.gender, p.ageBand, p.heightCm, p.weightKg, p.livingSituation,
         p.psychosocial ?? null, p.communication, p.avatar, 'u-th-xiaoting', p.origin, now, now)

  const insMember = db.prepare(`INSERT INTO patient_members
    (patient_id,user_id,relation,access,granted_at) VALUES (?,?,?,?,?)`)
  insMember.run(p.id, 'u-family-chen', p.caregiver.relation, 'owner', now)
  insMember.run(p.id, 'u-th-xiaoting', '主管康复师', 'primary', now)

  db.prepare(`INSERT INTO patient_diagnosis
    (patient_id,stroke_type,onset_date,stage,comorbidities) VALUES (?,?,?,?,?)`)
    .run(p.id, p.diagnosis.strokeType, p.diagnosis.onsetDate, p.diagnosis.stage, J(p.diagnosis.comorbidities))

  db.prepare(`INSERT INTO patient_function
    (patient_id,affected_side,mobility,swallowing,cognition,risks,care_alerts) VALUES (?,?,?,?,?,?,?)`)
    .run(p.id, p.functionStatus.affectedSide, p.functionStatus.mobility,
         p.functionStatus.swallowing, p.functionStatus.cognition,
         J(p.functionStatus.risks), J(CARE_ALERTS))

  db.prepare(`INSERT INTO patient_goals (patient_id,short_term,next_review_date) VALUES (?,?,?)`)
    .run(p.id, J(p.goals.shortTerm), p.goals.nextReviewDate)

  db.prepare(`INSERT INTO patient_contact
    (patient_id,emergency_name,emergency_relation,emergency_phone,
     caregiver_name,caregiver_relation,assistive_devices,past_history) VALUES (?,?,?,?,?,?,?,?)`)
    .run(p.id, p.emergencyContact.name, p.emergencyContact.relation, p.emergencyContact.phoneMasked,
         p.caregiver.name, p.caregiver.relation, J(p.assistiveDevices), J(p.pastHistory))

  const insMed = db.prepare(`INSERT INTO medications
    (id,patient_id,name,dose,times,notes,confirmed,sort_order) VALUES (?,?,?,?,?,?,?,?)`)
  p.medications.forEach((m: Medication, i: number) =>
    insMed.run(m.id, p.id, m.name, m.dose, J(m.times), m.notes ?? null, m.confirmed ? 1 : 0, i))

  const insAss = db.prepare(`INSERT INTO assessments
    (id,patient_id,name,value,level,tile_label,tile_value,tile_note,date,assessor,note,visible_to_family,sort_order)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
  p.assessments.forEach((a: Assessment, i: number) =>
    insAss.run(`as-${p.id}-${i + 1}`, p.id, a.name, a.value, a.level ?? null,
      a.tile?.label ?? null, a.tile?.value ?? null, a.tile?.note ?? null,
      a.date, a.assessor, a.note, a.visibleToFamily ? 1 : 0, i))

  const ad = p.admission
  db.prepare(`INSERT INTO admissions
    (id,patient_id,admitted_on,discharged_on,facility,department,chief_complaint,
     admission_diagnosis,course,discharge_status,discharge_orders) VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
    .run(`adm-${p.id}-1`, p.id, ad.admittedOn, ad.dischargedOn, ad.facility, ad.department,
         ad.chiefComplaint, J(ad.admissionDiagnosis), ad.course, ad.dischargeStatus, J(ad.dischargeOrders))

  const insEvt = db.prepare(`INSERT INTO care_events
    (id,patient_id,date,kind,title,detail) VALUES (?,?,?,?,?,?)`)
  p.careEvents.forEach((e: CareEvent, i: number) => insEvt.run(`ce-${p.id}-${i + 1}`, p.id, e.date, e.kind, e.title, e.detail))

  /* ---------- 内容库 ---------- */
  const insVid = db.prepare(`INSERT INTO videos
    (id,title,category,src,poster,target,goal,cautions,duration_sec,origin,sort_order)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
  videos.forEach((v, i) => insVid.run(v.id, v.title, v.category, v.src ?? null, v.poster ?? null,
    v.target ?? null, v.goal ?? null, J(v.cautions), v.durationSec ?? null, v.origin, i))

  const insStep = db.prepare(`INSERT INTO video_steps (video_id,seq,title,detail) VALUES (?,?,?,?)`)
  for (const [vid, steps] of Object.entries(VIDEO_STEPS)) {
    steps.forEach((s, i) => insStep.run(vid, i, s.title, s.detail))
  }

  /* ---------- 计划 ---------- */
  const insTask = db.prepare(`INSERT INTO task_defs
    (id,patient_id,kind,title,scheduled_time,instruction,cautions,video_id,reps,duration_min,
     requires_video_upload,origin,confirmed_on,active_from,active_to) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,NULL)`)
  for (const t of taskDefs) {
    insTask.run(t.id, p.id, t.kind, t.title, t.scheduledTime, t.instruction, J(t.cautions),
      t.videoId ?? null, t.reps ?? null, t.durationMin ?? null,
      t.requiresVideoUpload ? 1 : 0, t.origin, PLAN_CONFIRMED_ON, HOMECARE_START)
  }

  const insRem = db.prepare(`INSERT INTO reminders
    (id,patient_id,time,text,task_id,highlight,enabled) VALUES (?,?,?,?,?,?,1)`)
  for (const r of DAILY_REMINDERS) {
    insRem.run(r.id, p.id, r.time, r.text, r.taskId ?? null, r.highlight ? 1 : 0)
  }

  /* ---------- 待审内容（README 的三个 REVIEW REQUIRED 就此进库） ---------- */
  const insGuide = db.prepare(`INSERT INTO guidance_articles
    (id,title,summary,items,alert,related_video_id,origin,review_status,sort_order,updated_at)
    VALUES (?,?,?,?,?,?,'team_reviewed','pending',?,?)`)
  GUIDANCE.forEach((g, i) => insGuide.run(g.id, g.title, g.summary, J(g.items),
    g.alert ?? null, g.relatedVideoId ?? null, i, now))

  const insQA = db.prepare(`INSERT INTO preset_qa
    (id,question,basis,external,answer,escalate,escalate_hint,origin,review_status,sort_order)
    VALUES (?,?,?,?,?,?,?,'team_reviewed','pending',?)`)
  PRESET_QA.forEach((q, i) => insQA.run(q.id, q.question, J(q.basis), J(q.external), J(q.answer),
    q.escalate ? 1 : 0, q.escalateHint ?? null, i))

  /* ---------- 历史打卡与血压 ---------- */
  const today = new Date()
  const insCI = db.prepare(`INSERT INTO check_ins
    (id,patient_id,task_id,date,status,note,at,upload_id) VALUES (?,?,?,?,?,?,?,NULL)`)
  for (const c of buildHistory(today)) {
    insCI.run(c.id, c.patientId, c.taskId, c.date, c.status, c.note ?? null, c.at ?? null)
  }

  const insV = db.prepare(`INSERT INTO vitals
    (id,patient_id,date,time,systolic,diastolic,by,at) VALUES (?,?,?,?,?,?,?,?)`)
  for (const v of buildVitals(today)) {
    insV.run(v.id, v.patientId, v.date, v.time, v.systolic, v.diastolic, v.by, v.at)
  }

  /* ---------- 知识库集合 ---------- */
  // OR IGNORE：集合的 enabled 与 disclaimer 是运维可调的状态
  // （政策集合的开关就是用户裁决过的），重灌演示数据不该把它们冲回默认值。
  // 不存在时建，存在就原样保留。
  db.prepare(`INSERT OR IGNORE INTO kb_collections (id,name,description,disclaimer,enabled,sort_order)
    VALUES (?,?,?,?,?,?)`).run(
    'kb-m1', '智能问答知识库',
    '甲方模块一：脑卒中基础知识、照护技能、家属常问、术语解释、应急指导',
    null, 1, 0)
  db.prepare(`INSERT OR IGNORE INTO kb_collections (id,name,description,disclaimer,enabled,sort_order)
    VALUES (?,?,?,?,?,?)`).run(
    'kb-m7', '政策咨询与福利',
    '甲方模块七：养老康复补贴、消费券惠民、医保报销、长护险',
    // 2026-08-30 用户裁决：该集合开放（enabled=1）。13 篇中 10 篇带 AI 生成标注，
    // 且政策具时效性，故命中时强制附此声明。降权与来源标注见 kb_documents.provenance。
    '政策以当地最新公布为准，具体办理请以经办机构口径为准。',
    1, 1)
})

/**
 * 幂等灌种子：清空业务表再重灌。
 * 服务端启动时检测到空库（部署环境没人手动跑 seed）也会调用它。
 */
export function runSeed(): void {
  seed()
}

const count = (t: string) => (db.prepare(`SELECT count(*) c FROM ${t}`).get() as any).c

/** 命令行直接执行时（pnpm seed）才走这段；被服务端 import 时只暴露 runSeed */
if (process.argv[1] && import.meta.url.endsWith(basename(process.argv[1]))) {
  runSeed()
  console.log('种子灌入完成：')
  for (const t of ['users','patients','patient_members','medications','assessments','care_events',
                   'videos','video_steps','task_defs','reminders','guidance_articles','preset_qa',
                   'check_ins','vitals','kb_collections']) {
    console.log(`  ${t.padEnd(20)} ${count(t)}`)
  }
  closeDb()
}
