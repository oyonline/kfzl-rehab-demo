/**
 * 患者业务接口。
 *
 * 写操作的行为逐条对齐原 src/store/store.ts —— 它是双端联动的既有语义，
 * 换存储不改行为。前端 store 保持 14 个函数签名不变，页面零改动。
 *
 * 所有路由都过 requireAuth + requirePatientAccess：多患者下不能靠前端
 * 自觉只请求自己的患者，必须逐请求做行级校验。
 */

import { Router } from 'express'
import { getDb } from '../db/index.ts'
import { requireAuth, requireRole, requirePatientAccess, visiblePatientIds } from '../auth/middleware.ts'
import { publish, addClient } from '../events/bus.ts'
import { toCheckIn, toVital, toUpload, toMessage, toGuidance, toEscalation,
         toPatient, toTaskDef, toReminder } from './mappers.ts'
import { buildHistory, buildVitals, isBpAbnormal } from '../../src/data/seed.ts'

export const patientsRouter = Router()

const now = () => new Date().toISOString()
const J = (v: unknown) => JSON.stringify(v ?? [])

/**
 * 写入用「今天/时分」一律以北京时间为准（UTC+8）：演示用户在国内，部署容器
 * 默认 UTC，直接取容器本地时区会差 8 小时（线上实测：血压/打卡/上传全部中招）。
 */
function beijingNow(t = new Date()) {
  const d = new Date(t.getTime() + 8 * 3600e3)
  return { date: d.toISOString().slice(0, 10), time: d.toISOString().slice(11, 16) }
}

/**
 * Express 5 把路由参数类型化为 string | string[]（同名参数可重复出现）。
 * 本项目的路由里每个参数只出现一次，取首个即可 —— 但必须收窄，
 * 否则 string[] 会一路漏进 SQL 绑定。
 */
const one = (v: string | string[] | undefined): string =>
  Array.isArray(v) ? (v[0] ?? '') : (v ?? '')

/* ---------------- 读 ---------------- */

/** 当前用户可见的患者列表，带今日完成进度（替代前端写死的 roster） */
patientsRouter.get('/', requireAuth, (req, res) => {
  const db = getDb()
  const ids = visiblePatientIds(req.user!.sub, req.user!.role)
  if (ids.length === 0) return res.json({ patients: [] })

  const today = beijingNow().date
  const ph = ids.map(() => '?').join(',')
  // 工作台要的逐患者标记一次算齐：拆成前端逐个请求，7 位患者就是 7 轮往返。
  const rows = db.prepare(`
    SELECT p.id, p.name, p.gender, p.age_band, d.stage, m.access,
      (SELECT count(*) FROM task_defs t
        WHERE t.patient_id = p.id AND t.active_to IS NULL)                      AS today_total,
      (SELECT count(*) FROM check_ins c
        WHERE c.patient_id = p.id AND c.date = ? AND c.status = 'done')         AS today_done,
      (SELECT count(*) FROM escalations e
        WHERE e.patient_id = p.id AND e.status = 'pending')                     AS pending_count,
      (SELECT count(*) FROM uploads u
        WHERE u.patient_id = p.id AND u.date = ?)                               AS uploads_today
    FROM patients p
    LEFT JOIN patient_diagnosis d ON d.patient_id = p.id
    LEFT JOIN patient_members m   ON m.patient_id = p.id AND m.user_id = ?
    WHERE p.id IN (${ph}) AND p.status = 'active'
    ORDER BY p.created_at
  `).all(today, today, req.user!.sub, ...ids) as any[]

  // 血压超标要按安全范围逐条判，SQL 里写不干净，取出来用同一个判定函数 ——
  // 两端必须用同一套阈值，否则列表标红而详情页说正常。
  const bpAlerts = new Map<string, boolean>()
  for (const id of ids) {
    const vs = db.prepare('SELECT systolic, diastolic FROM vitals WHERE patient_id = ? AND date = ?')
      .all(id, today) as any[]
    bpAlerts.set(id, vs.some(isBpAbnormal))
  }

  res.json({
    patients: rows.map((r) => ({
      id: r.id, name: r.name, gender: r.gender, ageBand: r.age_band,
      stage: r.stage ?? '', todayDone: r.today_done, todayTotal: r.today_total,
      pendingCount: r.pending_count, uploadsToday: r.uploads_today,
      bpAlert: bpAlerts.get(r.id) ?? false,
      // 主责/协管才能点进详情；其余只在名单里呈现服务规模
      canOpen: r.access === 'primary' || r.access === 'owner' || req.user!.role === 'admin',
    })),
  })
})

