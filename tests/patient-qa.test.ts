import { describe, expect, it } from 'vitest'
import {
  DENGYI_QA,
  matchPatientQa,
  patientQaForId,
  patientQuestionExampleForId,
  RICH_DEMO_QA,
  ZHAO_FUAN_ONBOARDING_QA,
} from '../src/data/patientQa.ts'

describe('患者专属咨询问答', () => {
  it('三个患者展示不同阶段的首条提问示例', () => {
    expect(patientQuestionExampleForId('p-dengyi')).toContain('手功能机器人')
    expect(patientQuestionExampleForId('p-001')).toContain('刚开始')
    expect(patientQuestionExampleForId('p-zhao-grandpa')).toContain('刚建档')
  })

  it('允许自然问法命中邓仪的个体化答复', () => {
    const matched = matchPatientQa('桥式训练做不起来，还继续吗？', DENGYI_QA)
    expect(matched?.id).toBe('dy-bridge')
  })

  it('不会把另一位患者的问题套给赵福安', () => {
    expect(matchPatientQa('桥式训练做不起来，还继续吗？', ZHAO_FUAN_ONBOARDING_QA)).toBeNull()
  })

  it('一句话同时命中两个意图时不抢答', () => {
    expect(matchPatientQa('桥式做不起来，而且喝水还呛，怎么办？', DENGYI_QA)).toBeNull()
  })

  it('未登记患者没有病例预设问答', () => {
    expect(patientQaForId('p-unknown')).toEqual([])
  })

  it('新增患者按阶段取得问答且替换患者姓名', () => {
    const starter = patientQaForId('p-li-guilan', '李桂兰')
    expect(starter).toHaveLength(4)
    expect(starter.flatMap((item) => item.answer).join('')).toContain('李桂兰')
    expect(starter.flatMap((item) => item.answer).join('')).not.toContain('林秀兰')

    const unassessed = patientQaForId('p-liu-fusheng', '刘福生')
    expect(unassessed).toHaveLength(3)
    expect(unassessed.flatMap((item) => item.answer).join('')).toContain('刘福生')
    expect(unassessed.flatMap((item) => item.answer).join('')).not.toContain('赵福安')

    const rich = patientQaForId('p-chen-huifang', '陈慧芳')
    expect(rich.map((item) => item.id)).toEqual(RICH_DEMO_QA.map((item) => item.id))
    const richText = JSON.stringify(rich)
    expect(richText).toContain('陈慧芳')
    expect(richText).toContain('手功能机器人、肩手保护与桥式运动')
    for (const forbidden of ['邓仪', '右侧感觉减退', '右膝', '吞咽专项评估']) {
      expect(richText).not.toContain(forbidden)
    }
  })

  it('确认后的扩充问答按患者启用', () => {
    expect(patientQaForId('p-dengyi')).toHaveLength(7)
    expect(patientQaForId('p-001')).toHaveLength(4)
    expect(patientQaForId('p-zhao-grandpa')).toHaveLength(3)
  })
})
