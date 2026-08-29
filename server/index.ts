import express from 'express'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const PROJECT_ROOT = join(__dirname, '..')

const app = express()
const PORT = process.env.PORT || 5000

app.use(express.json())

// LLM 聊天接口
app.post('/api/chat', async (req, res) => {
  console.log('API /api/chat called with:', req.body)
  try {
    const { messages, model } = req.body

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages 不能为空' })
    }

    // 必须至少有一条 user 消息
    if (!messages.some((m: any) => m.role === 'user')) {
      return res.status(400).json({ error: 'messages 必须包含至少一条 user 消息' })
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers)
    const config = new Config()
    const client = new LLMClient(config, customHeaders)

    const stream = client.stream(messages, {
      model: model || 'doubao-seed-1-8-251228',
      temperature: 0.7,
    })

    // SSE 流式输出
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    for await (const chunk of stream) {
      if (chunk.content) {
        res.write(`data: ${JSON.stringify({ content: chunk.content.toString() })}\n\n`)
      }
    }

    res.write('data: [DONE]\n\n')
    res.end()
  } catch (error: any) {
    console.error('LLM API error:', error)
    res.status(500).json({
      error: error.message || 'LLM 调用失败',
      statusCode: error.statusCode,
    })
  }
})

// 静态文件服务（前端构建产物）
app.use(express.static(join(PROJECT_ROOT, 'dist')))

// SPA fallback：前端路由
app.get('/', (req, res) => {
  res.sendFile(join(PROJECT_ROOT, 'dist', 'index.html'))
})
app.get(/^\/(patient|therapist)(\/.*)?$/, (req, res) => {
  res.sendFile(join(PROJECT_ROOT, 'dist', 'index.html'))
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`)
})
