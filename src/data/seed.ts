/**
 * 演示数据 —— 演示病例，不对应任何真实个人。
 *
 * 2026-08-29 换病例：由合成的「陈桂芳」换为甲方交付的「林奶奶」。
 *
 * 四张量表不再是 '待专业确认' —— MMSE 18 / 洼田Ⅱ / MMT 左4右5 / Braden 16
 * 全部来自甲方《林奶奶_康复评估量表汇总》（评估日 2026-07-07，评估人：
 * 康复师小婷、小周，康复护士小彭），由其专业团队实测并署名，本项目未生成任何分值。
 *
 * 仍然守住的边界：
 * - 用药剂量甲方同样未给（其模板原文只写「吃降压药（如果医生有开药）」），
 *   因此 dose 保持 '待专业确认'、confirmed: false，本项目不生成剂量；
 * - 标注 SYNTHETIC 的字段是甲方未提供、为叙事完整而虚构的，勿当作甲方数据引用。
 */

import type { Patient, TaskDef, VideoAsset, Therapist, CheckIn, ISODate, RosterEntry } from './types'

export const PATIENT_ID = 'p-001'

/**
 * ⚠️ 占位号码 —— 上台前必须换成机构真实的服务电话。
 * 页面上出现可拨打的号码，写一个不存在的号有被真拨打的风险。
 */
export const SUPPORT_PHONE = '400-000-0000'