/**
 * 建档。
 *
 * 2026-08-30 用户裁决：**不预置假病例**，另 6 位患者改由真实录入产生。
 * 因此这里只收最基本的身份与照护信息 —— 诊断、评估、用药、计划都要
 * 专业人员按实际情况录入，本接口不替他们生成任何医学内容。
 *
 * 建档人自动成为主责康复师。
 */
patientsRouter.post('/', requireAuth, requireRole('therapist', 'admin'), (req, res) => {
  const db = getDb()
  const { name, gender, ageBand, stage, caregiverName, caregiverRelation } = req.body ?? {}
  if (typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'bad_request', message: '姓名不能为空' })
  }
  if (gender !== '男' && gender !== '女') {
    return res.status(400).json({ error: 'bad_request', message: '请选择性别' })
  }

  const t = now()
  const id = `p-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4).toString(36)}`

  db.transaction(() => {
    db.prepare(`INSERT INTO patients
      (id,name,gender,age_band,living_situation,psychosocial,communication,avatar,
       primary_therapist_id,origin,status,created_at,updated_at)
      VALUES (?,?,?,?,'','','','',?,'synthetic','active',?,?)`)
      .run(id, name.trim(), gender, typeof ageBand === 'string' ? ageBand : '', req.user!.sub, t, t)
    db.prepare('INSERT INTO patient_members (patient_id,user_id,relation,access,granted_at,granted_by) VALUES (?,?,?,?,?,?)')
      .run(id, req.user!.sub, '主管康复师', 'primary', t, req.user!.sub)
    db.prepare('INSERT INTO patient_diagnosis (patient_id,stage,comorbidities) VALUES (?,?,\'[]\')')
      .run(id, typeof stage === 'string' ? stage : '')
    db.prepare('INSERT INTO patient_function (patient_id,risks,care_alerts) VALUES (?,\'[]\',\'[]\')').run(id)
    db.prepare('INSERT INTO patient_goals (patient_id,short_term) VALUES (?,\'[]\')').run(id)
    db.prepare(`INSERT INTO patient_contact
      (patient_id,caregiver_name,caregiver_relation,assistive_devices,past_history)
      VALUES (?,?,?,'[]','[]')`)
      .run(id, typeof caregiverName === 'string' ? caregiverName : '',
           typeof caregiverRelation === 'string' ? caregiverRelation : '')
    db.prepare(`INSERT INTO audit_log (id,user_id,action,entity,entity_id,detail,at)
      VALUES (?,?,'create','patient',?,?,?)`)
      .run(`al-${Date.now()}`, req.user!.sub, id, JSON.stringify({ name: name.trim() }), t)
  })()

  res.status(201).json({ id })
})

/** 动态层全量 —— 对应前端的 useDemoState() */
patientsRouter.get('/:id/state', requireAuth, requirePatientAccess(), (req, res) => {
  const db = getDb()
  const id = one(req.params.id)
  res.json({
    checkIns: (db.prepare('SELECT * FROM check_ins WHERE patient_id = ? ORDER BY date, task_id').all(id) as any[]).map(toCheckIn),
    vitals: (db.prepare('SELECT * FROM vitals WHERE patient_id = ? ORDER BY at').all(id) as any[]).map(toVital),
    uploads: (db.prepare('SELECT * FROM uploads WHERE patient_id = ? ORDER BY uploaded_at').all(id) as any[]).map(toUpload),
    messages: (db.prepare('SELECT * FROM messages WHERE patient_id = ? ORDER BY at').all(id) as any[]).map(toMessage),
    guidances: (db.prepare('SELECT * FROM guidances WHERE patient_id = ? ORDER BY at').all(id) as any[]).map(toGuidance),
    escalations: (db.prepare(`
      SELECT e.*, u.display_name AS therapist_name
      FROM escalations e LEFT JOIN users u ON u.id = e.answered_by
      WHERE e.patient_id = ? ORDER BY e.at`).all(id) as any[]).map(toEscalation),
  })
})

