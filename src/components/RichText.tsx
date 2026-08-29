/**
 * **加粗** 的极简行内渲染。
 *
 * 为一处强调引入 markdown 依赖不划算，但内容文件（qa.ts / guidance.ts）里
 * 确实需要标出"哪一句是关键"——尤其是安全相关的那几句，家属扫一眼就得看见。
 *
 * 只做行内，不产生块级元素：调用方自己决定包在 <p> 还是 <li> 里。
 */
export function InlineRich({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g)
  return <>{parts.map((s, i) => (i % 2 ? <strong key={i}>{s}</strong> : s))}</>
}
