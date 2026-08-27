/**
 * 逐行渲染人写的多行文本。
 *
 * 康复师的指导、家属的困难反馈都来自 textarea，含真实换行；
 * 直接 `{text}` 塞进元素时 HTML 不认 \n，多行会糊成一段。
 * 凡渲染用户手写文本的地方一律走这里，别再各写各的。
 */
export function Lines({ text, className }: { text: string; className?: string }) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  return (
    <div className={`lines${className ? ' ' + className : ''}`}>
      {lines.map((l, i) => <p key={i}>{l}</p>)}
    </div>
  )
}