/**
 * 档案包 —— 一次取齐页面渲染所需的稳定层数据。
 *
 * 拆成 4 个接口的话，首屏要连打 4 次；这些数据只在复评后变，
 * 合成一个包更划算。动态层仍走 /state，两者变更频率差好几个数量级。
 */
patientsRouter.get('/:id/profile', requireAuth, requirePatientAccess(), (req, res) => {
  const db = getDb()
  const id = one(req.params.id)
  const p = db.prepare('SELECT * FROM patients WHERE id = ?').get(id) as any
  if (!p) return res.status(404).json({ error: 'not_found' })

  const func = db.prepare('SELECT * FROM patient_function WHERE patient_id = ?').get(id) as any
  const patient = toPatient(p, {
    diagnosis: db.prepare('SELECT * FROM patient_diagnosis WHERE patient_id = ?').get(id),
    func,
    goals: db.prepare('SELECT * FROM patient_goals WHERE patient_id = ?').get(id),
    contact: db.prepare('SELECT * FROM patient_contact WHERE patient_id = ?').get(id),
    meds: db.prepare('SELECT * FROM medications WHERE patient_id = ? ORDER BY sort_order').all(id) as any[],
    assessments: db.prepare('SELECT * FROM assessments WHERE patient_id = ? ORDER BY sort_order').all(id) as any[],
    admission: db.prepare('SELECT * FROM admissions WHERE patient_id = ? LIMIT 1').get(id),
    events: db.prepare('SELECT * FROM care_events WHERE patient_id = ? ORDER BY date').all(id) as any[],
  })

  // active_to IS NULL = 当前生效的那版计划。历史打卡回看仍能对上当时的版本，
  // 因为 check_ins 存的是 task_id，任务行本身不删。
  const tasks = (db.prepare(
    'SELECT * FROM task_defs WHERE patient_id = ? AND active_to IS NULL ORDER BY scheduled_time',
  ).all(id) as any[]).map(toTaskDef)

  const th = db.prepare(
    'SELECT id, display_name, title FROM users WHERE id = ?',
  ).get(p.primary_therapist_id) as any

  const planConfirmedOn = (db.prepare(
    'SELECT confirmed_on FROM task_defs WHERE patient_id = ? AND confirmed_on IS NOT NULL ORDER BY confirmed_on DESC LIMIT 1',
  ).get(id) as any)?.confirmed_on ?? null

  res.json({
    patient,
    // 「今日须注意」：绑定具体评估结论的照护动作，按患者存（迁移 0002）。
    // 不放进 Patient 里 —— types.ts 是双端冻结契约，这里作为兄弟字段下发即可。
    careAlerts: (() => { try { return JSON.parse(func?.care_alerts ?? '[]') } catch { return [] } })(),
    tasks,
    therapist: th ? { id: th.id, name: th.display_name, title: th.title ?? '' } : null,
    reminders: (db.prepare(
      'SELECT * FROM reminders WHERE patient_id = ? AND enabled = 1 ORDER BY time',
    ).all(id) as any[]).map(toReminder),
    planConfirmedOn,
    // 建档日期取 patients.created_at —— 这才是「档案何时建立」。
    // 此前抽屉标着「建档」却取首次打卡日期，两者对林奶奶恰好都是 7-07，
    // 新建患者没有打卡就露馅（显示成别人的日期或半截空文字）。
    createdOn: (p.created_at ?? '').slice(0, 10) || null,
    homecareStart: (db.prepare(
      'SELECT min(date) d FROM check_ins WHERE patient_id = ?',
    ).get(id) as any)?.d ?? null,
  })
})

/* ---------------- SSE ---------------- */

patientsRouter.get('/:id/events', requireAuth, requirePatientAccess(), (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  // nginx 之类会缓冲 SSE，缓冲住就等于没有实时性
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders?.()
  res.write(': connected\n\n')

  const remove = addClient(one(req.params.id), res)
  req.on('close', remove)
})

/* ---------------- 写 ---------------- */

/**
 * 打卡 upsert。id 由前端生成并回传，重复提交同一 id 不会产生第二条 ——
 * 乐观更新下网络重试是常态，服务端必须幂等。
 */
