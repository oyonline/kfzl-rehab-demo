import { useCallback, useEffect, useRef, useState } from 'react'
import { FALLBACK_ANSWER, PRESET_QA, type PresetQA } from '../../data/qa'
import { PLAN_CONFIRMED_ON, patient, taskDefs, therapist } from '../../data/seed'
import { addMessage, createEscalation, useDemoState } from '../../store/store'
import { IconChat, IconSend, IconUser } from '../../components/Icons'
import { InlineRich } from '../../components/RichText'
import { ThinkingTrace, useTypewriter, type TraceStep } from '../../components/ThinkingTrace'

function StreamingBody({ text, onDone }: { text: string; onDone: () => void }) {
  const shown = useTypewriter(text, true, onDone)
  const lines = shown.split('\n')
  return (
    <>
      {lines.map((line, i) => (
        <RichText key={i} text={line + (i === lines.length - 1 && shown.length < text.length ? '▍' : '')} />
      ))}
    </>
  )
}

/**
 * 流式渲染 —— 只进不退。
 *
 * 不能复用 StreamingBody：它内部的 useTypewriter 依赖 [text]，
 * 而流式输出每来一个 chunk 就换一次 text，会导致计时归零、已显示字数算回 0，
 * 整段文字缩回去再重打 —— 一秒十几次，就是肉眼看到的闪屏。
 *
 * 这里把「已显示到第几个字」存在 ref 里，只随时间前进，永不回退；
 * text 变短（换下一条消息）时才归零。
 */
function StreamingText({ text }: { text: string }) {
  const [n, setN] = useState(0)
  const nRef = useRef(0)
  const textRef = useRef(text)
  textRef.current = text

  if (text.length < nRef.current) nRef.current = 0

  useEffect(() => {
    let timer = 0
    const tick = () => {
      const target = textRef.current.length
      if (nRef.current < target) {
        // 落后越多推进越快，避免网络突然吐一大段时字幕追不上
        const step = Math.max(1, Math.ceil((target - nRef.current) / 8))
        nRef.current = Math.min(target, nRef.current + step)
        setN(nRef.current)
      }
      timer = window.setTimeout(tick, 30)
    }
    tick()
    return () => window.clearTimeout(timer)
  }, [])

  const shown = text.slice(0, n)
  const lines = shown.split('\n')
  return (
    <>
      {lines.map((line, i) => (
        <RichText key={i} text={line + (i === lines.length - 1 ? '▍' : '')} />
      ))}
    </>
  )
}

/** 气泡里按行成段；行内加粗交给共用组件 */
function RichText({ text }: { text: string }) {
  return <p><InlineRich text={text} /></p>
}

/**
 * 依据步骤 —— 只写系统真实使用的东西。
 * 档案与康复师确认计划确实是回答的来源（也就是答案下方那排"依据"标签）；
 * 安全边界确实在起作用（超出范围会走转康复师）。没有检索层，因此不写"检索知识库"。
 */
function traceFor(q: PresetQA | null): TraceStep[] {
  return [
    { label: '读取康复档案', detail: `${patient.name} · ${patient.diagnosis.strokeType} · ${patient.diagnosis.stage}` },
    { label: '结合康复师确认的计划', detail: `${PLAN_CONFIRMED_ON} 制定，含今日 ${taskDefs.length} 项安排` },
    {
      label: '按安全边界组织回答',
      detail: q?.escalateHint ?? '超出可安全回答范围的部分交回康复师',
    },
  ]
}

/** 前端等待上限。比服务端的 15s 略长，让服务端的错误先浮出来 */
const LLM_ABORT_MS = 20000

/** 构建系统提示词，注入患者档案上下文 */
function buildSystemPrompt(): string {
  return `你是居家康复智能助手，正在为${patient.name}的家属提供康复咨询。

患者档案：
- 姓名：${patient.name}
- 年龄：${patient.ageBand}
- 诊断：${patient.diagnosis.strokeType}
- 阶段：${patient.diagnosis.stage}
- 患侧：${patient.functionStatus.affectedSide}
- 用药：${patient.medications.map(m => m.name).join('、') || '暂无'}

康复师：${therapist.name}（${therapist.title}）

安全边界（必须遵守）：
1. 不给出具体药物剂量、不改变食物性状比例、不调整训练强度——均属专业判断
2. 一律引导"记录 + 观察 + 联系康复师"，而非替代专业决策
3. 每条都带明确的升级条件（出现什么情况必须立即联系/就医）
4. 涉及康复计划调整、新出现的身体变化，或需要专业评估的情况，明确建议转康复师

回答风格：
- 用家属能听懂的话，避免医学术语
- 分点说明，条理清晰
- 先安抚情绪，再给建议
- 必要时用**加粗**强调关键信息`
}

