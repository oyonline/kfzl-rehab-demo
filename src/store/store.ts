/**
 * 演示状态存储层 —— 双端联动的地基。
 *
 * P3（2026-08-30）起数据源从 localStorage 换成后端数据库。
 * 对外的 14 个函数签名**一个都没改**，16 个消费方零改动。
 *
 * 两处必须解释的设计：
 *
 * 1. 写操作仍是同步函数，内部走「乐观更新 + 后台提交」。
 *    先改本地缓存并立刻重渲染，再把请求发出去。这样打卡还是点一下就变，
 *    不会因为过一次网络而卡顿 —— 原方案是浏览器内存级的，不能因为换了
 *    存储就让主线变慢。提交失败时从服务端重新拉取，界面会退回真实状态
 *    （对勾自己消失），而不是留着一个假的成功。
 *
 * 2. 跨端实时不用 EventSource，用 fetch 流式读。
 *    EventSource **不能带自定义请求头**，而令牌走 Authorization: Bearer。
 *    唯一的变通是把令牌塞进 URL 查询串 —— 那会让凭证进入浏览器历史与
 *    服务端访问日志，不能接受。fetch + ReadableStream 能带头，
 *    与 ChatView 读 /api/chat 的写法一致。
 */

import { useSyncExternalStore } from 'react'
import type { CheckIn, CheckInStatus, ChatMessage, DemoState, Escalation, Guidance, TaskDef, VideoUpload, VitalRecord } from '../data/types'
import { PATIENT_ID, isBpAbnormal, taskDefs, toISODate } from '../data/seed'
import { authFetch, SessionExpiredError } from '../auth/auth'

/** schemaVersion 保留只为不改 DemoState 契约；版本迁移已交给数据库迁移脚本 */
const SCHEMA_VERSION = 7

function emptyState(): DemoState {
  return {
    schemaVersion: SCHEMA_VERSION,
    checkIns: [], vitals: [], uploads: [], messages: [], guidances: [], escalations: [],
  }
}

let cache: DemoState = emptyState()
let loaded = false
let patientId = PATIENT_ID
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((l) => l())
}

/** 供 P4 的 PatientContext 切换当前患者；现阶段只有林奶奶一位 */
export function setPatientId(id: string) {
  if (id === patientId) return
  patientId = id
  cache = emptyState()
  loaded = false
  emit()
  void load()
  restartStream()
}

/* ---------- 拉取 ---------- */

let loading: Promise<void> | null = null
let dirty = false

/**
 * 并发去重 + 补一次。
 *
 * 只用 in-flight 去重是不够的：若推送在加载进行中到达，那次 load() 会直接
 * 返回正在跑的那个 Promise，而它取的是**更早**的快照 —— 这次变更就被静默丢了，
 * 表现是「对方改了，我这边没动」。所以进行中再被请求时标记 dirty，结束后补拉一次。
 */
async function load(): Promise<void> {
  if (loading) {
    dirty = true
    return loading
  }
  loading = (async () => {
    try {
      const res = await authFetch(`/api/patients/${patientId}/state`)
      if (!res.ok) throw new Error(`读取失败 ${res.status}`)
      const s = await res.json()
      cache = { schemaVersion: SCHEMA_VERSION, ...s }
      loaded = true
      emit()
    } catch (e) {
      if (!(e instanceof SessionExpiredError)) console.error('[store] 加载失败', e)
    } finally {
      loading = null
    }
  })()
  await loading
  if (dirty) {
    dirty = false
    await load()
  }
}

/* ---------- 实时推送 ---------- */

let streamAbort: AbortController | null = null
let retry = 0

async function stream() {
  const ac = new AbortController()
  streamAbort = ac
  try {
    const res = await authFetch(`/api/patients/${patientId}/events`, { signal: ac.signal })
    if (!res.ok || !res.body) throw new Error(`SSE ${res.status}`)
    retry = 0
    const reader = res.body.getReader()
    const dec = new TextDecoder()
    let buf = ''
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buf += dec.decode(value, { stream: true })
      // SSE 以空行分帧；心跳是注释行（以 : 开头），解析后自然被忽略
      let i: number
      while ((i = buf.indexOf('\n\n')) >= 0) {
        const frame = buf.slice(0, i)
        buf = buf.slice(i + 2)
        if (frame.split('\n').some((l) => l.startsWith('data:'))) void load()
      }
    }
  } catch (e) {
    if (ac.signal.aborted) return
    if (e instanceof SessionExpiredError) return
  }
  if (ac.signal.aborted) return
  // 断线重连，退避到 10s 封顶 —— 服务端重启时不至于把它打穿
  retry = Math.min(retry + 1, 5)
  setTimeout(() => { if (streamAbort === ac) void stream() }, Math.min(1000 * 2 ** retry, 10_000))
}

