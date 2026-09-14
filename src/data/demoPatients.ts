import type { TaskDef } from './types'

export type DemoPatientTier = 'rich' | 'starter' | 'unassessed'

export const DEMO_RICH_GUIDANCE_TEXTS = [
  '继续按当前计划执行，优先保证动作安全与记录完整。',
  '如出现新发不适或完成度明显下降，先暂停并在咨询中说明具体表现。',
  '下次复评前保持当前节奏，不自行增加训练强度。',
] as const

export interface DemoPatientSpec {
  id: string
  username: string
  name: string
  gender: '男' | '女'
  ageBand: string
  tier: DemoPatientTier
  stage: string
  strokeType: string
  affectedSide: string
  focus: string
  caregiverName: string
}

/** 全部为 SYNTHETIC 演示病例；不包含量表分值、药物剂量或真实联系方式。 */
export const DEMO_PATIENTS: DemoPatientSpec[] = [
  { id: 'p-chen-huifang', username: 'chenhuifang', name: '陈慧芳', gender: '女', ageBand: '68 岁', tier: 'rich', stage: '稳定执行期', strokeType: '脑梗死后居家康复', affectedSide: '右侧活动受限', focus: '手功能机器人、肩手保护与桥式运动', caregiverName: '陈先生（儿子）' },
  { id: 'p-sun-guoqiang', username: 'sunguoqiang', name: '孙国强', gender: '男', ageBand: '72 岁', tier: 'rich', stage: '稳定执行期', strokeType: '脑梗死后居家康复', affectedSide: '左侧活动受限', focus: '步行、转移与跌倒预防', caregiverName: '孙女士（女儿）' },
  { id: 'p-zhou-meizhen', username: 'zhoumeizhen', name: '周美珍', gender: '女', ageBand: '66 岁', tier: 'rich', stage: '稳定执行期', strokeType: '脑卒中后居家康复', affectedSide: '右侧上肢活动受限', focus: '手指训练、日常生活动作与情绪配合', caregiverName: '周先生（丈夫）' },
  { id: 'p-wu-jianmin', username: 'wujianmin', name: '吴建民', gender: '男', ageBand: '75 岁', tier: 'rich', stage: '稳定执行期', strokeType: '脑梗死后居家康复', affectedSide: '左侧活动受限', focus: '认知训练、记忆提示与家庭沟通', caregiverName: '吴女士（女儿）' },
  { id: 'p-zheng-xiuying', username: 'zhengxiuying', name: '郑秀英', gender: '女', ageBand: '70 岁', tier: 'rich', stage: '稳定执行期', strokeType: '脑卒中后居家康复', affectedSide: '一侧肢体活动受限', focus: '吞咽观察、皮肤检查与健康监测', caregiverName: '郑先生（儿子）' },
  { id: 'p-li-guilan', username: 'liguilan', name: '李桂兰', gender: '女', ageBand: '73 岁', tier: 'starter', stage: '准备期（第 1 周）', strokeType: '脑卒中后居家康复', affectedSide: '待持续观察', focus: '熟悉流程、首次训练与安全保护', caregiverName: '李女士（女儿）' },
  { id: 'p-wang-deshan', username: 'wangdeshan', name: '王德山', gender: '男', ageBand: '69 岁', tier: 'starter', stage: '准备期（第 1 周）', strokeType: '脑卒中后居家康复', affectedSide: '待持续观察', focus: '疲劳观察、训练节奏与家属陪护', caregiverName: '王先生（儿子）' },
  { id: 'p-he-shufen', username: 'heshufen', name: '何淑芬', gender: '女', ageBand: '76 岁', tier: 'starter', stage: '准备期（第 1 周）', strokeType: '脑卒中后居家康复', affectedSide: '待持续观察', focus: '首次打卡、困难反馈与如实记录', caregiverName: '何女士（女儿）' },
  { id: 'p-gao-zhiyuan', username: 'gaozhiyuan', name: '高志远', gender: '男', ageBand: '64 岁', tier: 'starter', stage: '准备期（第 1 周）', strokeType: '脑卒中后居家康复', affectedSide: '待持续观察', focus: '训练前准备、动作安全与异常暂停', caregiverName: '高女士（妻子）' },
  { id: 'p-jiang-yumei', username: 'jiangyumei', name: '蒋玉梅', gender: '女', ageBand: '71 岁', tier: 'starter', stage: '准备期（第 1 周）', strokeType: '脑卒中后居家康复', affectedSide: '待持续观察', focus: '时间安排、训练休息与联系康复师', caregiverName: '蒋先生（儿子）' },
  { id: 'p-liu-fusheng', username: 'liufusheng', name: '刘福生', gender: '男', ageBand: '78 岁', tier: 'unassessed', stage: '', strokeType: '', affectedSide: '', focus: '已建档，等待首次评估', caregiverName: '刘女士（女儿）' },
  { id: 'p-zhang-suqin', username: 'zhangsuqin', name: '张素琴', gender: '女', ageBand: '67 岁', tier: 'unassessed', stage: '', strokeType: '', affectedSide: '', focus: '已建档，资料待补充', caregiverName: '张先生（丈夫）' },
  { id: 'p-huang-jicheng', username: 'huangjicheng', name: '黄继成', gender: '男', ageBand: '74 岁', tier: 'unassessed', stage: '', strokeType: '', affectedSide: '', focus: '已分配康复师，尚未评估', caregiverName: '黄女士（女儿）' },
  { id: 'p-luo-chunmei', username: 'luochunmei', name: '罗春梅', gender: '女', ageBand: '70 岁', tier: 'unassessed', stage: '', strokeType: '', affectedSide: '', focus: '家属已登记，计划待制定', caregiverName: '罗先生（儿子）' },
  { id: 'p-xu-wenhai', username: 'xuwenhai', name: '许文海', gender: '男', ageBand: '65 岁', tier: 'unassessed', stage: '', strokeType: '', affectedSide: '', focus: '初次联系完成，等待评估', caregiverName: '许女士（妻子）' },
]