export const patient: Patient = {
  id: PATIENT_ID,
  name: '林奶奶',
  avatar: '',
  ageBand: '82 岁',
  gender: '女',
  // SYNTHETIC：甲方评估表未提供身高体重
  heightCm: 156,
  weightKg: 48,
  livingSituation: '与女儿同住，日间主要由女儿照护',
  caregiver: { name: '陈女士', relation: '女儿' },
  diagnosis: {
    strokeType: '脑梗死后遗症（病程 2 年）',
    // SYNTHETIC：甲方只给「病程 2 年」，未给确切发病日，此处按评估日回推
    onsetDate: '2024-07-07',
    stage: '居家康复·准备期（第 1 周）',
    comorbidities: ['高血压 5 年', '长期失眠'],
  },
  functionStatus: {
    affectedSide: '左侧偏瘫',
    mobility: '左侧肌力 MMT 4 级、右侧 5 级；左踝周肌张力 Ashworth 1+ 级，足背屈不充分，行走呈尖足模式（脚尖先着地），步态不稳、害怕跌倒，转移与步行全程须有人保护',
    swallowing: '洼田饮水试验 Ⅱ 级：30ml 温水可全部咽下但需分两次，存在可疑误吸风险；食物宜从糊状起步、小口慢咽、端坐位进食',
    cognition: 'MMSE 18 分（中度认知障碍）：时间与地点定向力欠缺、短期记忆较弱、三步指令执行不完整；计算力与即刻记忆保留较好',
    risks: [
      '跌倒风险（尖足步态、害怕跌倒）',
      '误吸风险（洼田 Ⅱ 级）',
      '压疮风险（Braden 16 分 · 轻度危险）',
      '情绪低落、抗拒照护，需心理支持',
    ],
  },
  psychosocial:
    '情绪低落、抗拒照护，有消极言语「你让我死了算了」。团队意见：需心理疏导 + 家属支持。（2026-07-07 入户评估记录）',
  medications: [
    {
      id: 'm-01',
      name: '降压药',
      dose: '待专业确认',
      times: ['07:30'],
      notes: '甲方资料未给出药名与剂量（其任务模板原文为「吃降压药（如果医生有开药）」）。剂量须由医师／康复专业人员确认后填入，本项目不生成剂量。',
      confirmed: false,
    },
  ],
  assessments: [
    {
      name: '洼田饮水试验',
      value: 'Ⅱ 级',
      level: '可疑误吸（阳性）',
      date: '2026-07-07',
      assessor: '康复师小周',
      note: '30ml 温水可全部喝完但需分两次咽下。建议进行吞咽功能训练，食物从糊状开始逐步过渡，小口慢咽，进食保持端坐位。',
      visibleToFamily: true,
    },
    {
      name: 'MMT 徒手肌力测试',
      value: '左侧 4 级 / 右侧 5 级',
      level: '左侧良好，可抗重力及部分阻力',
      date: '2026-07-07',
      assessor: '康复师小婷',
      note: '左踝背屈、跖屈、内翻、外翻均为 Ashworth 1+ 级（轻度增高），导致足背屈不充分、呈尖足步态。康复重点：训练左下肢肌力、降低踝周肌张力、矫正尖足步态、预防跌倒。',
      visibleToFamily: true,
    },
    {
      name: 'MMSE 简易智能量表',
      value: '18 分',
      level: '中度认知障碍',
      date: '2026-07-07',
      assessor: '康复团队',
      note: '满分 30 分。主要受损：时间／地点定向力欠缺、短期记忆较弱、执行能力不足；计算力与即刻记忆保留较好。',
      visibleToFamily: false,
    },
    {
      name: 'Braden 压疮风险',
      value: '16 分',
      level: '轻度危险（15–18 分）',
      date: '2026-07-07',
      assessor: '康复护士小彭',
      note: '风险来自左侧偏瘫致活动能力下降、转移时摩擦剪切力、偏瘫侧感觉减退。预防：每 2 小时协助翻身，重点检查骶尾部、足跟、外踝，转移时避免拖拽。',
      visibleToFamily: false,
    },
  ],
  goals: {
    // 甲方《林奶奶个体化康复训练计划表》短期目标（1 周内）
    shortTerm: [
      '下肢能进行抗阻训练，不出现明显疲劳',
      '认知训练能完成三步指令',
      '吞咽训练能主动配合完成整套操',
      '家属能独立完成血压测量和记录',
    ],
    // SYNTHETIC：甲方长期目标写「1 个月后」，未给具体复评日，按计划制定日推算
    nextReviewDate: '2026-09-27',
  },

  // SYNTHETIC：急性期住院经过甲方未提供，为档案完整性虚构，与「病程 2 年」保持一致
  admission: {
    admittedOn: '2024-07-07',
    dischargedOn: '2024-07-21',
    facility: '三级综合医院',
    department: '神经内科',
    chiefComplaint: '突发左侧肢体无力伴行走不稳',
    admissionDiagnosis: ['急性脑梗死', '高血压'],
    course: '入院后予规范内科治疗，血压控制平稳；病情稳定后康复科会诊介入，床旁开始良肢位摆放与被动关节活动。',
    dischargeStatus: '神志清楚，生命体征平稳。左侧肢体活动较入院改善，仍需辅助转移。',
    dischargeOrders: [
      '继续口服降压药物，定期监测血压',
      '转居家康复，由康复师制定并调整训练计划',
      '进食注意食物性状调整，警惕误吸',
      '如出现新发无力、意识改变立即就医',
    ],
  },

  careEvents: [
    { date: '2024-07-07', kind: 'admission', title: '发病入院', detail: '突发左侧肢体无力伴行走不稳，收入神经内科。（SYNTHETIC：甲方未提供急性期记录）' },
    { date: '2024-07-21', kind: 'discharge', title: '出院', detail: '病情稳定出院，左侧肢体仍遗留功能障碍，转门诊与居家康复。（SYNTHETIC）' },
    { date: '2026-07-07', kind: 'assessment', title: '居家康复首次入户评估', detail: '康复师小婷、小周与康复护士小彭上门，完成 MMSE、洼田饮水试验、MMT 与 Braden 四项评估，并记录睡眠、心理与饮食情况。' },
    { date: '2026-08-27', kind: 'homecare', title: '个体化康复训练计划制定', detail: '银康安馨居家康复服务团队据评估结果制定三阶段训练方案：准备期放松降张力、强化期抗阻、步态实用期矫正尖足。' },
    { date: '2026-09-27', kind: 'upcoming', title: '下次复评', detail: '评估左下肢肌力、MMSE 与洼田分级改善情况，据此调整下一阶段计划。' },
  ],

  // SYNTHETIC：联系电话甲方未提供，此处为脱敏占位
  emergencyContact: { name: '陈女士', relation: '女儿', phoneMasked: '138****6721' },
  assistiveDevices: ['助行器（室内步行）', '床边护栏', '卫生间扶手与地面防滑垫'],
  communication: '意识清楚，可配合指令；时间与地点定向力欠缺、短期记忆较弱，需放慢语速、给足反应时间，必要时重复提示。',
  pastHistory: ['高血压 5 年', '长期失眠：入睡困难、睡眠片段化', '脑梗死后遗症，病程 2 年', '饮食口味偏重、爱吃肥肉、不爱吃水果'],

  origin: 'synthetic',
}

/** 康复师确认训练计划的日期 —— 依据展示引用它，不要再借用某张量表的日期 */
export const PLAN_CONFIRMED_ON: ISODate = '2026-08-27'

