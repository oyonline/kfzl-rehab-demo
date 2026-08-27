/**
 * 演示状态存储层 —— 双端联动的地基（v0.2 §5.1 / §5.2）。
 *
 * 同源 localStorage 共享：老人端写、康复师端读。
 * 浏览器的 storage 事件只在【同源的其它标签页/窗口】触发，
 * 因此左右两窗并排时，老人端一打卡，康复师端会自动刷新 —— 这是演示主线。
 *
 * 硬约束：两端必须部署在同一域名的两个路径下，跨域名则本层失效。
 */

import { useSyncExternalStore } from 'react'
import type { CheckIn, CheckInStatus, ChatMessage, DemoState, Guidance, VideoUpload } from '../data/types'
import { PATIENT_ID, buildHistory, taskDefs, toISODate } from '../data/seed'

const KEY = 'kfzl.demo.v1'
const SCHEMA_VERSION = 2  // 2026-08-27 去掉数据中的演示字样，旧数据自动重置

function initialState(): DemoState {
  return {
    schemaVersion: SCHEMA_VERSION,
    checkIns: buildHistory(new Date()),
    uploads: [],
    messages: [],
    guidances: [],
  }
}

let cache: DemoState | null = null
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((l) => l())
}

function read(): DemoState {
  if (cache) return cache
  let parsed: DemoState | null = null
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const candidate = JSON.parse(raw) as DemoState
      if (candidate?.schemaVersion === SCHEMA_VERSION) parsed = candidate
    }
  } catch {
    parsed = null
  }
  cache = parsed ?? initialState()
  if (!parsed) persist(cache)
  return cache
}

function persist(state: DemoState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // 隐私模式或存储被禁用时静默降级：本次会话内存内仍可演示
  }
}

function write(next: DemoState) {
  cache = next
  persist(next)
  emit()
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) {
      cache = null
      emit()
    }
  })
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

/** React 订阅入口：同标签页 write 与跨标签页 storage 事件都会触发重渲染 */
export function useDemoState(): DemoState {
  return useSyncExternalStore(subscribe, read, read)
}

export function getState(): DemoState {
  return read()
}

/* ---------- actions ---------- */

function nextId(prefix: string, at: Date) {
  return `${prefix}-${at.getTime()}-${Math.floor(Math.random() * 1e4)}`
}

export function setCheckIn(taskId: string, status: CheckInStatus, note?: string, date = toISODate(new Date())) {
  const s = read()
  const at = new Date()
  const existing = s.checkIns.find((c) => c.taskId === taskId && c.date === date)
  const entry: CheckIn = {
    id: existing?.id ?? `ci-${date}-${taskId}`,
    patientId: PATIENT_ID,
    taskId,
    date,
    status,
    at: status === 'done' || status === 'difficulty' ? at.toISOString() : undefined,
    note: note ?? existing?.note,
    uploadId: existing?.uploadId,
  }
  write({
    ...s,
    checkIns: existing
      ? s.checkIns.map((c) => (c.id === existing.id ? entry : c))
      : [...s.checkIns, entry],
  })
}

export function addUpload(taskId: string, filename: string, sizeLabel: string, playbackVideoId: string) {
  const s = read()
  const at = new Date()
  const date = toISODate(at)
  const upload: VideoUpload = {
    id: nextId('up', at),
    patientId: PATIENT_ID,
    taskId,
    date,
    filename,
    sizeLabel,
    uploadedAt: at.toISOString(),
    playbackVideoId,
    origin: 'simulated',
  }
  const checkIns = s.checkIns.map((c) =>
    c.taskId === taskId && c.date === date ? { ...c, uploadId: upload.id } : c,
  )
  write({ ...s, uploads: [...s.uploads, upload], checkIns })
}

export function addMessage(msg: Omit<ChatMessage, 'id' | 'at' | 'patientId'>) {
  const s = read()
  const at = new Date()
  write({
    ...s,
    messages: [...s.messages, { ...msg, id: nextId('msg', at), at: at.toISOString(), patientId: PATIENT_ID }],
  })
}

export function addGuidance(text: string, therapistName: string, aboutTaskId?: string, aboutDate?: string) {
  const s = read()
  const at = new Date()
  const g: Guidance = {
    id: nextId('gd', at),
    patientId: PATIENT_ID,
    therapistName,
    at: at.toISOString(),
    text,
    aboutTaskId,
    aboutDate,
    readByFamily: false,
  }
  write({ ...s, guidances: [...s.guidances, g] })
}

export function markGuidanceRead(id: string) {
  const s = read()
  write({ ...s, guidances: s.guidances.map((g) => (g.id === id ? { ...g, readByFamily: true } : g)) })
}

/** 排练用：一键回到演示初始状态 */
export function resetDemo() {
  write(initialState())
}

/* ---------- selectors ---------- */

export function todayCheckIns(state: DemoState, date = toISODate(new Date())) {
  return taskDefs.map((t) => ({
    task: t,
    checkIn: state.checkIns.find((c) => c.taskId === t.id && c.date === date),
  }))
}
