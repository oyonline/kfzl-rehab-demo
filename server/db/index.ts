/**
 * 数据库连接与迁移执行器。
 *
 * SQLite 单文件：无独立进程，部署机与参赛人电脑都不用装服务，
 * 保住「断网也要完整呈现」这条既有硬约束（README 三条硬约束之三）。
 */

import Database from 'better-sqlite3'
import { readFileSync, readdirSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = join(__dirname, '..', '..')

/**
 * 数据库路径解析：DB_PATH 环境变量优先（部署管线可下发）；
 * 否则项目 data/（本地开发）；项目目录只读时（FaaS 沙箱实测踩过）退 /tmp。
 * SQLite 是单文件库，位置只是持久化细节，不改变任何行为。
 */
function resolveDbPath(): string {
  if (process.env.DB_PATH) return process.env.DB_PATH
  const fallback = join(PROJECT_ROOT, 'data', 'app.db')
  try {
    mkdirSync(dirname(fallback), { recursive: true })
    return fallback
  } catch {
    return '/tmp/kfzl-app.db'
  }
}

export const DB_PATH = resolveDbPath()

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (db) return db
  mkdirSync(dirname(DB_PATH), { recursive: true })
  db = new Database(DB_PATH)
  // WAL：读写并发下不会互相阻塞。SSE 长连接与写入同时进行时这一条是必需的。
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  migrate(db)
  return db
}

function migrate(d: Database.Database) {
  d.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL
  )`)

  const applied = new Set(
    d.prepare('SELECT name FROM schema_migrations').all().map((r: any) => r.name as string),
  )

  const dir = join(__dirname, 'migrations')
  const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()

  for (const f of files) {
    if (applied.has(f)) continue
    const sql = readFileSync(join(dir, f), 'utf8')
    // 单个迁移整体成事务：中途失败不留半张表
    const run = d.transaction(() => {
      d.exec(sql)
      d.prepare('INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)').run(
        f,
        new Date().toISOString(),
      )
    })
    run()
    console.log(`[db] 迁移已应用：${f}`)
  }
}

export function closeDb() {
  db?.close()
  db = null
}