export function demoTasksFor(p: DemoPatientSpec): TaskDef[] {
  if (p.tier === 'unassessed') return []
  const base = p.id.slice(2)
  if (p.tier === 'starter') return [
    { id: `${base}-task-prepare`, patientId: p.id, kind: 'record', title: '首次训练安全准备', scheduledTime: '09:00', instruction: '清理训练区域，由家属陪同熟悉今日流程。', cautions: ['不追求一次完成全部内容'], origin: 'therapist_confirmed' },
    { id: `${base}-task-start`, patientId: p.id, kind: 'training', title: '起步期基础训练', scheduledTime: '15:00', instruction: '按照康复师下发的起步计划执行并如实记录。', cautions: ['出现明显不适立即停止'], durationMin: 10, origin: 'therapist_confirmed' },
  ]
  return [
    { id: `${base}-task-monitor`, patientId: p.id, kind: 'record', title: '晨间健康记录', scheduledTime: '08:00', instruction: '记录当天精神、睡眠和身体感受。', cautions: ['异常情况先暂停训练并联系康复师'], origin: 'therapist_confirmed' },
    { id: `${base}-task-training`, patientId: p.id, kind: 'training', title: p.focus.split('、')[0] ?? '居家功能训练', scheduledTime: '15:00', instruction: '按照康复师确认的个体化计划执行。', cautions: ['保证动作稳定，不自行增加强度'], durationMin: 20, origin: 'therapist_confirmed' },
    { id: `${base}-task-evening`, patientId: p.id, kind: 'record', title: '晚间观察与记录', scheduledTime: '20:30', instruction: '记录训练完成情况、疲劳反应和需要反馈的问题。', cautions: [], origin: 'therapist_confirmed' },
  ]
}
