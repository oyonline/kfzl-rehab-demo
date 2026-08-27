/**
 * 双端共用数据契约 —— 冻结于 2026-08-27。
 * 2026-08-27 扩展：新增 Admission / CareEvent 与 Patient 的档案字段，
 * 用于"完整档案"抽屉（两端共用组件）。属新增字段，不改动既有字段语义。
 *
 * 依据 KB `ANXIN_REHAB_DEMO` 当前权威 v0.2 §7.1 理由 2：
 * 老人端与康复师端共用同一份结构，不先冻结则 9/3 拼联动会拼不上。
 * 改动本文件 = 改动双端契约，两端必须同步改。
 *
 * 安全边界（继承 v0.1 §5 / §11 / §12，v0.2 §6 指向继承）：
 * - 全部身份与健康数据为合成数据，不得冒充真实病历；
 * - 用药剂量、评估结论不由本项目生成，未经专业确认一律标注占位；
 * - 一次打卡不得改变 diagnosis / assessments / goals 等稳定层字段。
 */

export type ISODate = string      // 'YYYY-MM-DD'
export type ClockTime = string    // 'HH:mm'
export type ISODateTime = string  // ISO 8601

/** 页面必须显示的来源标签（v0.1 §5） */
export type DataOrigin =
  | 'synthetic'            // 合成身份／病例
  | 'therapist_confirmed'  // 基于康复师确认计划
  | 'team_reviewed'        // 团队审核知识库
  | 'ai_generated'         // AI 生成
  | 'simulated'            // 模拟设备／外部联动
  | 'placeholder'          // 占位素材，未到位，禁止冒充自有内容

export const ORIGIN_LABEL: Record<DataOrigin, string> = {
  synthetic: '演示病例｜身份与健康数据为合成数据',
  therapist_confirmed: '基于康复师确认计划',
  team_reviewed: '团队审核知识库',
  ai_generated: 'AI 生成摘要',
  simulated: '模拟数据',
  placeholder: '占位素材｜正式素材未到位',
}

/* ---------- 稳定层：只在正式复评／专业确认后更新 ---------- */

export interface Caregiver {
  name: string
  relation: string
}

export interface Medication {
  id: string
  name: string
  /** 未经专业确认时填 '待专业确认'，不得由本项目生成剂量 */
  dose: string
  times: ClockTime[]
  notes?: string
  confirmed: boolean
}

export interface Assessment {
  name: string
  value: string
  level?: string
  date: ISODate
  assessor: string
  note: string
  visibleToFamily: boolean
}

/** 住院与出院记录 —— 叙述性场景信息，不含需专业判断的数值 */
export interface Admission {
  admittedOn: ISODate
  dischargedOn: ISODate
  facility: string
  department: string
  chiefComplaint: string
  admissionDiagnosis: string[]
  course: string
  dischargeStatus: string
  dischargeOrders: string[]
}

export type CareEventKind = 'admission' | 'inpatient' | 'discharge' | 'homecare' | 'assessment' | 'upcoming'

/** 诊疗与照护经过时间线 */
export interface CareEvent {
  date: ISODate
  kind: CareEventKind
  title: string
  detail: string
}

export interface Patient {
  id: string
  name: string
  avatar: string
  ageBand: string
  gender: '男' | '女'
  livingSituation: string
  caregiver: Caregiver
  diagnosis: {
    strokeType: string
    onsetDate: ISODate
    stage: string
    comorbidities: string[]
  }
  functionStatus: {
    affectedSide: string
    mobility: string
    swallowing: string
    cognition: string
    risks: string[]
  }
  medications: Medication[]
  assessments: Assessment[]
  goals: {
    shortTerm: string[]
    nextReviewDate: ISODate
  }
  /** 入院与出院记录 */
  admission: Admission
  /** 诊疗与照护经过 */
  careEvents: CareEvent[]
  emergencyContact: { name: string; relation: string; phoneMasked: string }
  assistiveDevices: string[]
  communication: string
  pastHistory: string[]
  origin: DataOrigin
}

export type TaskKind = 'medication' | 'training' | 'record'

/** 每日任务模板（康复师确认计划的产物，不由打卡改变） */
export interface TaskDef {
  id: string
  patientId: string
  kind: TaskKind
  title: string
  scheduledTime: ClockTime
  instruction: string
  cautions: string[]
  videoId?: string
  reps?: string
  durationMin?: number
  /** 是否要求回传训练视频（本轮为模拟上传，v0.2 §4.2） */
  requiresVideoUpload?: boolean
  origin: DataOrigin
}

export interface VideoAsset {
  id: string
  title: string
  category: string
  /** 素材未到位时为 undefined，配合 origin='placeholder' 渲染占位卡 */
  src?: string
  poster?: string
  target: string
  goal: string
  cautions: string[]
  durationSec?: number
  origin: DataOrigin
}

/* ---------- 动态层：由打卡、录入与模拟事件更新 ---------- */

export type CheckInStatus = 'pending' | 'done' | 'missed' | 'difficulty'

export interface CheckIn {
  id: string
  patientId: string
  taskId: string
  date: ISODate
  status: CheckInStatus
  at?: ISODateTime
  note?: string
  uploadId?: string
}

/** 模拟上传：不落真实文件，播放预置示范视频（v0.2 §4.2 已裁决） */
export interface VideoUpload {
  id: string
  patientId: string
  taskId: string
  date: ISODate
  filename: string
  sizeLabel: string
  uploadedAt: ISODateTime
  playbackVideoId: string
  origin: 'simulated'
}

export type ChatRole = 'family' | 'ai' | 'therapist'

export interface ChatMessage {
  id: string
  patientId: string
  role: ChatRole
  text: string
  at: ISODateTime
  /** model=真实大模型返回；preset_fallback=兜底预设（v0.2 §5.4） */
  answerSource?: 'model' | 'preset_fallback'
  basis?: string[]
  /** 触发转康复师规则（v0.1 §12） */
  escalated?: boolean
}

/** 康复师回写指导 —— 演示的价值落点（v0.2 §1） */
export interface Guidance {
  id: string
  patientId: string
  therapistName: string
  at: ISODateTime
  text: string
  aboutDate?: ISODate
  aboutTaskId?: string
  readByFamily: boolean
}

export interface Therapist {
  id: string
  name: string
  title: string
}

/* ---------- 持久化根结构 ---------- */

export interface DemoState {
  schemaVersion: number
  checkIns: CheckIn[]
  uploads: VideoUpload[]
  messages: ChatMessage[]
  guidances: Guidance[]
}
