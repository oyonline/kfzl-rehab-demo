import { useEffect, useRef, useState } from 'react'
import { IconCheck } from './Icons'

/**
 * 依据过程展示。
 *
 * **刻意不展示模型的原始思考链（chain-of-thought）**：
 * 1. 受众是家属，不是开发者；原始推理长、绕、含自我否定，医疗场景下反而制造焦虑；
 * 2. 思考过程是未经康复专业人员审核的文本，与"AI 只处理团队审核过的宣教"的边界冲突；
 * 3. 现场讲解只有 2–3 分钟，thinking 动辄十几秒。
 *
 * 展示的是**回答所依据的东西**，正面回答"凭什么知道这位老人的情况"——
 * 这正是区别于通用大模型的地方。
 *
 * 硬约束：每一步文案必须对应系统真实做的事。
 * 不得出现"检索宣教知识库"之类的措辞 —— 本项目用长 prompt 注入档案，
 * 没有检索层，写了就是把不存在的能力当事实展示（KB v0.1 §5）。
 */

export interface TraceStep {
  label: string
  detail: string
}

export function ThinkingTrace({ steps, onDone }: { steps: TraceStep[]; onDone: () => void }) {
  const [at, setAt] = useState(0)

  useEffect(() => {
    if (at >= steps.length) {
      const t = window.setTimeout(onDone, 360)
      return () => window.clearTimeout(t)
    }
    const t = window.setTimeout(() => setAt((n) => n + 1), at === 0 ? 340 : 620)
    return () => window.clearTimeout(t)
  }, [at, steps.length, onDone])

  return (
    <div className="bub-row" data-me="false">
      <span className="bub-av"><span className="spin" /></span>
      <div className="bub bub-ai trace">
        <div className="bub-who">
          <span className="bub-tag">AI</span>正在依据她的资料作答
        </div>
        {steps.map((s, i) => (
          <div className="trace-step" key={s.label} data-state={i < at ? 'done' : i === at ? 'doing' : 'wait'}>
            <span className="trace-dot">{i < at ? <IconCheck size={9} /> : i === at ? <span className="spin spin-sm" /> : null}</span>
            <span>
              <div className="trace-l">{s.label}</div>
              {i <= at && <div className="trace-d">{s.detail}</div>}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * 逐字输出。
 *
 * 两个坑都踩过，写在这里避免重蹈：
 *
 * 1. 别把 onDone 放进依赖数组 —— 它的函数身份每次渲染都变，定时器被反复取消重排，
 *    实测速率掉到 ~8 字/秒（一段回答要 40 秒）。用 ref 固定住。
 * 2. 别用 requestAnimationFrame —— 标签页隐藏时浏览器不合成帧，rAF 直接暂停，
 *    回答会永远停在半截，后面的依据标签与转人工按钮也出不来。
 *    用 setTimeout + 起始时间戳算"应该显示到第几个字"：后台被限流只是更新变稀，
 *    经过时间照算，仍会跑完。
 */
const CHARS_PER_SEC = 110

export function useTypewriter(text: string, active: boolean, onDone: () => void) {
  const [n, setN] = useState(active ? 0 : text.length)
  const doneRef = useRef(onDone)
  doneRef.current = onDone

  useEffect(() => {
    if (!active) { setN(text.length); return }
    let timer = 0
    const start = performance.now()
    const tick = () => {
      const c = Math.min(text.length, Math.floor(((performance.now() - start) / 1000) * CHARS_PER_SEC))
      setN(c)
      if (c < text.length) timer = window.setTimeout(tick, 30)
      else doneRef.current()
    }
    tick()
    return () => window.clearTimeout(timer)
  }, [text, active])

  return active ? text.slice(0, n) : text
}
