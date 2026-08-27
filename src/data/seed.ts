/**
 * 合成演示数据 —— 全部为虚构，不对应任何真实个人。
 *
 * 依据 KB v0.1 §6（合成病例档案结构）与 §16（材料准备清单）：
 * - 真实病历原件与直接身份信息不得进入本仓；
 * - 评估量表分值与用药剂量须由康复专业人员确认，未确认一律标 '待专业确认'；
 * - 视频素材未到位（死线 9/1），当前全部为 placeholder，禁止冒充自有内容。
 */

import type { Patient, TaskDef, VideoAsset, Therapist, CheckIn, ISODate } from './types'

export const PATIENT_ID = 'p-001'

export const patient: Patient = {
  id: PATIENT_ID,
  name: '陈桂芳',
  avatar: '',
  ageBand: '85 岁',
  gender: '女',
  livingSituation: '与女儿同住，白天多数时间独处',
  caregiver: { name: '李敏', relation: '女儿' },
  diagnosis: {
    strokeType: '缺血性脑卒中（左侧基底节区）',
    onsetDate: '2026-06-14',
    stage: '恢复期·居家康复第 3 阶段',
    comorbidities: ['高血压 2 级', '2 型糖尿病'],
  },
  functionStatus: {
    affectedSide: '右侧偏瘫',
    mobility: '可床边坐位保持 5 分钟，转移需 1 人辅助',
    swallowing: '进食稀液时偶有呛咳，需调整食物性状',
    cognition: '意识清楚，简单指令可执行，表达略迟缓',
    risks: ['跌倒风险', '误吸风险', '压疮风险（低）'],
  },
  medications: [
    {
      id: 'm-01',
      name: '苯磺酸氨氯地平',
      dose: '',
      times: ['08:00'],
      notes: '剂量须由康复／医疗专业人员确认后填入，本项目不生成剂量',
      confirmed: false,
    },
  ],
  assessments: [
    { name: '洼田饮水试验', value: '待专业确认', level: '待专业确认', date: '2026-08-20', assessor: '康复师', note: '量表分级与解释须由专业人员确认', visibleToFamily: true },
    { name: 'MMSE 简易智能量表', value: '待专业确认', date: '2026-08-20', assessor: '康复师', note: '同上', visibleToFamily: false },
    { name: 'MMT 徒手肌力测试', value: '待专业确认', date: '2026-08-20', assessor: '康复师', note: '同上', visibleToFamily: true },
    { name: 'Braden 压疮风险', value: '待专业确认', date: '2026-08-20', assessor: '护理', note: '同上', visibleToFamily: false },
  ],
  goals: {
    shortTerm: ['床边坐位保持延长至 10 分钟', '进食呛咳次数减少', '每日按时服用降压药'],
    nextReviewDate: '2026-09-20',
  },
  origin: 'synthetic',
}

export const therapist: Therapist = {
  id: 't-001',
  name: '王秀兰',
  title: '主管康复治疗师',
}

/**
 * 视频素材：正式文件死线 9/1（v0.2 §8）。
 * 到位后把 src 填上并把 origin 改为 'team_reviewed'。
 */
export const videos: VideoAsset[] = [
  {
    id: 'v-transfer',
    title: '翻身与床上转移',
    category: '日常照护',
    target: '偏瘫恢复期居家老人',
    goal: '减少照护者腰部负担，降低跌倒与压疮风险',
    cautions: ['动作前先说明，让老人有准备', '避免牵拉患侧上肢'],
    origin: 'placeholder',
  },
  {
    id: 'v-swallow',
    title: '吞咽训练（空吞咽与冰刺激）',
    category: '吞咽功能',
    target: '进食呛咳的恢复期老人',
    goal: '改善吞咽启动，降低误吸风险',
    cautions: ['进食后 30 分钟内不做', '出现明显呛咳立即停止并联系康复师'],
    origin: 'placeholder',
  },
  {
    id: 'v-balance',
    title: '坐位平衡与下肢主动训练',
    category: '肢体功能',
    target: '可维持短时坐位的偏瘫老人',
    goal: '延长坐位耐受时间，为站立转移做准备',
    cautions: ['全程需 1 人在旁保护', '出现头晕立即停止'],
    origin: 'placeholder',
  },
]

/** 今日任务模板：对应会上确认的 9 点 / 2 点 / 5 点节奏，另加早间服药 */
export const taskDefs: TaskDef[] = [
  {
    id: 'task-med-morning',
    patientId: PATIENT_ID,
    kind: 'medication',
    title: '服用降压药',
    scheduledTime: '08:00',
    instruction: '早餐后温水送服，服药后静坐 10 分钟。',
    cautions: ['漏服不可自行补服双倍剂量', '如有头晕请记录并告知康复师'],
    origin: 'therapist_confirmed',
  },
  {
    id: 'task-transfer',
    patientId: PATIENT_ID,
    kind: 'training',
    title: '翻身与床上转移练习',
    scheduledTime: '09:00',
    instruction: '照护者按视频步骤辅助完成左右翻身各 5 次，再练习床边坐起 2 次。',
    cautions: ['避免牵拉患侧上肢', '老人诉痛立即停止'],
    videoId: 'v-transfer',
    reps: '左右各 5 次 + 坐起 2 次',
    durationMin: 10,
    origin: 'therapist_confirmed',
  },
  {
    id: 'task-swallow',
    patientId: PATIENT_ID,
    kind: 'training',
    title: '吞咽训练',
    scheduledTime: '14:00',
    instruction: '空吞咽 10 次，冰棉签刺激咽后壁 5 次，全程坐位。',
    cautions: ['进食后 30 分钟内不做', '明显呛咳立即停止并联系康复师'],
    videoId: 'v-swallow',
    reps: '空吞咽 10 次 + 冰刺激 5 次',
    durationMin: 8,
    requiresVideoUpload: true,
    origin: 'therapist_confirmed',
  },
  {
    id: 'task-balance',
    patientId: PATIENT_ID,
    kind: 'training',
    title: '坐位平衡与下肢训练',
    scheduledTime: '17:00',
    instruction: '床边坐位保持 5 分钟，患侧下肢屈伸 10 次。',
    cautions: ['全程 1 人在旁保护', '头晕立即停止'],
    videoId: 'v-balance',
    reps: '坐位 5 分钟 + 屈伸 10 次',
    durationMin: 12,
    origin: 'therapist_confirmed',
  },
]

/* ---------- 历史打卡：为打卡日历提供演示数据 ---------- */

export function toISODate(d: Date): ISODate {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * 生成过去 N 天的打卡历史。
 * 用固定模式而非随机数，保证每次演示看到的日历完全一致（可排练）。
 * 模式：每 7 天缺 1 项，每 11 天缺 2 项，其余全完成。
 */
export function buildHistory(today: Date, days = 28): CheckIn[] {
  const out: CheckIn[] = []
  for (let back = days; back >= 1; back--) {
    const d = new Date(today)
    d.setDate(d.getDate() - back)
    const date = toISODate(d)
    const missCount = back % 11 === 0 ? 2 : back % 7 === 0 ? 1 : 0
    taskDefs.forEach((t, idx) => {
      const missed = idx >= taskDefs.length - missCount
      out.push({
        id: `ci-${date}-${t.id}`,
        patientId: PATIENT_ID,
        taskId: t.id,
        date,
        status: missed ? 'missed' : 'done',
        at: missed ? undefined : `${date}T${t.scheduledTime}:00`,
      })
    })
  }
  return out
}
