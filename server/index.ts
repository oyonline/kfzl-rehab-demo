import express from 'express'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { getDb } from './db/index.ts'
import { authRouter } from './routes/auth.ts'
import { patientsRouter } from './routes/patients.ts'
import { kbRouter } from './routes/kb.ts'
import { contentRouter } from './routes/content.ts'
import { search } from './kb/search.ts'
import { heartbeat } from './events/bus.ts'
import { runSeed } from './seed/run.ts'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const PROJECT_ROOT = join(__dirname, '..')

const app = express()
const PORT = Number(process.env.PORT ?? 5000)

/**
 * AI 开关 —— 一个仓两种跑法的分界点。
 *
 * 扣子容器里有 COZE_WORKLOAD_IDENTITY_API_KEY，自动开启；
 * 本地没有，自动关闭，`/api/chat` 立刻返回 503，前端回落到预设答案。
 *
 * 关键在「立刻」：本地绝不能真去调模型再等超时 —— 现场网络不可控，
 * 家属问一句话转圈半分钟，演示就砸了。
 * 需要强制覆盖时用 AI_ENABLED=1 / AI_ENABLED=0。
 */
const AI_ENABLED = (() => {
  const explicit = process.env.AI_ENABLED
  if (explicit != null && explicit !== '') {
    return explicit === '1' || explicit.toLowerCase() === 'true'
  }
  return Boolean(process.env.COZE_WORKLOAD_IDENTITY_API_KEY)
})()

/** SDK 默认超时时长未知（扣子侧自陈未验证），因此必须显式给死 */
const LLM_TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS ?? 15000)

app.use(express.json())

// 启动即建连并跑迁移：让「表缺失」这类问题在启动时暴露，而不是等第一个请求
getDb()

// 空库自动灌种子：部署环境没人手动跑 pnpm seed，不灌的话连登录账号都没有。
// 只在 users 表为空（全新库）时执行，已有数据的库绝不重灌。
{
  const db = getDb()
  const userCount = (db.prepare('SELECT count(*) c FROM users').get() as any).c
  if (userCount === 0) {
    console.log('[db] 空库，自动灌入种子数据')
    runSeed()
  }
}

app.use('/api/auth', authRouter)
app.use('/api/patients', patientsRouter)
app.use('/api/kb', kbRouter)
app.use('/api/content', contentRouter)

// SSE 心跳：代理与浏览器都会掐掉长时间无数据的连接，掐掉后前端不会自知
setInterval(heartbeat, 25_000).unref()

app.get('/api/ai-status', (_req, res) => {
  res.json({ enabled: AI_ENABLED, timeoutMs: LLM_TIMEOUT_MS })
})

/**
 * 本地验流式 UI 用的模拟流，默认关闭，只认 AI_MOCK=1。
 * 演示与部署都不会走到这里 —— 它存在的唯一目的是：
 * 本地没有模型凭据时，仍能把「分块到达」这个行为复现出来验证前端。
 */
const AI_MOCK = process.env.AI_MOCK === '1'

