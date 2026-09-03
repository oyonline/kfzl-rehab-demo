import { useCallback, useEffect, useRef, useState } from 'react'
import { FALLBACK_ANSWER, type PresetQA } from '../../data/qa'
import type { Patient, TaskDef, Therapist } from '../../data/types'
import { useContent, usePatientData } from '../../data/context'
import { addMessage, createEscalation, useDemoState } from '../../store/store'
import { authFetch } from '../../auth/auth'
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

/** 知识库命中项 —— 与 /api/kb/search 的返回对齐 */
export interface KbHit {
  docId: string
  title: string
  heading?: string
  sourceLabel: string
  provenance: 'attributed' | 'unattributed' | 'ai_flagged'
  collectionName: string
  disclaimer?: string
}

/** 检索知识库。失败不抛，返回空数组 —— 检索挂了也不能让问答挂掉 */
async function kbSearch(q: string, patientId: string): Promise<{ hits: KbHit[]; disclaimers: string[] }> {
  try {
    const res = await authFetch('/api/kb/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q, topK: 4, patientId }),
    })
    if (!res.ok) return { hits: [], disclaimers: [] }
    const d = await res.json()
    return { hits: d.hits ?? [], disclaimers: d.disclaimers ?? [] }
  } catch {
    return { hits: [], disclaimers: [] }
  }
}

/**
 * 依据步骤 —— 只写系统真实做过的事。
 *
 * 档案与康复师确认计划确实注入了提示词；安全边界确实在起作用
 * （超出范围会走转康复师）。
 *
 * 「检索知识库」这一步在 P5（2026-08-30）之前**不写**，因为当时没有检索层，
 * 写了就是宣称系统有它没有的能力。现在语料已入库、检索真的在跑，
 * 所以如实写上，且只在真有命中时才出现，条数与文档名都取自实际返回。
 */
/**
 * P4 起患者数据由 PatientProvider 提供，模块级函数不能再直接读单例，
 * 需要什么就传什么 —— 这样多患者下不会串档。
 */
interface PromptCtx {
  patient: Patient
  taskDefs: TaskDef[]
  therapist: Therapist
  planConfirmedOn: string
}

function traceFor(ctx: PromptCtx, q: PresetQA | null, hits: KbHit[] = []): TraceStep[] {
  const { patient, taskDefs, planConfirmedOn } = ctx
  const steps: TraceStep[] = [
    { label: '读取康复档案', detail: `${patient.name} · ${patient.diagnosis.strokeType} · ${patient.diagnosis.stage}` },
    { label: '结合康复师确认的计划', detail: `${planConfirmedOn} 制定，含今日 ${taskDefs.length} 项安排` },
  ]
  if (hits.length > 0) {
    steps.push({
      label: '检索知识库',
      detail: `命中 ${hits.length} 篇：${hits.map((h) => h.title.slice(0, 14)).join('、')}`,
    })
  }
  steps.push({
    label: '按安全边界组织回答',
    detail: q?.escalateHint ?? '超出可安全回答范围的部分交回康复师',
  })
  return steps
}

/** 命中项 → 「依据」标签。出处如实带出，不美化 */
const hitsToBasis = (hits: KbHit[]) =>
  hits.map((h) => `《${h.title.slice(0, 18)}》${h.sourceLabel}`)

/** 前端等待上限。比服务端的 15s 略长，让服务端的错误先浮出来 */
const LLM_ABORT_MS = 20000

/** 模型选项 —— 与服务端 LLM_MODELS 白名单一一对应，均经 probe-models.ts 实测 */
const LLM_OPTIONS = [
  { value: 'doubao-seed-2-0-lite-260215', label: '标准 · 豆包 2.0 Lite' },
  { value: 'doubao-seed-2-0-pro-260215', label: '旗舰 · 豆包 2.0 Pro' },
  { value: 'doubao-seed-2-0-mini-260215', label: '极速 · 豆包 2.0 Mini' },
  { value: 'glm-4-7-251222', label: '备用 · GLM-4.7' },
]

/** 构建系统提示词，注入患者档案上下文 */
/** 双源回答的分段标记 —— 提示词里要求模型原样输出，前端据此切成两块 */
export const SRC_EXTERNAL = '【网络参考信息】'
export const SRC_TEAM = '【银康安馨专业建议】'

