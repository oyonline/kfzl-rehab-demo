import type { Patient, TaskDef } from './types'

/**
 * 虚构演示病例。资料来自用户提供的《邓仪个体化居家康复训练计划》
 * （制定日期 2026-09-13）。量表数值按来源录入；药物未提供，保持空白。
 * 计划已按用户 2026-09-14 确认设为审核通过并执行中。
 */
export const DENGYI_PATIENT_ID = 'p-dengyi'

export const dengyiPatient: Patient = {
  id: DENGYI_PATIENT_ID,
  name: '邓仪',
  avatar: '',
  ageBand: '65 岁',
  gender: '女',
  heightCm: 160,
  weightKg: 65,
  address: '康乐小区3栋412室',
  livingSituation: '独居，由女儿和上门护理员共同照护',
  caregiver: { name: '患者女儿', relation: '女儿' },
  diagnosis: {
    strokeType: '阿尔茨海默病；脑梗死后遗症；右侧肢体活动障碍',
    onsetDate: '2022-09',
    stage: '居家康复·稳定执行期',
    comorbidities: ['2级高血压（高危），病史10年', '2型糖尿病，病史5年'],
  },
  functionStatus: {
    affectedSide: '右侧肢体',
    mobility: '依赖轮椅；右上肢肌力3级、右下肢3-级，左侧5级；Berg平衡评分10分，转移、站立须专人陪护',
    swallowing: '咽反射减弱，伸舌稍右偏；洼田饮水试验及EAT-10尚未完成，需上门专项评估',
    cognition: 'MMSE 7分，重度认知障碍；采用简短单一步骤指令并配合手势示范',
    risks: [
      '极高跌倒风险，严禁独自站立或行走',
      '吞咽功能尚未专项评估，按高误吸风险防护',
      '右侧肢体痛触觉减退，注意压疮、烫伤和磕碰',
      '高血压与糖尿病，训练前后监测生命体征',
    ],
  },
  psychosocial: '情绪焦虑、沮丧、易激惹，丧失阅读兴趣，训练配合度波动；照护时不争辩、不强迫。',
  medications: [],
  assessments: [
    { name: 'MMSE 简易智能量表', value: '7 分', level: '重度认知障碍', tile: { label: 'MMSE', value: '7 分', note: '重度认知障碍' }, date: '2026-09-13', assessor: '来源资料', note: '数值来自个体化居家康复训练计划，系统未生成。', visibleToFamily: true },
    { name: 'Barthel 指数', value: '45 分', level: '中度生活依赖', tile: { label: 'Barthel', value: '45 分', note: '中度依赖' }, date: '2026-09-13', assessor: '来源资料', note: '数值来自个体化居家康复训练计划，系统未生成。', visibleToFamily: true },
    { name: 'Berg 平衡量表', value: '10 分', level: '平衡能力极差，高跌倒风险', tile: { label: 'Berg', value: '10 分', note: '高跌倒风险' }, date: '2026-09-13', assessor: '来源资料', note: '数值来自个体化居家康复训练计划，系统未生成。', visibleToFamily: true },
    { name: 'VAS 疼痛评估', value: '0 分', level: '无躯体疼痛', tile: { label: 'VAS', value: '0 分', note: '无疼痛' }, date: '2026-09-13', assessor: '来源资料', note: '数值来自个体化居家康复训练计划，系统未生成。', visibleToFamily: true },
  ],
  goals: {
    shortTerm: [
      '耐受手功能机器人被动或助力模式训练15分钟，训练后无明显不适',
      '规范完成桥式运动3至5次，每次维持3秒',
      '准确配合完成单一步骤指令，正确率达到80%以上',
      '家属掌握血压血糖记录及防跌倒、防烫伤、防呛咳技能',
    ],
    longTerm: [
      '右上肢肌力提升至3+级，右下肢肌力提升至3+级',
      '在辅助下完成床与轮椅之间的安全转移',
      'MMSE提升至10分以上或较基线提升2至3分',
      'Barthel指数提升至55分以上，Berg评分提升至15分以上',
    ],
    nextReviewDate: '2026-09-27',
  },
  rehabPlan: {
    status: 'approved',
    plannedOn: '2026-09-13',
    items: [
      '手功能机器人训练', '桥式运动', '中医艾灸理疗', '认知训练',
      '吞咽与口肌训练', 'ADL生活能力训练', '血压血糖与基础护理',
    ],
    sourceNote: '来源文档为个体化训练计划；演示病例中已完成专业团队审核并下发执行。',
  },
  careEvents: [
    { date: '2026-08-10', kind: 'assessment', title: '首次居家综合评估', detail: '完成认知、生活能力、平衡、肌力与居家照护风险基线记录。' },
    { date: '2026-08-12', kind: 'homecare', title: '基础居家康复计划开始执行', detail: '家属和上门护理员按审核后计划开始记录日常训练与生命体征。' },
    { date: '2026-08-26', kind: 'homecare', title: '阶段随访', detail: '训练执行总体稳定，根据疲劳和情绪反应调整单次训练节奏。' },
    { date: '2026-09-06', kind: 'homecare', title: '家属照护复训', detail: '再次强化转移防跌倒、右侧肢体皮肤检查及训练前后监测要点。' },
    { date: '2026-09-13', kind: 'assessment', title: '个体化康复计划复评与审核', detail: '团队完成当前方案复评，计划审核通过并继续下发执行。' },
    { date: '2026-09-27', kind: 'upcoming', title: '计划首次复评', detail: '按计划第2周节点复核功能状态，并决定是否调整训练内容。' },
  ],
  emergencyContact: { name: '患者女儿', relation: '女儿', phoneMasked: '' },
  assistiveDevices: ['轮椅', '床边护栏'],
  communication: '右耳听力下降、双眼视力下降；使用简短口语和单一步骤指令，配合手势示范并耐心重复。',
  pastHistory: ['阿尔茨海默病', '脑梗死后遗症（2022年9月发病）', '2级高血压（高危）10年', '2型糖尿病5年', '入睡困难，日均睡眠约4小时并频繁夜醒'],
  origin: 'synthetic',
}