app.post('/api/chat', async (req, res) => {
  if (AI_MOCK) {
    // 按双源两段式返回 —— 模拟流同时用来自检前端的切分与渲染
    const canned =
      '【网络参考信息】\n' +
      '运动后肌肉酸痛多为延迟性肌肉酸痛，通常在运动后 24–72 小时出现，属正常修复反应。轻度酸胀可继续活动但应降低强度；若出现关节痛、刺痛、肿胀或持续不缓解，应暂停并就医。\n' +
      '（信息来源于公开健康科普资料，仅供参考）\n' +
      '【银康安馨专业建议】\n' +
      '结合林奶奶的情况（左侧肌力 MMT 4 级、准备期、高血压 5 年）：\n' +
      '一、**酸胀感休息后能减轻**属正常，可减量继续；**关节痛、刺痛或不缓解**请立即停止。\n' +
      '二、今天可以：轻柔按摩左下肢大腿小腿肌群、温热毛巾敷 10–15 分钟、下次训练前先热身。\n' +
      '三、出现酸痛超过两天、关节肿胀发红、影响站立行走、伴随头晕胸闷，请联系小婷康复师。\n' +
      '—— 银康安馨康复团队'
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    let i = 0
    const push = () => {
      if (i >= canned.length) {
        res.write('data: [DONE]\n\n')
        return res.end()
      }
      // 故意用不均匀的块长，真实流就是这样一阵一阵来的
      const size = [2, 5, 11, 3, 18, 7][i % 6]
      res.write(`data: ${JSON.stringify({ content: canned.slice(i, i + size) })}\n\n`)
      i += size
      setTimeout(push, 90)
    }
    push()
    return
  }

  if (!AI_ENABLED) {
    // 立刻返回，不触网。前端据此回落到预设答案。
    return res.status(503).json({ error: 'ai_disabled', message: '本机未启用 AI，使用预设答案' })
  }

  try {
    const { messages, model } = req.body

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages 不能为空' })
    }
    if (!messages.some((m: any) => m.role === 'user')) {
      return res.status(400).json({ error: 'messages 必须包含至少一条 user 消息' })
    }

    /**
     * 检索增强（P5）。此前自由提问是把患者档案拼进提示词直接问模型，
     * 甲方那 57 篇资料一篇都没被用上。现在先检索、再让模型照着资料答，
     * 并把命中项作为「依据」回给前端。
     *
     * 检索失败不阻断回答 —— 退回原来的纯档案模式，比整个问答挂掉强。
     */
    const lastUser = [...messages].reverse().find((m: any) => m.role === 'user')
    let hits: ReturnType<typeof search> = []
    try {
      hits = search(String(lastUser?.content ?? ''), { topK: 4 })
    } catch (e) {
      console.error('[kb] 检索失败，回退为纯档案回答', e)
    }

    const augmented = messages.map((m: any) => ({ ...m }))
    if (hits.length > 0) {
      const refs = hits.map((h, i) =>
        `【资料${i + 1}】${h.title}${h.heading ? ` · ${h.heading}` : ''}\n${h.sourceLabel}\n${h.text}`,
      ).join('\n\n')
      const disclaimers = [...new Set(hits.map((h) => h.disclaimer).filter(Boolean))]
      const sys = augmented.find((m: any) => m.role === 'system')
      const block = `\n\n【检索到的资料】以下是从知识库里检索到的内容，回答时以它们为准。\n` +
        `引用哪一条就在句末标注【资料N】。资料里没有的内容不要编造，也不要把资料\n` +
        `当成针对这位老人的医嘱 —— 它们是通用科普，个体化建议仍以档案与康复师计划为准。\n` +
        (disclaimers.length ? `必须在回答末尾附上：${disclaimers.join('；')}\n` : '') +
        `\n${refs}`
      if (sys) sys.content += block
      else augmented.unshift({ role: 'system', content: block })
    }

    // 动态引入：本地关掉 AI 时完全不加载这个 3.8MB 的包
    const { LLMClient, Config, HeaderUtils } = await import('coze-coding-dev-sdk')

    // req.headers 是 IncomingHttpHeaders（值可能是 string[]），
    // SDK 只认 Record<string,string>，先规整一次
    const flatHeaders: Record<string, string> = {}
    for (const [k, v] of Object.entries(req.headers)) {
      if (typeof v === 'string') flatHeaders[k] = v
      else if (Array.isArray(v)) flatHeaders[k] = v.join(', ')
    }
    const customHeaders = HeaderUtils.extractForwardHeaders(flatHeaders)
    const config = new Config({ timeout: LLM_TIMEOUT_MS })
    const client = new LLMClient(config, customHeaders)

    const stream = client.stream(augmented, {
      model: model || 'doubao-seed-1-8-251228',
      temperature: 0.7,
    })

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    // 先发一帧命中项：前端据此渲染真实的「依据」，不必等答案生成完
    res.write(`data: ${JSON.stringify({
      sources: hits.map((h) => ({
        docId: h.docId, title: h.title, heading: h.heading,
        sourceLabel: h.sourceLabel, provenance: h.provenance,
        collectionName: h.collectionName, disclaimer: h.disclaimer,
      })),
    })}\n\n`)

    // 整条流也要有上限：SDK 的 timeout 管的是单次请求，
    // 流中途卡住不发新 chunk 时它不一定会断。
    let closed = false
    const hardStop = setTimeout(() => {
      if (closed) return
      closed = true
      res.write('data: [DONE]\n\n')
      res.end()
    }, LLM_TIMEOUT_MS * 2)

    try {
      for await (const chunk of stream) {
        if (closed) break
        if (chunk.content) {
          res.write(`data: ${JSON.stringify({ content: chunk.content.toString() })}\n\n`)
        }
      }
    } finally {
      clearTimeout(hardStop)
      if (!closed) {
        closed = true
        res.write('data: [DONE]\n\n')
        res.end()
      }
    }
  } catch (error: any) {
    console.error('LLM API error:', error)
    if (res.headersSent) {
      res.end()
      return
    }
    res.status(500).json({
      error: error.message || 'LLM 调用失败',
      statusCode: error.statusCode,
    })
  }
})

// 静态文件服务（前端构建产物）
app.use(express.static(join(PROJECT_ROOT, 'dist')))

// SPA fallback：前端路由
app.get('/', (_req, res) => {
  res.sendFile(join(PROJECT_ROOT, 'dist', 'index.html'))
})
app.get(/^\/(patient|therapist)(\/.*)?$/, (_req, res) => {
  res.sendFile(join(PROJECT_ROOT, 'dist', 'index.html'))
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}  (AI ${AI_ENABLED ? '已启用' : '未启用，走预设答案'})`)
})