patientsRouter.put('/:id/checkins', requireAuth, requirePatientAccess(), (req, res) => {
  const db = getDb()
  const patientId = one(req.params.id)
  const { taskId, status, note, date } = req.body ?? {}
  if (typeof taskId !== 'string' || typeof status !== 'string') {
    return res.status(400).json({ error: 'bad_request', message: '缺少 taskId 或 status' })
  }
  const d = typeof date === 'string' ? date : beijingNow().date

  const task = db.prepare('SELECT id FROM task_defs WHERE id = ? AND patient_id = ?').get(taskId, patientId)
  if (!task) return res.status(404).json({ error: 'task_not_found', message: '该患者没有此任务' })

  const existing = db.prepare('SELECT * FROM check_ins WHERE patient_id = ? AND task_id = ? AND date = ?')
    .get(patientId, taskId, d) as any
  const at = status === 'done' || status === 'difficulty' ? now() : null
  const id = existing?.id ?? `ci-${d}-${taskId}`
  const finalNote = note ?? existing?.note ?? null

  if (existing) {
    db.prepare('UPDATE check_ins SET status = ?, note = ?, at = ?, recorded_by = ? WHERE id = ?')
      .run(status, finalNote, at, req.user!.sub, existing.id)
  } else {
    db.prepare(`INSERT INTO check_ins (id,patient_id,task_id,date,status,note,at,recorded_by)
      VALUES (?,?,?,?,?,?,?,?)`).run(id, patientId, taskId, d, status, finalNote, at, req.user!.sub)
  }
  publish(patientId, 'checkin')
  res.json(toCheckIn(db.prepare('SELECT * FROM check_ins WHERE id = ?').get(id)))
})

patientsRouter.post('/:id/vitals', requireAuth, requirePatientAccess(), (req, res) => {
  const db = getDb()
  const patientId = one(req.params.id)
  const { systolic, diastolic, by, id: clientId } = req.body ?? {}
  if (!Number.isFinite(systolic) || !Number.isFinite(diastolic)) {
    return res.status(400).json({ error: 'bad_request', message: '血压值必须是数字' })
  }
  const t = new Date()
  const id = typeof clientId === 'string' && clientId ? clientId : `vital-${t.getTime()}`
  const { date: bDate, time } = beijingNow(t)
  db.prepare(`INSERT OR REPLACE INTO vitals
    (id,patient_id,date,time,systolic,diastolic,by,at,recorded_by) VALUES (?,?,?,?,?,?,?,?,?)`)
    .run(id, patientId, bDate, time, systolic, diastolic, by ?? '家属', t.toISOString(), req.user!.sub)
  publish(patientId, 'vital')
  res.json(toVital(db.prepare('SELECT * FROM vitals WHERE id = ?').get(id)))
})

/** 模拟上传：只记元数据，同时把当天该任务的打卡关联到这次上传 */
patientsRouter.post('/:id/uploads', requireAuth, requirePatientAccess(), (req, res) => {
  const db = getDb()
  const patientId = one(req.params.id)
  const { taskId, filename, sizeLabel, playbackVideoId, id: clientId } = req.body ?? {}
  if (typeof taskId !== 'string' || typeof filename !== 'string') {
    return res.status(400).json({ error: 'bad_request', message: '缺少 taskId 或 filename' })
  }
  const t = new Date()
  const d = beijingNow(t).date
  const id = typeof clientId === 'string' && clientId ? clientId : `up-${t.getTime()}`

  db.transaction(() => {
    db.prepare(`INSERT OR REPLACE INTO uploads
      (id,patient_id,task_id,date,filename,size_label,playback_video_id,uploaded_at,uploaded_by,origin)
      VALUES (?,?,?,?,?,?,?,?,?,'simulated')`)
      .run(id, patientId, taskId, d, filename, sizeLabel ?? null, playbackVideoId ?? null, t.toISOString(), req.user!.sub)
    db.prepare('UPDATE check_ins SET upload_id = ? WHERE patient_id = ? AND task_id = ? AND date = ?')
      .run(id, patientId, taskId, d)
  })()
  publish(patientId, 'upload')
  res.json(toUpload(db.prepare('SELECT * FROM uploads WHERE id = ?').get(id)))
})