export const DENGYI_HOMECARE_START = '2026-08-12'
export const DENGYI_PLAN_CONFIRMED_ON = '2026-09-13'

const RAW_DENGYI_TASKS: TaskDef[] = [
  { id: 'dy-task-monitor', patientId: DENGYI_PATIENT_ID, kind: 'record', title: '训练前后健康监测', scheduledTime: '08:00', instruction: '由家属或护理员记录血压、血糖及当日状态，如有不适暂停训练并联系专业人员。', cautions: ['按医师设定的个体化范围判断', '不自行调整药物'], origin: 'therapist_confirmed' },
  { id: 'dy-task-hand', patientId: DENGYI_PATIENT_ID, kind: 'training', title: '手功能机器人训练', scheduledTime: '09:00', instruction: '低速、低阻力完成右手抓握放松、腕背伸和手指屈伸。', cautions: ['右肩始终有支撑', '出现疼痛、手抖或过度疲劳立即停止'], reps: '15 分钟', durationMin: 15, videoId: 'v-joint', origin: 'therapist_confirmed' },
  { id: 'dy-task-bridge', patientId: DENGYI_PATIENT_ID, kind: 'training', title: '桥式运动', scheduledTime: '10:00', instruction: '仰卧屈膝，在专人保护下呼气抬臀、吸气缓慢放下。', cautions: ['全程不懋气', '拉起床栏并固定右膝右足'], reps: '3–5 次，每次 3 秒', durationMin: 10, videoId: 'v-transfer', origin: 'therapist_confirmed' },
  { id: 'dy-task-cognition', patientId: DENGYI_PATIENT_ID, kind: 'training', title: '认知与定向训练', scheduledTime: '15:00', instruction: '使用现实定向、怀旧照片和实物提示，每次只给一个简短指令。', cautions: ['情绪烦躁或抗拒时暂停', '不争辩、不强迫'], reps: '10–15 分钟', durationMin: 15, videoId: 'v-memory', origin: 'therapist_confirmed' },
  { id: 'dy-task-oral', patientId: DENGYI_PATIENT_ID, kind: 'training', title: '吞咽与口肌训练', scheduledTime: '17:00', instruction: '在家属或护理员全程陪护下完成简短口唇、舌部与吞咽基础练习。', cautions: ['明显呛咳、呼吸异常立即停止', '专项评估结论优先于本演示任务'], reps: '10 分钟', durationMin: 10, videoId: 'v-swallow', origin: 'therapist_confirmed' },
  { id: 'dy-task-skin', patientId: DENGYI_PATIENT_ID, kind: 'record', title: '右侧肢体与受压皮肤检查', scheduledTime: '20:00', instruction: '检查右侧肢体、骶尾部及足跟有无发红、破损或烫伤。', cautions: ['右侧感觉减退，不能仅依赖患者主诉'], origin: 'therapist_confirmed' },
]

export const dengyiTaskDefs: TaskDef[] = [...RAW_DENGYI_TASKS]
  .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime))