/**
 * 主责康复师。甲方《个体化康复训练计划表》「康复团队分工」：
 * 小婷 = 康复师（统筹），负责全局统筹、下肢康复训练、VR 认知训练；
 * 小周 = 康复师，负责吞咽功能训练与头部推拿；
 * 小彭 = 康复护士，负责生命体征与血压监测、皮肤护理、家属带教。
 * 康复师端登录的是统筹这位。
 */
export const therapist: Therapist = {
  id: 't-001',
  name: '小婷',
  title: '康复师（统筹）',
}

/**
 * 今日任务模板 —— 取自甲方《银康安馨·扣子智能体演示流程与内容脚本》环节四的
 * 任务时间线，并与《林奶奶_每日任务推送模板》《个体化康复训练计划表》对齐。
 * 训练项目为「准备期（第 1 周）」方案。
 */
const RAW_TASKS: TaskDef[] = [
  {
    id: 'task-vitals-morning',
    patientId: PATIENT_ID,
    kind: 'record',
    title: '晨起测血压',
    scheduledTime: '07:00',
    instruction: '先做起床三部曲：躺 30 秒、坐起 30 秒、双脚放床边 30 秒，再站起来。坐位安静休息片刻后测血压并记录。',
    cautions: ['起身务必分三步，防体位性低血压跌倒', '正常范围 90–139 / 60–89 mmHg，超出请复测一次再反馈'],
    origin: 'therapist_confirmed',
  },
  {
    id: 'task-med-morning',
    patientId: PATIENT_ID,
    kind: 'medication',
    title: '服用降压药',
    scheduledTime: '07:30',
    instruction: '早餐后温水送服，服药后静坐 10 分钟。',
    cautions: ['漏服不可自行补服双倍剂量', '如有头晕请记录并告知康复师', '药名与剂量以医师医嘱为准'],
    origin: 'therapist_confirmed',
  },
  {
    id: 'task-lower-limb',
    patientId: PATIENT_ID,
    kind: 'training',
    title: '下肢康复训练（准备期）',
    scheduledTime: '08:30',
    instruction: '踝关节被动活动每方向 10 次；脚踝顺、逆时针各环绕 3 圈；脚趾屈伸 10 次；左下肢大腿前后侧与小腿肌群轻柔按摩每处 2–3 分钟。',
    cautions: ['力度以有酸胀感为宜，不产生疼痛', '全程须有人在旁保护', '头晕或明显疲劳立即停止'],
    videoId: 'v-balance',
    reps: '每方向 10 次 + 环绕各 3 圈 + 按摩 2–3 分钟',
    durationMin: 15,
    origin: 'therapist_confirmed',
  },
  {
    id: 'task-swallow',
    patientId: PATIENT_ID,
    kind: 'training',
    title: '吞咽康复操',
    scheduledTime: '09:30',
    instruction: '深呼吸 3 次 → 张口闭口 5 次 → 嘟嘴咧嘴各 3 次 → 舌肌训练 → 发「咿」音 3 遍，全程端坐位。',
    cautions: ['每天早晚各一次，每次约 5 分钟', '感冒或精神不好时暂停', '明显呛咳立即停止并联系康复师'],
    videoId: 'v-swallow',
    reps: '整套一遍',
    durationMin: 5,
    requiresVideoUpload: true,
    origin: 'therapist_confirmed',
  },
  {
    id: 'task-cognition',
    patientId: PATIENT_ID,
    kind: 'training',
    title: 'VR 认知训练',
    scheduledTime: '15:00',
    instruction: '时间定向力练习：今年是哪一年、现在什么季节、住几楼；再做三步指令——拿起纸 → 对折 → 放在腿上。不便戴设备时改为看老照片、听熟悉的歌曲。',
    cautions: ['每次 15–20 分钟即可', '戴设备前先问有没有头晕，做完确认无不适'],
    reps: '定向力问答 + 三步指令',
    durationMin: 20,
    origin: 'therapist_confirmed',
  },
  {
    id: 'task-skin',
    patientId: PATIENT_ID,
    kind: 'record',
    title: '皮肤检查与翻身',
    scheduledTime: '16:30',
    instruction: '请女儿协助查看骶尾部、足跟、外踝有无发红；久坐每 1–2 小时变换一次体位。',
    cautions: ['Braden 16 分属轻度危险，偏瘫侧感觉减退，须由家属代为检查', '发红且按压不褪色请拍照告知康复师'],
    videoId: 'v-transfer',
    reps: '三处骨突检查 + 翻身 1 次',
    durationMin: 6,
    origin: 'therapist_confirmed',
  },
  {
    id: 'task-vitals-night',
    patientId: PATIENT_ID,
    kind: 'record',
    title: '睡前测血压 + 头部按摩',
    scheduledTime: '20:30',
    instruction: '睡前测一次血压并记录；由女儿按揉太阳穴 20 次、开天门 20 次，温水泡脚 10 分钟。',
    cautions: ['泡脚水温请家属先试，避免烫伤', '推拿或泡脚后注意保暖，不要吹风'],
    origin: 'therapist_confirmed',
  },
]

