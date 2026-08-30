/**
 * 数据上下文 —— P4 起患者数据由服务端按 patientId 下发，不再写死。
 *
 * ContentProvider：全局内容库（视频、指导、预设问答），所有登录用户共用。
 * PatientProvider：按 patientId 拉取当前患者的档案与计划，内部调用 store.setPatientId。
 * usePatientData / useContent：消费上述上下文的钩子。
 * PatientCtx：裸 Context 对象，供 EscalationCard 等需要在无 Provider 时也能安全读的场景使用。
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Patient, TaskDef, Therapist, VideoAsset } from './types'
import type { GuidanceCard } from './guidance'
import type { PresetQA } from './qa'
import type { ReminderDef } from './reminders'
import { authFetch } from '../auth/auth'
import { setPatientId } from '../store/store'

/* ---------- Content ---------- */

interface ContentValue {
  videos: VideoAsset[]
  videoSteps: Record<string, { title: string; detail: string }[]>
  guidance: GuidanceCard[]
  presetQA: PresetQA[]
  videoCategories: string[]
}

const ContentCtx = createContext<ContentValue | null>(null)

export function ContentProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<ContentValue | null>(null)

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const res = await authFetch('/api/content')
        if (!res.ok) return
        const json = await res.json()
        if (alive) setData(json)
      } catch { /* 网络异常由调用方兜底 */ }
    })()
    return () => { alive = false }
  }, [])

  if (!data) return null
  return <ContentCtx.Provider value={data}>{children}</ContentCtx.Provider>
}

export function useContent(): ContentValue {
  const ctx = useContext(ContentCtx)
  if (!ctx) throw new Error('useContent must be used inside ContentProvider')
  return ctx
}

/* ---------- Patient ---------- */

interface PatientValue {
  patientId: string
  patient: Patient
  taskDefs: TaskDef[]
  therapist: Therapist
  careAlerts: string[]
  /** 档案建立日期（patients.created_at），与首次打卡日不是一回事 */
  createdOn: string
  /**
   * 首次打卡日期。**尚无打卡时退回建档日期，不得硬编码任何具体日期** ——
   * 此前写死回退到 '2026-07-07'（林奶奶的日期），导致每个没有打卡记录的
   * 新患者都显示成她的日期。日历用它算可翻阅的最早月份，给建档日即可。
   */
  homecareStart: string
  reminders: ReminderDef[]
  /** 计划确认日期；未确认时为空串，调用方按"暂无"处理 */
  planConfirmedOn: string
}

export const PatientCtx = createContext<PatientValue | null>(null)

export function PatientProvider({ patientId, children }: { patientId: string; children: ReactNode }) {
  const [data, setData] = useState<PatientValue | null>(null)

  useEffect(() => {
    setPatientId(patientId)
  }, [patientId])

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const res = await authFetch(`/api/patients/${patientId}/profile`)
        if (!res.ok) return
        const json = await res.json()
        if (!alive) return
        setData({
          patientId,
          patient: json.patient,
          taskDefs: json.tasks,
          therapist: json.therapist,
          careAlerts: json.careAlerts,
          createdOn: json.createdOn ?? '',
          // 没有打卡就退回建档日；再没有才退今天，绝不写死具体日期
          homecareStart: json.homecareStart ?? json.createdOn ?? new Date().toISOString().slice(0, 10),
          reminders: json.reminders,
          planConfirmedOn: json.planConfirmedOn ?? '',
        })
      } catch { /* 网络异常由调用方兜底 */ }
    })()
    return () => { alive = false }
  }, [patientId])

  if (!data) return null
  return <PatientCtx.Provider value={data}>{children}</PatientCtx.Provider>
}

export function usePatientData(): PatientValue {
  const ctx = useContext(PatientCtx)
  if (!ctx) throw new Error('usePatientData must be used inside PatientProvider')
  return ctx
}