function restartStream() {
  streamAbort?.abort()
  streamAbort = null
  retry = 0
  void stream()
}

let started = false
function ensureStarted() {
  if (started) return
  started = true
  void load()
  void stream()
}

/* ---------- 订阅 ---------- */

function subscribe(l: () => void) {
  ensureStarted()
  listeners.add(l)
  return () => { listeners.delete(l) }
}

export function useDemoState(): DemoState {
  return useSyncExternalStore(subscribe, () => cache, () => cache)
}

/** 首屏是否已拿到数据。Shell 用它挡一下，避免闪一下 0/7 再跳成真实值 */
export function useDemoLoaded(): boolean {
  return useSyncExternalStore(subscribe, () => loaded, () => loaded)
}

export function getState(): DemoState {
  return cache
}

/* ---------- 提交 ---------- */

/**
 * 后台提交。失败就从服务端重拉 —— 界面退回真实状态，
 * 而不是留着一个本地看着成功、库里其实没有的记录。
 */
function push(path: string, method: string, body: unknown) {
  void (async () => {
    try {
      const res = await authFetch(path, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(`${method} ${path} → ${res.status}`)
    } catch (e) {
      if (e instanceof SessionExpiredError) return
      console.error('[store] 提交失败，已回滚到服务端状态', e)
      void load()
    }
  })()
}

function nextId(prefix: string, at: Date) {
  return `${prefix}-${at.getTime()}-${Math.floor(Math.random() * 1e4)}`
}

/* ---------- actions（签名与 P3 之前完全一致） ---------- */

export function setCheckIn(taskId: string, status: CheckInStatus, note?: string, date = toISODate(new Date())) {
  const s = cache
  const at = new Date()
  const existing = s.checkIns.find((c) => c.taskId === taskId && c.date === date)
  const entry: CheckIn = {
    id: existing?.id ?? `ci-${date}-${taskId}`,
    patientId,
    taskId,
    date,
    status,
    at: status === 'done' || status === 'difficulty' ? at.toISOString() : undefined,
    note: note ?? existing?.note,
    uploadId: existing?.uploadId,
  }
  cache = {
    ...s,
    checkIns: existing ? s.checkIns.map((c) => (c.id === existing.id ? entry : c)) : [...s.checkIns, entry],
  }
  emit()
  push(`/api/patients/${patientId}/checkins`, 'PUT', { taskId, status, note, date })
}

export function addUpload(taskId: string, filename: string, sizeLabel: string, playbackVideoId: string) {
  const s = cache
  const at = new Date()
  const date = toISODate(at)
  const upload: VideoUpload = {
    id: nextId('up', at), patientId, taskId, date, filename, sizeLabel,
    uploadedAt: at.toISOString(), playbackVideoId, origin: 'simulated',
  }
  cache = {
    ...s,
    uploads: [...s.uploads, upload],
    checkIns: s.checkIns.map((c) => (c.taskId === taskId && c.date === date ? { ...c, uploadId: upload.id } : c)),
  }
  emit()
  push(`/api/patients/${patientId}/uploads`, 'POST', { id: upload.id, taskId, filename, sizeLabel, playbackVideoId })
}

/** 返回新消息 id，供打字机效果定位当前正在输出的那条 */
export function addMessage(msg: Omit<ChatMessage, 'id' | 'at' | 'patientId'>) {
  const s = cache
  const at = new Date()
  const id = nextId('msg', at)
  cache = { ...s, messages: [...s.messages, { ...msg, id, at: at.toISOString(), patientId }] }
  emit()
  push(`/api/patients/${patientId}/messages`, 'POST', { id, ...msg })
  return id
}

export function addGuidance(text: string, therapistName: string, aboutTaskId?: string, aboutDate?: string) {
  const s = cache
  const at = new Date()
  const g: Guidance = {
    id: nextId('gd', at), patientId, therapistName, at: at.toISOString(),
    text, aboutTaskId, aboutDate, readByFamily: false,
  }
  cache = { ...s, guidances: [...s.guidances, g] }
  emit()
  push(`/api/patients/${patientId}/guidances`, 'POST', { id: g.id, text, therapistName, aboutTaskId, aboutDate })
}

export function markGuidanceRead(id: string) {
  const s = cache
  if (!s.guidances.some((g) => g.id === id && !g.readByFamily)) return
  cache = { ...s, guidances: s.guidances.map((g) => (g.id === id ? { ...g, readByFamily: true } : g)) }
  emit()
  push(`/api/patients/${patientId}/guidances/read`, 'POST', { id })
}

/** 家属端打开今日页即视为已读；康复师端据此显示"家属已读" */
export function markAllGuidanceRead() {
  const s = cache
  if (!s.guidances.some((g) => !g.readByFamily)) return
  cache = { ...s, guidances: s.guidances.map((g) => ({ ...g, readByFamily: true })) }
  emit()
  push(`/api/patients/${patientId}/guidances/read`, 'POST', {})
}

export function createEscalation(input: {
  source: 'chat' | 'task'
  question: string
  context: string[]
  taskId?: string
}) {
  const s = cache
  const at = new Date()
  const e: Escalation = {
    id: nextId('esc', at), patientId, at: at.toISOString(), status: 'pending', ...input,
  }
  cache = { ...s, escalations: [...s.escalations, e] }
  emit()
  push(`/api/patients/${patientId}/escalations`, 'POST', { id: e.id, ...input })
  return e
}

/**
 * 康复师答复：既落进 escalations 供工作台追踪，
 * 也镜像一条 therapist 消息，让家属在同一个对话里看到回复。
 */
export function answerEscalation(id: string, answer: string, therapistName: string) {
  const s = cache
  const at = new Date()
  const messageId = nextId('msg', at)
  cache = {
    ...s,
    escalations: s.escalations.map((e) =>
      e.id === id ? { ...e, status: 'answered' as const, answer, answeredAt: at.toISOString(), therapistName } : e),
    messages: [...s.messages, {
      id: messageId, patientId, role: 'therapist', text: answer, at: at.toISOString(),
    } as ChatMessage],
  }
  emit()
  push(`/api/patients/${patientId}/escalations/${id}`, 'PATCH', { answer, therapistName, messageId })
}

export function addVital(systolic: number, diastolic: number, by: VitalRecord['by'] = '家属') {
  const at = new Date()
  const rec: VitalRecord = {
    id: nextId('vital', at), patientId, date: toISODate(at),
    time: `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`,
    systolic, diastolic, by, at: at.toISOString(),
  }
  cache = { ...cache, vitals: [...cache.vitals, rec] }
  emit()
  push(`/api/patients/${patientId}/vitals`, 'POST', { id: rec.id, systolic, diastolic, by })
  return rec
}

/** 排练用：一键回到演示初始状态 */
export function resetDemo() {
  push(`/api/patients/${patientId}/reset`, 'POST', {})
  void load()
}

/* ---------- selectors（纯计算，不碰存储，原样保留） ---------- */

export function todayVitals(state: DemoState, date = toISODate(new Date())) {
  return state.vitals.filter((v) => v.date === date).sort((a, b) => a.at.localeCompare(b.at))
}

/** 今日是否出现过超出安全范围的血压 —— 康复师端名单据此标「需要关注」 */
export function hasAbnormalVital(state: DemoState, date = toISODate(new Date())) {
  return todayVitals(state, date).some(isBpAbnormal)
}

export function todayCheckIns(state: DemoState, date = toISODate(new Date())) {
  return taskDefs.map((t) => ({
    task: t,
    checkIn: state.checkIns.find((c) => c.taskId === t.id && c.date === date),
  }))
}

/** 到点未打卡后多久算未完成 */
const GRACE_MIN = 90

/**
 * 任务的实际状态 —— 两端必须用同一个判定，否则家属端与康复师端会各说各话。
 * 计划时间 + 宽限 90 分钟仍未打卡即视为未完成，按真实时间计算。
 */
export function effectiveStatus(task: TaskDef, checkIn: CheckIn | undefined, now = new Date()): CheckInStatus {
  if (checkIn?.status === 'done' || checkIn?.status === 'difficulty' || checkIn?.status === 'missed') {
    return checkIn.status
  }
  const [h, m] = task.scheduledTime.split(':').map(Number)
  const due = new Date(now)
  due.setHours(h, m + GRACE_MIN, 0, 0)
  return now > due ? 'missed' : 'pending'
}

/** 待康复师处理的咨询 */
export function pendingEscalations(state: DemoState) {
  return state.escalations.filter((e) => e.status === 'pending')
}
