import { describe, expect, it } from 'vitest'
import {
  DENGYI_QA,
  matchPatientQa,
  patientQaForId,
  patientQuestionExampleForId,
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

  it('确认后的扩充问答按患者启用', () => {
    expect(patientQaForId('p-dengyi')).toHaveLength(6)
    expect(patientQaForId('p-001')).toHaveLength(4)
    expect(patientQaForId('p-zhao-grandpa')).toHaveLength(3)
  })
})
