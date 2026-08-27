/**
 * 合成演示数据 —— 全部为虚构，不对应任何真实个人。
 *
 * 依据 KB v0.1 §6（合成病例档案结构）与 §16（材料准备清单）：
 * - 真实病历原件与直接身份信息不得进入本仓；
 * - 评估量表分值与用药剂量须由康复专业人员确认，未确认一律标 '待专业确认'；
 * - 视频素材未到位（死线 9/1），当前全部为 placeholder，禁止冒充自有内容。
 */

import type { Patient, TaskDef, VideoAsset, Therapist, CheckIn, ISODate, RosterEntry } from './types'

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
    { name: '洼田饮水试验', value: '待专业确认', level: '待专业确认', date: '2026-08-20', assessor: '王秀兰', note: '量表分级与解释须由专业人员确认', visibleToFamily: true },
    { name: 'MMSE 简易智能量表', value: '待专业确认', date: '2026-08-20', assessor: '王秀兰', note: '同上', visibleToFamily: false },
    { name: 'MMT 徒手肌力测试', value: '待专业确认', date: '2026-08-20', assessor: '王秀兰', note: '同上', visibleToFamily: true },
    { name: 'Braden 压疮风险', value: '待专业确认', date: '2026-08-20', assessor: '护理组', note: '同上', visibleToFamily: false },
  ],
  goals: {
    shortTerm: ['床边坐位保持延长至 10 分钟', '进食呛咳次数减少', '每日按时服用降压药'],
    nextReviewDate: '2026-09-20',
  },

  admission: {
    admittedOn: '2026-06-14',
    dischargedOn: '2026-06-28',
    facility: '三级综合医院',
    department: '神经内科',
    chiefComplaint: '晨起后右侧肢体无力伴言语含糊 3 小时',
    admissionDiagnosis: ['缺血性脑卒中（左侧基底节区）', '高血压 2 级（很高危）', '2 型糖尿病'],
    course: '入院后予溶栓禁忌评估、抗血小板聚集及脑保护治疗，血压血糖控制平稳；病情稳定后由康复科会诊介入，床旁开始良肢位摆放与被动关节活动。住院 14 天，右侧肢体肌力较入院时改善，可在辅助下完成床边坐起。',
    dischargeStatus: '神志清楚，生命体征平稳。右侧肢体活动较入院改善，仍需辅助转移；进食稀液时偶有呛咳。',
    dischargeOrders: [
      '继续口服降压与降糖药物，定期监测血压血糖',
      '转居家康复，由康复师制定并调整训练计划',
      '进食注意食物性状调整，警惕误吸',
      '每月复评一次，如出现新发无力、意识改变立即就医',
    ],
  },

  careEvents: [
    { date: '2026-06-14', kind: 'admission', title: '发病入院', detail: '晨起后右侧肢体无力伴言语含糊 3 小时，由家属送至急诊，收入神经内科。' },
    { date: '2026-06-15', kind: 'inpatient', title: '康复科会诊介入', detail: '病情稳定后开始床旁良肢位摆放与被动关节活动，预防关节挛缩与压疮。' },
    { date: '2026-06-28', kind: 'discharge', title: '出院转居家康复', detail: '住院 14 天，右侧肢体肌力较入院改善，可辅助下床边坐起，转居家康复继续训练。' },
    { date: '2026-07-02', kind: 'homecare', title: '居家康复建档', detail: '康复师上门完成首次入户评估，建立个人康复档案与家庭照护指导。' },
    { date: '2026-07-20', kind: 'assessment', title: '第 1 阶段复评', detail: '完成阶段性评估，训练计划由被动活动过渡到主动辅助训练。' },
    { date: '2026-08-20', kind: 'assessment', title: '第 2 阶段复评', detail: '进入居家康复第 3 阶段，新增坐位平衡与吞咽训练。' },
    { date: '2026-09-20', kind: 'upcoming', title: '下次复评', detail: '评估坐位耐受时间与吞咽功能改善情况，据此调整下一阶段计划。' },
  ],

  emergencyContact: { name: '李敏', relation: '女儿', phoneMasked: '138****6721' },
  assistiveDevices: ['四脚拐（室内短距离）', '防滑坐便椅', '床边护栏'],
  communication: '意识清楚，简单指令可执行；表达略迟缓，需放慢语速并给足反应时间。',
  pastHistory: ['高血压 2 级，病史约 12 年，长期口服降压药', '2 型糖尿病，病史约 6 年，饮食联合口服药控制', '否认药物过敏史'],

  origin: 'synthetic',
}

export const therapist: Therapist = {
  id: 't-001',
  name: '王秀兰',
  title: '主管康复治疗师',
}

/**
 * 康复师的在管患者。只有 PATIENT_ID 有完整档案与实时数据，
 * 其余仅呈现服务规模，不可点开 —— 不为演示编造第二份病例。
 */
export const roster: RosterEntry[] = [
  { id: PATIENT_ID, name: '陈桂芳', gender: '女', ageBand: '85 岁', stage: '居家康复第 3 阶段', todayDone: 0, todayTotal: 4 },
  { id: 'p-002', name: '周德海', gender: '男', ageBand: '78 岁', stage: '居家康复第 2 阶段', todayDone: 3, todayTotal: 3 },
  { id: 'p-003', name: '孙玉兰', gender: '女', ageBand: '81 岁', stage: '居家康复第 4 阶段', todayDone: 2, todayTotal: 4, flag: '连续 2 天未完成' },
  { id: 'p-004', name: '马长顺', gender: '男', ageBand: '73 岁', stage: '居家康复第 1 阶段', todayDone: 5, todayTotal: 5 },
  { id: 'p-005', name: '许秀英', gender: '女', ageBand: '88 岁', stage: '居家康复第 3 阶段', todayDone: 1, todayTotal: 4, flag: '反馈训练困难' },
  { id: 'p-006', name: '汪建国', gender: '男', ageBand: '69 岁', stage: '居家康复第 5 阶段', todayDone: 4, todayTotal: 4 },
  { id: 'p-007', name: '林惠珍', gender: '女', ageBand: '84 岁', stage: '居家康复第 2 阶段', todayDone: 2, todayTotal: 3 },
]

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
    durationSec: 165,
    origin: 'placeholder',
  },
  {
    id: 'v-swallow',
    title: '吞咽训练（空吞咽与冰刺激）',
    category: '吞咽功能',
    target: '进食呛咳的恢复期老人',
    goal: '改善吞咽启动，降低误吸风险',
    cautions: ['进食后 30 分钟内不做', '出现明显呛咳立即停止并联系康复师'],
    durationSec: 132,
    origin: 'placeholder',
  },
  {
    id: 'v-balance',
    title: '坐位平衡与下肢主动训练',
    category: '肢体功能',
    target: '可维持短时坐位的偏瘫老人',
    goal: '延长坐位耐受时间，为站立转移做准备',
    cautions: ['全程需 1 人在旁保护', '出现头晕立即停止'],
    durationSec: 198,
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
