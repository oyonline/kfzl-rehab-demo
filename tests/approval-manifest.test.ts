import { describe, expect, it } from 'vitest'
import { PRESET_QA } from '../src/data/qa.ts'
import { GUIDANCE } from '../src/data/guidance.ts'
import { VIDEO_STEPS } from '../src/data/videoSteps.ts'
import {
  APPROVED_GUIDANCE,
  APPROVED_KB_DOCUMENTS,
  APPROVED_PRESET_QA,
  APPROVED_VIDEO_STEPS,
  hashApprovedContent,
  isApprovedVersion,
} from '../server/content/approval-manifest.ts'

describe('已确认内容版本清单', () => {
  it('只覆盖用户本次确认的 5 + 5 + 3 个固定版本', () => {
    expect(PRESET_QA.filter((item) =>
      isApprovedVersion(APPROVED_PRESET_QA, item.id, hashApprovedContent(item)))).toHaveLength(5)
    expect(GUIDANCE.filter((item) =>
      isApprovedVersion(APPROVED_GUIDANCE, item.id, hashApprovedContent(item)))).toHaveLength(5)
    expect(Object.entries(VIDEO_STEPS).filter(([id, steps]) =>
      isApprovedVersion(APPROVED_VIDEO_STEPS, id, hashApprovedContent(steps)))).toHaveLength(3)
    expect(Object.keys(APPROVED_KB_DOCUMENTS)).toHaveLength(57)
  })

  it('内容被改写后不会继承原审批', () => {
    const original = PRESET_QA[0]
    const changed = { ...original, question: `${original.question}（已修改）` }
    expect(isApprovedVersion(
      APPROVED_PRESET_QA,
      original.id,
      hashApprovedContent(changed),
    )).toBe(false)
  })
})
