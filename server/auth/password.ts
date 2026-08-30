/**
 * 密码哈希 —— 用 node:crypto 的 scrypt，不引 bcrypt/argon2。
 * scrypt 是 Node 内置的抗硬件破解 KDF，对本项目规模完全够用，且零新依赖。
 */

import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'

const KEYLEN = 64

export function hashPassword(plain: string): { hash: string; salt: string } {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(plain, salt, KEYLEN).toString('hex')
  return { hash, salt }
}

export function verifyPassword(plain: string, hash: string, salt: string): boolean {
  const candidate = scryptSync(plain, salt, KEYLEN)
  const expected = Buffer.from(hash, 'hex')
  // 长度不等时 timingSafeEqual 会抛，先挡掉
  if (candidate.length !== expected.length) return false
  return timingSafeEqual(candidate, expected)
}