/**
 * 按计划时间排序后导出。
 *
 * 时间轴、康复师端执行表、日历明细都直接遍历这个数组，
 * 若依赖书写顺序，新增一条任务插错位置就会让 12:00 排到 14:00 后面（曾实测踩到）。
 */
export const taskDefs: TaskDef[] = [...RAW_TASKS].sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime))

/**
 * 今日任务总数 —— 必须由 taskDefs 推导。
 * 原先 roster 里写死 4，而实际任务是 6 条，康复师端会出现「5/4」这种数。
 */
export const TODAY_TASK_COUNT = taskDefs.length

/**
 * 康复师的在管患者。只有 PATIENT_ID 有完整档案与实时数据，
 * 其余仅呈现服务规模，不可点开 —— 不为演示编造第二份病例。
 */
export const roster: RosterEntry[] = [
  { id: PATIENT_ID, name: '林奶奶', gender: '女', ageBand: '82 岁', stage: '居家康复·准备期', todayDone: 0, todayTotal: TODAY_TASK_COUNT },
  { id: 'p-002', name: '周德海', gender: '男', ageBand: '78 岁', stage: '居家康复第 2 阶段', todayDone: 3, todayTotal: 3 },
  { id: 'p-003', name: '孙玉兰', gender: '女', ageBand: '81 岁', stage: '居家康复第 4 阶段', todayDone: 2, todayTotal: 4, flag: '连续 2 天未完成' },
  { id: 'p-004', name: '马长顺', gender: '男', ageBand: '73 岁', stage: '居家康复第 1 阶段', todayDone: 5, todayTotal: 5 },
  { id: 'p-005', name: '许秀英', gender: '女', ageBand: '88 岁', stage: '居家康复第 3 阶段', todayDone: 1, todayTotal: 4, flag: '反馈训练困难' },
  { id: 'p-006', name: '汪建国', gender: '男', ageBand: '69 岁', stage: '居家康复第 5 阶段', todayDone: 4, todayTotal: 4 },
  { id: 'p-007', name: '何惠珍', gender: '女', ageBand: '84 岁', stage: '居家康复第 2 阶段', todayDone: 2, todayTotal: 3 },
]

/**
 * 训练视频 —— 甲方 2026-08-28 交付的真实拍摄素材，共 17 个（去重后）。
 *
 * 文件不进仓库（约 390MB，见 .gitignore），随压缩包另发，解压到 public/videos/。
 * 文件名统一为视频 id，避免中文与「！」进 URL 产生编码问题。
 * 文件缺失时播放区自动回退到分步图文，不黑屏 —— 这是「视频另发」方案的兜底。
 *
 * 时长为 ffprobe 实测。target/goal/cautions 只在能追溯到甲方训练计划表时才填，
 * 其余留空：甲方要求「每个视频配一句话说明」但未交付，本项目不替其编造康复指导。
 */
