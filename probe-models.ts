import { LLMClient, Config } from 'coze-coding-dev-sdk'

const CANDIDATES = [
  'doubao-seed-2-0-pro-260215',
  'doubao-seed-2-0-lite-260215',
  'doubao-seed-2-0-mini-260215',
  'glm-5-0-260211',
  'glm-5-turbo-260316',
  'glm-4-7-251222',
  'minimax-m2-5-260212',
  'minimax-m2-7-260318',
  'qwen-3-5-plus-260215',
]

const MSG = [{ role: 'user', content: '回复"OK"两个字即可' }]

async function probe(model: string): Promise<string> {
  const client = new LLMClient(new Config({ timeout: 8000 }))
  const stream = client.stream(MSG, { model, temperature: 0.7 })
  let first = ''
  const hard = setTimeout(() => {
    throw new Error('硬超时')
  }, 10_000)
  try {
    for await (const chunk of stream) {
      first = typeof chunk === 'string' ? chunk : JSON.stringify(chunk)
      break
    }
  } finally {
    clearTimeout(hard)
    void (stream as any)?.return?.().catch(() => {})
  }
  if (!first) throw new Error('空响应')
  return first.slice(0, 100)
}

const results: Array<{ model: string; ok: boolean; detail: string }> = []
for (const model of CANDIDATES) {
  try {
    const detail = await probe(model)
    results.push({ model, ok: true, detail })
    console.log(`✓ ${model}  →  ${detail}`)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    results.push({ model, ok: false, detail: msg })
    console.log(`✗ ${model}  →  ${msg.slice(0, 120)}`)
  }
}

console.log('\n===== 汇总 =====')
console.log('可用:', results.filter((r) => r.ok).map((r) => r.model).join(', ') || '无')
console.log('不可用:', results.filter((r) => !r.ok).map((r) => r.model).join(', ') || '无')