patientsRouter.post('/:id/messages', requireAuth, requirePatientAccess(), (req, res) => {
  const db = getDb()
  const patientId = one(req.params.id)
  const { id: clientId, role, text, externalText, answerSource, basis, escalated } = req.body ?? {}
  if (typeof role !== 'string' || typeof text !== 'string') {
    return res.status(400).json({ error: 'bad_request', message: '缺少 role 或 text' })
  }
  const id = typeof clientId === 'string' && clientId ? clientId : `msg-${Date.now()}`
  db.prepare(`INSERT OR REPLACE INTO messages
    (id,patient_id,role,text,external_text,answer_source,basis,sources,escalated,at,author_user_id)
    VALUES (?,?,?,?,?,?,?,'[]',?,?,?)`)
    .run(id, patientId, role, text, externalText ?? null, answerSource ?? null,
         J(basis), escalated ? 1 : 0, now(), req.user!.sub)
  publish(patientId, 'message')
  res.json(toMessage(db.prepare('SELECT * FROM messages WHERE id = ?').get(id)))
})

patientsRouter.post('/:id/guidances', requireAuth, requirePatientAccess(), (req, res) => {
  const db = getDb()
  const patientId = one(req.params.id)
  const { id: clientId, text, therapistName, aboutTaskId, aboutDate } = req.body ?? {}
  if (typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'bad_request', message: '指导内容不能为空' })
  }
  const id = typeof clientId === 'string' && clientId ? clientId : `gd-${Date.now()}`
  db.prepare(`INSERT OR REPLACE INTO guidances
    (id,patient_id,therapist_user_id,therapist_name,text,about_task_id,about_date,read_by_family,at)
    VALUES (?,?,?,?,?,?,?,0,?)`)
    .run(id, patientId, req.user!.sub, therapistName ?? req.user!.displayName,
         text, aboutTaskId ?? null, aboutDate ?? null, now())
  publish(patientId, 'guidance')
  res.json(toGuidance(db.prepare('SELECT * FROM guidances WHERE id = ?').get(id)))
})

/** 标已读。不传 id 即全部标已读（家属端进今日页触发） */
patientsRouter.post('/:id/guidances/read', requireAuth, requirePatientAccess(), (req, res) => {
  const db = getDb()
  const patientId = one(req.params.id)
  const { id } = req.body ?? {}
  const r = id
    ? db.prepare('UPDATE guidances SET read_by_family = 1, read_at = ? WHERE id = ? AND patient_id = ? AND read_by_family = 0').run(now(), id, patientId)
    : db.prepare('UPDATE guidances SET read_by_family = 1, read_at = ? WHERE patient_id = ? AND read_by_family = 0').run(now(), patientId)
  // 无实际变更就不广播，避免「进页面即刷屏」把所有连接惊醒一遍
  if (r.changes > 0) publish(patientId, 'guidance')
  res.json({ updated: r.changes })
})

patientsRouter.post('/:id/escalations', requireAuth, requirePatientAccess(), (req, res) => {
  const db = getDb()
  const patientId = one(req.params.id)
  const { id: clientId, source, question, context, taskId } = req.body ?? {}
  if (typeof question !== 'string' || !question.trim()) {
    return res.status(400).json({ error: 'bad_request', message: '问题内容不能为空' })
  }
  const id = typeof clientId === 'string' && clientId ? clientId : `esc-${Date.now()}`
  db.prepare(`INSERT OR REPLACE INTO escalations
    (id,patient_id,source,task_id,question,context,status,at,raised_by)
    VALUES (?,?,?,?,?,?,'pending',?,?)`)
    .run(id, patientId, source ?? 'chat', taskId ?? null, question, J(context), now(), req.user!.sub)
  publish(patientId, 'escalation')
  res.json(toEscalation(db.prepare('SELECT * FROM escalations WHERE id = ?').get(id)))
})

/**
 * 康复师答复：既落 escalations 供工作台追踪，也镜像一条 therapist 消息，
 * 让家属在同一个对话里看到回复 —— 与原 store.answerEscalation 一致。
 */