export const videos: VideoAsset[] = [
  {
    id: 'v-swallow',
    title: '吞咽康复操',
    category: '吞咽康复类',
    src: '/videos/v-swallow.mp4',
    target: '洼田饮水试验 Ⅱ 级、舌肌与喉部肌力不足者',
    goal: '激活口颜面与咽喉肌群，改善吞咽启动',
    cautions: ['每天早晚各一次，每次约 5 分钟', '感冒或精神状态差时暂停', '出现明显呛咳立即停止并联系康复师'],
    durationSec: 210,
    origin: 'team_reviewed',
  },
  {
    id: 'v-balance',
    title: '下肢康复训练（准备期）',
    category: '肢体康复类',
    src: '/videos/v-balance.mp4',
    target: '左下肢肌力 4 级、踝周肌张力增高的偏瘫老人',
    goal: '放松左下肢、降低肌张力、维持踝关节活动度',
    cautions: ['力度以有酸胀感为宜，不产生疼痛', '全程须有人在旁保护', '头晕或明显疲劳立即停止'],
    durationSec: 135,
    origin: 'team_reviewed',
  },
  {
    id: 'v-transfer',
    title: '转移训练',
    category: '肢体康复类',
    src: '/videos/v-transfer.mp4',
    target: '偏瘫恢复期居家老人',
    goal: '减少照护者腰部负担，降低跌倒与压疮风险',
    cautions: ['动作前先说明，让老人有准备', '避免牵拉患侧上肢'],
    durationSec: 62,
    origin: 'team_reviewed',
  },
  { id: 'v-feed-water',   title: '喂水技巧',       category: '吞咽康复类',   src: '/videos/v-feed-water.mp4',   durationSec: 61,  origin: 'team_reviewed' },
  { id: 'v-feed-food',    title: '喂食技巧',       category: '吞咽康复类',   src: '/videos/v-feed-food.mp4',    durationSec: 54,  origin: 'team_reviewed' },
  { id: 'v-joint',        title: '关节活动',       category: '肢体康复类',   src: '/videos/v-joint.mp4',        durationSec: 69,  origin: 'team_reviewed' },
  { id: 'v-dress',        title: '穿脱衣物',       category: '肢体康复类',   src: '/videos/v-dress.mp4',        durationSec: 109, origin: 'team_reviewed' },
  { id: 'v-posture',      title: '良肢位摆放',     category: '日常护理类',   src: '/videos/v-posture.mp4',      durationSec: 82,  origin: 'team_reviewed' },
  { id: 'v-bp',           title: '血压监测',       category: '日常护理类',   src: '/videos/v-bp.mp4',           durationSec: 172, origin: 'team_reviewed' },
  { id: 'v-walker',       title: '助行器行走',     category: '康复辅具类',   src: '/videos/v-walker.mp4',       durationSec: 171, origin: 'team_reviewed' },
  { id: 'v-bandage',      title: '康复辅具绷带使用', category: '康复辅具类', src: '/videos/v-bandage.mp4',      durationSec: 82,  origin: 'team_reviewed' },
  { id: 'v-vr',           title: 'VR 训练',        category: '认知训练类',   src: '/videos/v-vr.mp4',           durationSec: 161, origin: 'team_reviewed' },
  { id: 'v-attention',    title: '注意力训练',     category: '认知训练类',   src: '/videos/v-attention.mp4',    durationSec: 73,  origin: 'team_reviewed' },
  { id: 'v-memory',       title: '短时记忆训练',   category: '认知训练类',   src: '/videos/v-memory.mp4',       durationSec: 93,  origin: 'team_reviewed' },
  { id: 'v-head-massage', title: '头部按摩',       category: '中医适宜技术', src: '/videos/v-head-massage.mp4', durationSec: 307, origin: 'team_reviewed' },
  { id: 'v-acupoint',     title: '穴位按摩',       category: '中医适宜技术', src: '/videos/v-acupoint.mp4',     durationSec: 88,  origin: 'team_reviewed' },
  { id: 'v-drum',         title: '空灵鼓教学',     category: '中医适宜技术', src: '/videos/v-drum.mp4',         durationSec: 60,  origin: 'team_reviewed' },
]

/** 视频库分组顺序 —— 与甲方交付的文件夹结构一致 */
export const VIDEO_CATEGORIES = ['吞咽康复类', '肢体康复类', '认知训练类', '日常护理类', '中医适宜技术', '康复辅具类'] as const



/* ---------- 历史打卡：为打卡日历提供演示数据 ---------- */

/** 居家康复建档日（首次入户评估日）—— 打卡历史与日历可翻阅范围的起点 */
export const HOMECARE_START: ISODate = '2026-07-07'

export function toISODate(d: Date): ISODate {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * 生成从居家康复建档日到昨天的打卡历史。
 *
 * 必须覆盖到建档日，不能只回溯固定天数：否则日历往前翻会出现一段"既非无记录、
 * 也非未完成"的空档，与今日页的判定对不上（08-27 实测踩到）。
 *
 * 用固定模式而非随机数，保证每次演示看到的日历完全一致，可反复排练。
 * 模式按距今天数取模：每 7 天缺 1 项，每 11 天缺 2 项，其余全完成。
 */
export function buildHistory(today: Date, fromISO: ISODate = HOMECARE_START): CheckIn[] {
  const out: CheckIn[] = []
  const from = new Date(fromISO)
  const cursor = new Date(from)
  const end = new Date(today)
  end.setDate(end.getDate() - 1)

  while (cursor <= end) {
    const date = toISODate(cursor)
    const back = Math.round((today.getTime() - cursor.getTime()) / 86400000)
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
    cursor.setDate(cursor.getDate() + 1)
  }
  return out
}