export function ChatView() {
  const state = useDemoState()
  const [draft, setDraft] = useState('')
  const [trace, setTrace] = useState<{ steps: TraceStep[]; qa: PresetQA | null } | null>(null)
  const [streamingId, setStreamingId] = useState<string | null>(null)
  const [streamingText, setStreamingText] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  const messages = state.messages

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [messages.length, trace, streamingId])

  /** 调用 LLM API，流式接收回答 */
  async function callLLM(userQuestion: string, presetQ: PresetQA | null) {
    // 构建消息历史（最近 10 轮）
    const recentMessages = messages.slice(-10).map(m => ({
      role: m.role === 'family' ? 'user' : 'assistant',
      content: m.text,
    }))

    const apiMessages = [
      { role: 'system', content: buildSystemPrompt() },
      ...recentMessages,
      { role: 'user', content: userQuestion },
    ]

    try {
      // 前端也必须自带上限：服务端 503（本机未启用 AI）是瞬时的，
      // 但网络层卡住时只有这里能把它掐掉，否则家属端就一直转圈。
      const ac = new AbortController()
      const abortTimer = setTimeout(() => ac.abort(), LLM_ABORT_MS)

      let response: Response
      try {
        response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: apiMessages }),
          signal: ac.signal,
        })
      } finally {
        clearTimeout(abortTimer)
      }

      if (!response.ok) {
        throw new Error(`API 错误：${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('无法读取响应流')

      const decoder = new TextDecoder()
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n').filter(line => line.startsWith('data: '))

        for (const line of lines) {
          const data = line.slice(6)
          if (data === '[DONE]') continue

          try {
            const parsed = JSON.parse(data)
            if (parsed.content) {
              fullText += parsed.content
              setStreamingText(fullText)
            }
          } catch {
            // 忽略解析错误
          }
        }
      }

      // 模型没吐出任何内容（超时硬停、空响应）时不落一条空气泡，按失败处理
      if (!fullText.trim()) throw new Error('模型返回为空')

      // 流式输出完成后，保存完整消息
      // 不设 streamingId：这段文字已经在屏幕上逐字出完了，
      // 正式气泡必须直接整段显示，再挂一次打字机就是第二次闪。
      addMessage({
        role: 'ai',
        text: fullText,
        answerSource: 'model',
        basis: ['康复档案', '康复师确认计划'],
        escalated: false,
      })
      setStreamingText('')
    } catch (error: any) {
      console.error('LLM 调用失败:', error)
      // 降级到预设答案；自由提问没有预设时走 FALLBACK_ANSWER（v0.1 §12：不硬答，转人工）
      const fallback = presetQ ?? FALLBACK_ANSWER
      setStreamingText('')
      const id = addMessage({
        role: 'ai',
        text: fallback.answer.join('\n'),
        answerSource: 'preset_fallback',
        basis: fallback.basis,
        escalated: fallback.escalate,
      })
      setStreamingId(id)
    }
  }

  function reply(q: PresetQA | null, asked: string) {
    addMessage({ role: 'family', text: asked })
    setTrace({ steps: traceFor(q), qa: q })
  }

  /**
   * 依据过程走完后出答案。
   *
   * 预设问题（演示主线那几道）**两条路都直接出预设，不调模型**：
   * 模型会润色改写，事先可预审这个最大的好处就没了；而且要等它吐字、
   * 网络或额度一挂就当场没有。线上那条路多一层公网，风险更高。
   * 模型留给评委临时问的自由问题 —— 本地无模型时回落到转人工。
   */
  const onTraceDone = useCallback(() => {
    if (!trace) return
    const q = trace.qa
    if (q) {
      const id = addMessage({
        role: 'ai',
        text: q.answer.join('\n'),
        externalText: q.external?.join('\n'),
        answerSource: 'preset',
        basis: q.basis,
        escalated: q.escalate,
      })
      setStreamingId(id)
      setTrace(null)
      return
    }
    const asked = messages[messages.length - 1]?.text ?? ''
    callLLM(asked, null)
    setTrace(null)
  }, [trace, messages])

  const busy = trace !== null || streamingId !== null || streamingText !== ''
  const unasked = busy ? [] : PRESET_QA.filter((q) => !messages.some((m) => m.role === 'family' && m.text === q.question))

  return (
    <section className="card card-pad chat">
      <div className="card-hd">
        <div>
          <div className="eyebrow">康复咨询</div>
          <h2 className="card-title">结合 {patient.name} 的档案作答</h2>
        </div>
        <span className="card-note">复杂问题会转交 {therapist.name} 康复师</span>
      </div>

      <div className="chat-body">
        {messages.length === 0 && (
          <div className="empty-chat">
            <div className="big">有什么想问的？</div>
            <div>回答会结合她的诊断、当前康复阶段和康复师确认的计划</div>
          </div>
        )}

        {messages.map((m) => {
          const isMe = m.role === 'family'
          const isTherapist = m.role === 'therapist'
          const q = PRESET_QA.find((x) => x.answer.join('\n') === m.text)
          const hint = q?.escalateHint ?? FALLBACK_ANSWER.escalateHint
          return (
            <div className="bub-row" data-me={isMe} key={m.id}>
              {/* 必须一眼分清 AI 与康复师：产品主张是 AI 不取代专业人员，
                  两者外观相同的话这条主张在界面上就不成立 */}
              {!isMe && (
                <span className={`bub-av${isTherapist ? ' bub-av-th' : ''}`}>
                  {isTherapist ? therapist.name[0] : <IconChat size={17} />}
                </span>
              )}
              <div className={`bub ${isMe ? 'bub-me' : isTherapist ? 'bub-th' : 'bub-ai'}`}>
                {!isMe && (
                  <div className="bub-who">
                    {isTherapist
                      ? <><span className="bub-tag bub-tag-th">康复师</span>{therapist.name} · {therapist.title}</>
                      : <><span className="bub-tag">AI</span>智能助手 · 依据她的康复档案作答</>}
                  </div>
                )}
                {/* 双源回答：外部通用科普（中性灰）在上，团队专业建议（品牌深青绿）在下。
                    甲方脚本写的是蓝底，但 v0.2 §6.2 禁止引入新强调色，改用品牌色区分。 */}
                {m.externalText && (
                  <div className="src src-ext">
                    <div className="src-t">网络参考信息</div>
                    {m.externalText.split('\n').map((line, i) => <RichText key={i} text={line} />)}
                  </div>
                )}

                {m.externalText ? (
                  <div className="src src-team">
                    <div className="src-t">银康安馨专业建议</div>
                    {m.id === streamingId
                      ? <StreamingBody text={m.text} onDone={() => setStreamingId(null)} />
                      : m.text.split('\n').map((line, i) => <RichText key={i} text={line} />)}
                  </div>
                ) : m.id === streamingId
                  ? <StreamingBody text={m.text} onDone={() => setStreamingId(null)} />
                  : m.text.split('\n').map((line, i) => <RichText key={i} text={line} />)}

                {!isMe && m.basis && m.id !== streamingId && (
                  <div className="basis">
                    <b>依据</b>
                    {m.basis.map((b) => <span className="chip" key={b} style={{ padding: '2px 9px' }}>{b}</span>)}
                  </div>
                )}

                {!isMe && m.escalated && m.id !== streamingId && (() => {
                  const asked = messages.find((x) => x.role === 'family' && x.at < m.at)
                  const question = [...messages].reverse().find((x) => x.role === 'family' && x.at <= m.at)?.text ?? asked?.text ?? ''
                  const sent = state.escalations.some((e) => e.question === question)
                  return (
                    <div className="escalate">
                      <span style={{ flex: 1 }}>{sent ? `已转交 ${therapist.name} 康复师，回复会显示在这里` : hint}</span>
                      {!sent && (
                        <button className="btn" onClick={() => createEscalation({
                          source: 'chat',
                          question,
                          context: m.basis ?? [],
                        })}>转康复师</button>
                      )}
                    </div>
                  )
                })()}
              </div>
              {isMe && <span className="bub-av" style={{ background: 'var(--surface-3)', color: 'var(--ink-2)' }}><IconUser size={16} /></span>}
            </div>
          )
        })}
        {streamingText && (
          <div className="bub-row" data-me={false}>
            <span className="bub-av"><IconChat size={17} /></span>
            <div className="bub bub-ai">
              <div className="bub-who">
                <span className="bub-tag">AI</span>智能助手 · 依据她的康复档案作答
              </div>
              <StreamingText text={streamingText} />
            </div>
          </div>
        )}
        {trace && <ThinkingTrace steps={trace.steps} onDone={onTraceDone} />}
        <div ref={endRef} />
      </div>

      <div style={{ marginTop: 20 }}>
        {unasked.length > 0 && (
          <div className="suggests">
            {unasked.map((q) => (
              <button className="suggest" key={q.id} onClick={() => reply(q, q.question)}>{q.question}</button>
            ))}
          </div>
        )}

        <div className="composer">
          <textarea
            className="ta"
            rows={2}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && draft.trim()) {
                e.preventDefault()
                reply(PRESET_QA.find((q) => q.question === draft.trim()) ?? null, draft.trim())
                setDraft('')
              }
            }}
            placeholder="输入您想问的问题…"
          />
          <button
            className="btn btn-lg"
            disabled={!draft.trim()}
            onClick={() => { reply(PRESET_QA.find((q) => q.question === draft.trim()) ?? null, draft.trim()); setDraft('') }}
          >
            <IconSend size={14} /> 发送
          </button>
        </div>
      </div>
    </section>
  )
}
