/**
 * 知识库检索 —— 「依据展示」的真实性来源（ADR 0007）。
 *
 * 中文检索走二字滑窗 + FTS5。这里用项目自己的分词器造夹具，
 * 测的是真实链路，不是另写一套。
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getDb, closeDb } from '../server/db/index.ts'
import { search } from '../server/kb/search.ts'
import { toBigram } from '../server/kb/tokenize.ts'

const COL = 'col-test'

function addDoc(id: string, title: string, text: string, opts: {
  review?: 'pending' | 'approved' | 'rejected'
  enabled?: number
} = {}) {
  const db = getDb()
  const now = new Date().toISOString()
  db.prepare(`INSERT INTO kb_documents
    (id,collection_id,title,source_path,provenance,review_status,enabled,weight,char_count,content_hash,imported_at)
    VALUES (?,?,?,?, 'attributed', ?, ?, 1.0, ?, ?, ?)`)
    .run(id, COL, title, `/test/${id}.md`, opts.review ?? 'pending', opts.enabled ?? 1, text.length, `hash-${id}`, now)
  db.prepare(`INSERT INTO kb_chunks (id,doc_id,seq,heading,text,bigram,char_count)
              VALUES (?,?,0,NULL,?,?,?)`)
    .run(`${id}-c0`, id, text, toBigram(text), text.length)
}

beforeAll(() => {
  const db = getDb()
  db.prepare(`INSERT INTO kb_collections (id,name,enabled) VALUES (?,?,1)`).run(COL, '测试合集')
  addDoc('d-swallow', '吞咽训练要点', '吞咽训练需要端坐位进食，小口慢咽，避免呛咳风险')
  addDoc('d-rejected', '被驳回的资料', '吞咽训练可以随意进行不必端坐', { review: 'rejected' })
  addDoc('d-disabled', '已停用的资料', '吞咽训练相关的停用内容', { enabled: 0 })
})
afterAll(() => closeDb())

describe('中文全文检索', () => {
  it('能检索到相关内容', () => {
    const hits = search('吞咽训练', { topK: 5 })
    expect(hits.length).toBeGreaterThan(0)
    expect(hits.map((h: any) => h.docId)).toContain('d-swallow')
  })

  it('**被驳回的语料不进检索结果** —— 与审核闸是同一条承诺', () => {
    const hits = search('吞咽训练', { topK: 10 })
    expect(hits.map((h: any) => h.docId)).not.toContain('d-rejected')
  })

  it('已停用的语料同样排除', () => {
    const hits = search('吞咽训练', { topK: 10 })
    expect(hits.map((h: any) => h.docId)).not.toContain('d-disabled')
  })

  it('检索不到时返回空数组，不抛异常 —— 上游据此回落纯档案模式', () => {
    expect(search('完全无关的词汇组合泽维尔')).toEqual([])
  })

  it('空查询安全返回', () => {
    expect(search('')).toEqual([])
    expect(search('   ')).toEqual([])
  })

  it('topK 生效', () => {
    expect(search('吞咽训练', { topK: 1 }).length).toBeLessThanOrEqual(1)
  })

  it('命中项带出处字段 —— 依据展示要用', () => {
    const [hit] = search('吞咽训练', { topK: 1 }) as any[]
    expect(hit).toBeTruthy()
    expect(hit.title).toBeTruthy()
    expect(hit.text).toBeTruthy()
    expect(hit.provenance).toBeTruthy()
  })
})