patientsRouter.patch('/:id/escalations/:escId', requireAuth, requirePatientAccess(), (req, res) => {
  const db = getDb()
  // therapistName 前端仍会传，但服务端不采信：答复人一律由 answered_by 关联
  // users 表取显示名，避免前端伪造他人署名
  const { answer, messageId } = req.body ?? {}
  if (typeof answer !== 'string' || !answer.trim()) {
    return res.status(400).json({ error: 'bad_request', message: '回复内容不能为空' })
  }
  const esc = db.prepare('SELECT * FROM escalations WHERE id = ?').get(one(req.params.escId)) as any
  if (!esc) return res.status(404).json({ error: 'not_found' })

  // requirePatientAccess 校验的是 URL 里的患者，还要确认这条咨询确实属于他，
  // 否则可以拿自己有权访问的患者 id 去改别人患者下的咨询
  if (esc.patient_id !== one(req.params.id)) {
    return res.status(404).json({ error: 'not_found' })
  }

  const at = now()
  db.transaction(() => {
    db.prepare('UPDATE escalations SET status = ?, answer = ?, answered_at = ?, answered_by = ? WHERE id = ?')
      .run('answered', answer, at, req.user!.sub, esc.id)
    db.prepare(`INSERT OR REPLACE INTO messages
      (id,patient_id,role,text,basis,sources,escalated,at,author_user_id)
      VALUES (?,?,'therapist',?,'[]','[]',0,?,?)`)
      .run(messageId ?? `msg-${Date.now()}`, esc.patient_id, answer, at, req.user!.sub)
  })()
  publish(esc.patient_id, 'escalation')
  res.json({ ok: true })
})

/** 跨患者待处理，康复师工作台的收件箱 */
patientsRouter.get('/inbox/pending', requireAuth, (req, res) => {
  const db = getDb()
  const ids = visiblePatientIds(req.user!.sub, req.user!.role)
  if (ids.length === 0) return res.json({ escalations: [] })
  const ph = ids.map(() => '?').join(',')
  const rows = db.prepare(`
    SELECT e.*, p.name AS patient_name, u.display_name AS therapist_name,
           c.caregiver_name, c.caregiver_relation,
           t.title AS task_title, t.scheduled_time AS task_time
    FROM escalations e
    JOIN patients p            ON p.id = e.patient_id
    LEFT JOIN users u          ON u.id = e.answered_by
    LEFT JOIN patient_contact c ON c.patient_id = e.patient_id
    LEFT JOIN task_defs t      ON t.id = e.task_id
    WHERE e.patient_id IN (${ph})
    ORDER BY e.at DESC`).all(...ids) as any[]

  const shape = (r: any) => ({
    ...toEscalation(r),
    patientName: r.patient_name,
    caregiverName: r.caregiver_name ?? '',
    caregiverRelation: r.caregiver_relation ?? '',
    taskLabel: r.task_title ? `${r.task_time} ${r.task_title}` : undefined,
  })
  res.json({
    escalations: rows.filter((r) => r.status === 'pending').map(shape),
    answered: rows.filter((r) => r.status === 'answered').map(shape),
  })
})

/**
 * 排练重置：清掉动态记录并重灌固定模式的历史。
 * 换后端后必须显式保留这条路径，否则每次彩排的数据会累积到正式演示那天的图表上
 * （docs/后端与知识库方案.md §5 坑 4）。
 */
patientsRouter.post('/:id/reset', requireAuth, requirePatientAccess(), (req, res) => {
  const db = getDb()
  const patientId = one(req.params.id)
  if (req.patientAccess !== 'owner' && req.patientAccess !== 'primary' && req.user!.role !== 'admin') {
    return res.status(403).json({ error: 'forbidden', message: '仅主责康复师或管理员可重置' })
  }
  const today = new Date()
  db.transaction(() => {
    for (const t of ['escalations', 'guidances', 'messages', 'uploads', 'vitals', 'check_ins']) {
      db.prepare(`DELETE FROM ${t} WHERE patient_id = ?`).run(patientId)
    }
    const ci = db.prepare(`INSERT INTO check_ins (id,patient_id,task_id,date,status,note,at) VALUES (?,?,?,?,?,?,?)`)
    for (const c of buildHistory(today)) {
      ci.run(c.id, patientId, c.taskId, c.date, c.status, c.note ?? null, c.at ?? null)
    }
    const v = db.prepare(`INSERT INTO vitals (id,patient_id,date,time,systolic,diastolic,by,at) VALUES (?,?,?,?,?,?,?,?)`)
    for (const rec of buildVitals(today)) {
      v.run(rec.id, patientId, rec.date, rec.time, rec.systolic, rec.diastolic, rec.by, rec.at)
    }
  })()
  publish(patientId, 'reset')
  res.json({ ok: true })
})
