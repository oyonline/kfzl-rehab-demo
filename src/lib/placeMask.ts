/**
 * 「宣传册·政策·专家」栏目的展示层地名打码。
 *
 * resources.ts 是甲方原文逐字转写，保持不动，渲染前统一过词表替换：
 * 整名 → 带后缀 → 裸词，一次正则交替，长词先命中。
 */
const RULES: ReadonlyArray<readonly [string, string]> = [
  ['南方医科大学深圳医院', 'XX医科大学XX医院'],
  ['香港大学深圳医院', 'XX大学XX医院'],
  ['广东省', 'XX省'],
  ['深圳市', 'XX市'],
  ['南山区', 'XX区'],
  ['福田区', 'XX区'],
  ['宝安区', 'XX区'],
  ['广东', 'XX'],
  ['深圳', 'XX'],
  ['南山', 'XX'],
  ['福田', 'XX'],
  ['宝安', 'XX'],
  ['香港', 'XX'],
]

const PATTERN = new RegExp(
  [...RULES]
    .sort((a, b) => b[0].length - a[0].length)
    .map(([word]) => word)
    .join('|'),
  'g',
)
const MAPPED = new Map(RULES)

export function maskPlaces(text: string): string {
  return text.replace(PATTERN, (m) => MAPPED.get(m) ?? m)
}
