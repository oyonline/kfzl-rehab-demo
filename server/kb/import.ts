/**
 * 语料导入 —— 甲方 docx → 数据库 → FTS5 索引。
 *
 * 用 `pnpm kb:import` 运行。幂等：每次全量重灌 kb_documents / kb_chunks。
 *
 * 范围（2026-08-30 用户裁决）：模块一 44 篇科普 + 模块七政策福利 13 篇。
 * 政策集合按用户裁决 enabled=1 开放，以 disclaimer + provenance 降权兜底。
 */

import { readdirSync, statSync } from 'fs'
import { join, relative, basename } from 'path'
import { createHash, randomUUID } from 'crypto'
import { getDb, closeDb } from '../db/index.ts'
import { extractDocx, detectProvenance } from './docx.ts'
import { chunkText, jaccard } from './chunk.ts'
import { tokenize, toBigram } from './tokenize.ts'
import {
  APPROVAL_RECORDED_AT,
  APPROVED_KB_DOCUMENTS,
  isApprovedVersion,
} from '../content/approval-manifest.ts'

const SRC = process.env.KB_SOURCE_DIR ?? '/Users/linshen/Downloads/发公司 - 副本'

const COLLECTIONS = [
  { id: 'kb-m1', dir: '模块一——智能问答知识库' },
  { id: 'kb-m7', dir: '模块七——政策咨询和福利查询' },
]

/** 甲方自撰的规格说明书，不是科普内容，不进知识库 */
const EXCLUDE = new Set(['模块一 智能对话咨询.docx'])

function walk(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out.push(...walk(p))
    else if (name.endsWith('.docx') && !name.startsWith('~$') && !EXCLUDE.has(name)) out.push(p)
  }
  return out
}

interface Doc {
  id: string
  collectionId: string
  title: string
  sourcePath: string
  text: string
  tokens: Set<string>
  provenance: ReturnType<typeof detectProvenance>
  hash: string
}

const docs: Doc[] = []
const missingRoots: string[] = []

for (const col of COLLECTIONS) {
  const root = join(SRC, col.dir)
  let files: string[]
  try {
    files = walk(root).sort()
  } catch {
    missingRoots.push(root)
    continue
  }
  for (const f of files) {
    const text = extractDocx(f)
    if (text.length < 80) {
      console.warn(`跳过（正文过短 ${text.length} 字）：${basename(f)}`)
      continue
    }
    const rel = relative(SRC, f)
    docs.push({
      id: 'kbd-' + createHash('sha1').update(rel).digest('hex').slice(0, 12),
      collectionId: col.id,
      // 甲方文件名多被截断，首行通常是完整标题。但不少篇目把
      // 「标题 来源：X 正文…」写在同一段里，得在署名标记处截断，
      // 否则标题里会拖着半句正文。
      title: (() => {
        const first = text.split('\n')[0] ?? ''
        const cut = first.split(/(?:信息来源|来源|作者|供稿|出处|转载自)\s*[:：]/)[0].trim()
        const t = (cut || first || basename(f, '.docx')).trim()
        return (t.length > 60 ? t.slice(0, 60) : t) || basename(f, '.docx')
      })(),
      sourcePath: rel,
      text,
      tokens: new Set(tokenize(text)),
      provenance: detectProvenance(text),
      hash: createHash('sha256').update(text.replace(/\s/g, '')).digest('hex'),
    })
  }
}

if (missingRoots.length > 0) {
  throw new Error(`知识库源目录不完整，已中止且未修改数据库：${missingRoots.join('；')}`)
}

const importedIds = new Set(docs.map((d) => d.id))
const missingApprovedDocs = Object.keys(APPROVED_KB_DOCUMENTS).filter((id) => !importedIds.has(id))
if (missingApprovedDocs.length > 0) {
  throw new Error(`已确认版本缺少 ${missingApprovedDocs.length} 篇资料，已中止且未修改数据库`)
}

/**
 * 近重复聚簇。甲方语料里「老年人腿无力」题材 4 篇、「老人头晕」3 篇，
 * 内容高度重合；不聚簇的话一次检索的前几名会被同一题材占满。
 * 同簇在检索时只保留最高分 1 条。
 */
const groups = new Map<string, string>()
for (let i = 0; i < docs.length; i++) {
  if (groups.has(docs[i].id)) continue
  groups.set(docs[i].id, docs[i].id)
  for (let j = i + 1; j < docs.length; j++) {
    if (groups.has(docs[j].id)) continue
    if (jaccard(docs[i].tokens, docs[j].tokens) >= 0.5) groups.set(docs[j].id, docs[i].id)
  }
}

const WEIGHT = { attributed: 1.0, unattributed: 0.8, ai_flagged: 0.6 } as const

