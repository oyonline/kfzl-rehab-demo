/**
 * 地名打码不变量 —— 栏目渲染的每串文字过 maskPlaces 后不得残留词表地名。
 * 新增资料若自带新地名，这里会红：提醒把词条补进 placeMask.ts 的 RULES。
 */
import { describe, it, expect } from 'vitest'
import { maskPlaces } from '../src/lib/placeMask.ts'
import { BROCHURE, EXPERTS, EXPERT_BOOKING_CHANNELS, EXPERT_NOTICE, POLICIES } from '../src/data/resources.ts'

const LEAK = /(深圳|广东|南山|福田|宝安|香港)/

describe('maskPlaces 基础替换', () => {
  it('大学附属医院走整名映射，不残留大学所在城市', () => {
    expect(maskPlaces('南方医科大学深圳医院')).toBe('XX医科大学XX医院')
    expect(maskPlaces('香港大学深圳医院')).toBe('XX大学XX医院')
  })

  it('带后缀保留后缀，裸词直接替换', () => {
    expect(maskPlaces('广东省人民政府令第 268 号')).toBe('XX省人民政府令第 268 号')
    expect(maskPlaces('深圳市第二人民医院')).toBe('XX市第二人民医院')
    expect(maskPlaces('健康南山')).toBe('健康XX')
    expect(maskPlaces('关注「深圳医保」公众号')).toBe('关注「XX医保」公众号')
  })

  it('加粗标记与无地名文本原样保留', () => {
    expect(maskPlaces('**使用范围**　南山区 9 家医疗体检机构')).toBe('**使用范围**　XX区 9 家医疗体检机构')
    expect(maskPlaces('总补贴 500 万元，先领先得，领完即止')).toBe('总补贴 500 万元，先领先得，领完即止')
  })
})

describe('栏目数据全量不残留', () => {
  const brochureTexts = BROCHURE.flatMap((s) => [
    s.title, s.summary, s.note ?? '',
    ...s.blocks.flatMap((b) => [
      b.heading ?? '',
      ...(b.paragraphs ?? []),
      ...(b.steps ?? []),
      ...(b.bullets ?? []),
    ]),
  ])
  const policyTexts = POLICIES.flatMap((p) => [p.title, p.source, p.summary, p.docNo ?? '', ...p.body])
  const expertTexts = [
    ...EXPERTS.map((e) => `${e.name} · ${e.hospital} ${e.department}`),
    ...EXPERT_BOOKING_CHANNELS,
    EXPERT_NOTICE,
  ]

  it('宣传册', () => {
    for (const t of brochureTexts) expect(maskPlaces(t), t).not.toMatch(LEAK)
  })

  it('政策', () => {
    for (const t of policyTexts) expect(maskPlaces(t), t).not.toMatch(LEAK)
  })

  it('专家', () => {
    for (const t of expertTexts) expect(maskPlaces(t), t).not.toMatch(LEAK)
  })
})
