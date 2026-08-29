import type { ClockTime } from './types'

/**
 * 主动消息提醒 —— 文案逐条取自甲方《模块3.3 主动消息提醒（单端修订版）》
 * （2026-08-28 修订），本项目未改写。
 *
 * 该文档自己写明：「应急指导类内容已全部删除，系统异常预警仅做通知和
 * 提示联系康复师/拨打 120，不提供应急医疗指导」—— 与本项目一贯边界一致，
 * 因此可以原样采用，不必再收敛措辞。
 *
 * 只收录与今日 7 项任务对应的定时提醒；甲方原表里的饮水、口腔护理、
 * 天气、节日、周小结等条目与当前演示任务无对应关系，不放进来充数。
 */

export interface ReminderDef {
  id: string
  time: ClockTime
  text: string
  /** 对应的今日任务，用于在提醒记录里标出「已完成 / 未完成」 */
  taskId?: string
  /** 甲方标★的演示重点 */
  highlight?: boolean
}

export const DAILY_REMINDERS: ReminderDef[] = [
  {
    id: 'rm-bp-morning',
    time: '07:00',
    taskId: 'task-vitals-morning',
    text: '☀️ 陈阿姨早上好～该给林奶奶量血压啦。量之前记得让奶奶先躺 30 秒、坐 30 秒、再站起来，量完把数值录进来，小安帮您记着。',
  },
  {
    id: 'rm-med',
    time: '07:30',
    taskId: 'task-med-morning',
    text: '💊 该给奶奶吃降压药了，饭后半小时吃哦，别空腹。吃完在这点一下「已服药」就行。',
  },
  {
    id: 'rm-training',
    time: '08:30',
    taskId: 'task-lower-limb',
    text: '🦵 今天的康复训练开始啦～先做下肢活动，再做吞咽操，做完一项点一下完成 ✅。训练时在旁边保护好奶奶，训练前先确认血压正常。',
  },
  {
    id: 'rm-swallow',
    time: '09:30',
    taskId: 'task-swallow',
    text: '👄 吞咽操时间到啦：深呼吸 3 次 → 张口闭口 5 次 → 嘟嘴咧嘴各 3 次 → 发「咿」音 3 遍，跟着视频做 5 分钟就好。',
  },
  {
    id: 'rm-cognition',
    time: '15:00',
    taskId: 'task-cognition',
    text: '🧠 认知训练时间，如使用 VR 眼镜请帮忙佩戴，训练后询问有无头晕。',
  },
  {
    id: 'rm-skin',
    time: '16:30',
    taskId: 'task-skin',
    text: '🔍 今天检查过奶奶皮肤了吗？骶尾部、足跟、外踝都看看有没有发红，有异常随时拍照发给我们。',
  },
  {
    id: 'rm-bp-night',
    time: '20:30',
    taskId: 'task-vitals-night',
    highlight: true,
    text: '🌙 准备睡觉啦，睡前再给奶奶量一次血压，录进来就安心了。可以帮奶奶按揉太阳穴 20 次、开天门 20 次，放轻音乐助眠。',
  },
]

/**
 * 血压超标时的触发式提醒（甲方原表第 14 条，标★）。
 * 只在今日确实出现过超标记录时才进入提醒列表 —— 不是预先摆在那里的假记录。
 */
export function abnormalBpReminder(systolic: number, diastolic: number): string {
  return `⚠️ 林奶奶本次血压为 ${systolic}/${diastolic} mmHg，超出安全范围（90–139 / 60–89）。请让奶奶安静坐下休息，不要自行加药，10 分钟后复测一次。此预警已同步通知康复师，我们会尽快联系您。`
}