const db = getDb()
const now = new Date().toISOString()
const missingCollections = COLLECTIONS.filter(({ id }) =>
  !db.prepare('SELECT 1 FROM kb_collections WHERE id=?').get(id))
if (missingCollections.length > 0) {
  throw new Error('知识库集合尚未初始化，请先运行 pnpm seed；数据库未修改')
}

interface ExistingReview {
  id: string
  content_hash: string
  review_status: 'pending' | 'approved' | 'rejected'
  reviewed_by: string | null
  reviewed_at: string | null
  enabled: number
}
const existing = new Map(
  (db.prepare(`SELECT id,content_hash,review_status,reviewed_by,reviewed_at,enabled
    FROM kb_documents`).all() as ExistingReview[]).map((r) => [r.id, r]),
)
let chunkCount = 0

db.transaction(() => {
  db.prepare('DELETE FROM kb_chunks').run()
  db.prepare('DELETE FROM kb_documents').run()

  const insDoc = db.prepare(`INSERT INTO kb_documents
    (id,collection_id,title,source_path,author,source_note,provenance,review_status,
     reviewed_by,reviewed_at,enabled,weight,char_count,content_hash,dup_group,imported_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
  const insChunk = db.prepare(`INSERT INTO kb_chunks
    (id,doc_id,seq,heading,text,bigram,char_count) VALUES (?,?,?,?,?,?,?)`)
  const insAudit = db.prepare(`INSERT OR IGNORE INTO audit_log
    (id,user_id,action,entity,entity_id,detail,ip,at) VALUES (?,NULL,?,'kb_document',?,?,NULL,?)`)

  for (const d of docs) {
    const previous = existing.get(d.id)
    const unchanged = previous?.content_hash === d.hash
    const approvedManifestVersion = isApprovedVersion(APPROVED_KB_DOCUMENTS, d.id, d.hash)
    const reviewStatus = unchanged
      ? previous.review_status
      : approvedManifestVersion ? 'approved' : 'pending'
    const enabled = unchanged ? previous.enabled : approvedManifestVersion ? 1 : 0
    const reviewedBy = unchanged ? previous.reviewed_by : null
    const reviewedAt = unchanged
      ? previous.reviewed_at
      : approvedManifestVersion ? APPROVAL_RECORDED_AT : null

    insDoc.run(d.id, d.collectionId, d.title, d.sourcePath,
      d.provenance.author ?? null, d.provenance.sourceNote ?? null, d.provenance.tier,
      reviewStatus, reviewedBy, reviewedAt, enabled, WEIGHT[d.provenance.tier],
      d.text.length, d.hash, groups.get(d.id) ?? d.id, now)
    if (!unchanged && approvedManifestVersion) {
      insAudit.run(`manifest-approval-kb_document-${d.id}`, 'review_approved', d.id,
        JSON.stringify({ source: 'user-confirmed approval manifest', enabled: true }), APPROVAL_RECORDED_AT)
    } else if (previous && !unchanged) {
      insAudit.run(randomUUID(), 'review_reset_content_changed', d.id,
        JSON.stringify({ previousHash: previous.content_hash, currentHash: d.hash }), now)
    }
    for (const c of chunkText(d.text)) {
      insChunk.run(`${d.id}-c${c.seq}`, d.id, c.seq, c.heading ?? null,
        c.text, toBigram(`${c.heading ?? ''}\n${c.text}`), c.text.length)
      chunkCount++
    }
  }
})()

/* ---------- 报告 ---------- */

const byTier = db.prepare(`SELECT collection_id, provenance, count(*) c, sum(char_count) n
  FROM kb_documents GROUP BY collection_id, provenance ORDER BY collection_id, provenance`).all() as any[]
const dupes = db.prepare(`SELECT dup_group, count(*) c FROM kb_documents
  GROUP BY dup_group HAVING c > 1 ORDER BY c DESC`).all() as any[]

console.log(`\n导入完成：${docs.length} 篇 / ${chunkCount} 个切片\n`)
console.log('  集合      来源等级        篇数    字数')
for (const r of byTier) console.log(`  ${r.collection_id}     ${r.provenance.padEnd(14)} ${String(r.c).padStart(3)}  ${String(r.n).padStart(7)}`)
const tot = db.prepare('SELECT count(*) c, sum(char_count) n FROM kb_documents').get() as any
console.log(`  合计                      ${String(tot.c).padStart(3)}  ${String(tot.n).padStart(7)}`)
if (dupes.length) {
  console.log(`\n  近重复簇 ${dupes.length} 组：`)
  for (const g of dupes) {
    const titles = db.prepare('SELECT title FROM kb_documents WHERE dup_group = ?').all(g.dup_group) as any[]
    console.log(`    ${g.c} 篇：${titles.map((t) => t.title.slice(0, 22)).join(' / ')}`)
  }
}
closeDb()
