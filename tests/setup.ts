/**
 * 每个测试文件跑在独立进程里，这里给它分配一个专属的临时数据库。
 *
 * 必须在任何模块 import 之前设好：`server/db/index.ts` 的 DB_PATH
 * 是模块加载时求值的常量（`export const DB_PATH = resolveDbPath()`），
 * 晚一步设就没用了。setupFiles 正是在测试文件被 import 之前执行。
 */
import { mkdtempSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const dir = mkdtempSync(join(tmpdir(), 'kfzl-test-'))

// 绝不碰开发库 data/app.db
process.env.DB_PATH = join(dir, 'test.db')

// 固定密钥：否则 jwt.ts 会往 DB_PATH 同目录落一个随机密钥文件，
// 每个测试文件的令牌互不通用。长度须 ≥32，见 server/auth/jwt.ts:36
process.env.JWT_SECRET = 'test-only-secret-not-for-production-use'

// 测试里绝不调真实模型
process.env.AI_ENABLED = '0'