function buildSystemPrompt(ctx: PromptCtx): string {
  const { patient, taskDefs, therapist, planConfirmedOn } = ctx
  const assess = patient.assessments.map((a) => `${a.name} ${a.value}${a.level ? `（${a.level}）` : ''}`).join('；')
  const plan = taskDefs.map((t) => `${t.scheduledTime} ${t.title}`).join('、')

  return `你是居家康复智能助手，正在为${patient.name}的家属${patient.caregiver.name}提供康复咨询。

患者档案：
- 姓名：${patient.name}，${patient.gender}，${patient.ageBand}
- 诊断：${patient.diagnosis.strokeType}；合并${patient.diagnosis.comorbidities.join('、')}
- 阶段：${patient.diagnosis.stage}
- 患侧：${patient.functionStatus.affectedSide}
- 评估（${planConfirmedOn} 前由康复团队实测）：${assess}
- 风险：${patient.functionStatus.risks.join('；')}
- 用药：${patient.medications.map((m) => m.name).join('、') || '暂无'}（剂量未确认，不得提及具体剂量）

今日计划（${planConfirmedOn} 由康复师确认）：${plan}

康复师：${therapist.name}（${therapist.title}）

【输出格式】必须分成两段，标题原样写，不要加编号或其它符号：

${SRC_EXTERNAL}
通用健康科普层面的说法，不针对这位老人。写完在末尾附一句
「（信息来源于公开健康科普资料，仅供参考）」。

${SRC_TEAM}
结合上面档案里的具体情况给出的建议，要点到她的评估数据或今日计划。
末尾另起一行写「—— 银康安馨康复团队」。

【如实原则 · 最重要】
- 你没有联网检索能力，第一段只能写你确知的通用科普，**不要暗示是刚刚搜到的**。
- 若某一段确实没有可靠内容可写，就在该标题下**如实写明没有**，例如
  「这个问题超出我能提供的科普范围，建议直接咨询${therapist.name}康复师。」
  **绝对不要为了填满格式而编造内容。**
- 档案里没有的信息（如具体用药剂量、未做过的检查结果）一律不得杜撰。

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

/**
 * 把模型返回的整段切成双源两块。
 *
 * 模型不总是守格式 —— 没出现标记时整段当作专业建议那一块返回，
 * 不硬拆，也不丢内容。流式过程中同样可用：外部块先成形，团队块随后。
 */
export function splitDualSource(text: string): { external?: string; team: string } {
  const iE = text.indexOf(SRC_EXTERNAL)
  const iT = text.indexOf(SRC_TEAM)
  if (iE < 0 && iT < 0) return { team: text }
  if (iT < 0) return { external: text.slice(iE + SRC_EXTERNAL.length).trim(), team: '' }
  const external = iE >= 0 ? text.slice(iE + SRC_EXTERNAL.length, iT).trim() : undefined
  return { external, team: text.slice(iT + SRC_TEAM.length).trim() }
}

export function ChatView() {
  const { planConfirmedOn, patient, taskDefs, therapist } = usePatientData()
  const { presetQA: PRESET_QA } = useContent()
  const promptCtx: PromptCtx = { patient, taskDefs, therapist, planConfirmedOn }
  const state = useDemoState()
  const [draft, setDraft] = useState('')
  const [model, setModel] = useState(LLM_OPTIONS[0].value)
  const [trace, setTrace] = useState<{ steps: TraceStep[]; qa: PresetQA | null; hits: KbHit[]; disclaimers: string[] } | null>(null)
  const [streamingId, setStreamingId] = useState<string | null>(null)
  const [streamingText, setStreamingText] = useState('')
  // 模型首字返回前界面必须有东西：依据动画走完就消失，而首 token 要等数秒，
  // 中间全空白——等模型回复期间显示思考占位，首个字到达后切打字机
  const [waitingLLM, setWaitingLLM] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const messages = state.messages

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [messages.length, trace, streamingId])

  /** 调用 LLM API，流式接收回答 */
  async function callLLM(userQuestion: string, presetQ: PresetQA | null, hits: KbHit[] = [], disclaimers: string[] = []) {
    // 构建消息历史（最近 10 轮）
    const recentMessages = messages.slice(-10).map(m => ({
      role: m.role === 'family' ? 'user' : 'assistant',
      content: m.text,
    }))

    const apiMessages = [
      { role: 'system', content: buildSystemPrompt(promptCtx) },
      ...recentMessages,
      { role: 'user', content: userQuestion },
    ]

    try {
      // 前端也必须自带上限：服务端 503（本机未启用 AI）是瞬时的，
      // 但网络层卡住时只有这里能把它掐掉，否则家属端就一直转圈。
      setWaitingLLM(true)
      const ac = new AbortController()
      const abortTimer = setTimeout(() => ac.abort(), LLM_ABORT_MS)

      let response: Response
      try {
        response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: apiMessages, model }),
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
              setWaitingLLM(false)
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
      // 切成两块存：这样双源渲染对预设答案和模型答案是同一套，不用分叉
      const { external, team } = splitDualSource(fullText)
      addMessage({
        role: 'ai',
        text: team || fullText,
        externalText: external,
        answerSource: 'model',
        // 如实：档案确实注入了提示词；知识库命中项由服务端一并注入并回传，
        // 这里直接用真实文档名与出处，不再是写死的两条。
        basis: [
          `${patient.name}的康复档案`,
          `${planConfirmedOn} 康复师确认计划`,
          ...hitsToBasis(hits),
        ],
        escalated: false,
      })
      setStreamingText('')
    } catch (error: any) {
      console.error('LLM 调用失败:', error)
      // 降级到预设答案；自由提问没有预设时走 FALLBACK_ANSWER（v0.1 §12：不硬答，转人工）
      const fallback = presetQ ?? FALLBACK_ANSWER
      setStreamingText('')
      setWaitingLLM(false)
      // 本机无模型时走这里。检索仍然有效 —— 它不依赖模型，
      // 所以「依据」照样是真实命中的文档，断网也成立。
      const id = addMessage({
        role: 'ai',
        text: [
          ...fallback.answer,
          ...(disclaimers.length ? ['', ...disclaimers] : []),
        ].join('\n'),
        answerSource: 'preset_fallback',
        basis: [...fallback.basis, ...hitsToBasis(hits)],
        escalated: fallback.escalate,
      })
      setStreamingId(id)
    }
  }

  async function reply(q: PresetQA | null, asked: string) {
    addMessage({ role: 'family', text: asked })
    // 预设问题走甲方原文，不检索；自由提问才检索，且先拿到命中再放依据动画，
    // 这样动画里报的条数与文档名是真的，不是占位。
    const { hits, disclaimers } = q ? { hits: [] as KbHit[], disclaimers: [] as string[] } : await kbSearch(asked, patient.id)
    setTrace({ steps: traceFor(promptCtx, q, hits), qa: q, hits, disclaimers })
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
    callLLM(asked, null, trace.hits, trace.disclaimers)
    setTrace(null)
  }, [trace, messages])

  // 2026-09-03 用户裁决：移除预设问题快捷按钮，改为用户自由输入。
  // 输入框发送时仍按原文精确匹配 PRESET_QA —— 手输预设问题照样出甲方原文答案，
  // 兜底机制不动，删的只是「方便点击」的入口。
  // 注：远端 278a9f4 引入的 busy（含 waitingLLM）原本只为锁 unasked，
  // 按钮移除后无消费者，随 unasked 一并移除；等待空窗的思考占位由
  // waitingLLM 直接驱动，不受影响。

  return (
    <section className="card card-pad chat">
      <div className="card-hd">
        <div>
          <div className="eyebrow">智能对话咨询</div>
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
        {waitingLLM && !streamingText && (
          <div className="bub-row" data-me={false}>
            <span className="bub-av"><IconChat size={17} /></span>
            <div className="bub bub-ai">
              <div className="bub-who">
                <span className="bub-tag">AI</span>智能助手 · 依据她的康复档案作答
              </div>
              <div className="thinking-dots" role="status" aria-label="正在结合资料思考">
                <span /><span /><span />
              </div>
            </div>
          </div>
        )}
        {streamingText && (
          <div className="bub-row" data-me={false}>
            <span className="bub-av"><IconChat size={17} /></span>
            <div className="bub bub-ai">
              <div className="bub-who">
                <span className="bub-tag">AI</span>智能助手 · 依据她的康复档案作答
              </div>
              {/* 流式过程中就按两块渲染：外部块一旦成形就固定住，
                  团队块继续逐字出。等全部出完再切成两块会闪一下。 */}
              {(() => {
                const { external, team } = splitDualSource(streamingText)
                if (external === undefined) return <StreamingText text={team} />
                return (
                  <>
                    <div className="src src-ext">
                      <div className="src-t">网络参考信息</div>
                      {external.split('\n').map((line, i) => <RichText key={i} text={line} />)}
                    </div>
                    {team && (
                      <div className="src src-team">
                        <div className="src-t">银康安馨专业建议</div>
                        <StreamingText text={team} />
                      </div>
                    )}
                  </>
                )
              })()}
            </div>
          </div>
        )}
        {trace && <ThinkingTrace steps={trace.steps} onDone={onTraceDone} />}
        <div ref={endRef} />
      </div>

      <div style={{ marginTop: 20 }}>
        <div className="composer">
          <textarea
            className="ta"
            rows={2}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && draft.trim()) {
                e.preventDefault()
                void reply(PRESET_QA.find((q) => q.question === draft.trim()) ?? null, draft.trim())
                setDraft('')
              }
            }}
            placeholder="输入您想问的问题…"
          />
          <button
            className="btn btn-lg"
            disabled={!draft.trim()}
            onClick={() => { void reply(PRESET_QA.find((q) => q.question === draft.trim()) ?? null, draft.trim()); setDraft('') }}
          >
            <IconSend size={14} /> 发送
          </button>
        </div>

        {/* 模型切换放输入区旁 —— 参考主流 AI 界面，顶栏只留主线信息 */}
        <div className="composer-tools">
          <select
            className="model-pick"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            aria-label="回答模型"
          >
            {LLM_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <span className="card-note">复杂问题会转交 {therapist.name} 康复师</span>
        </div>
      </div>
    </section>
  )
}
