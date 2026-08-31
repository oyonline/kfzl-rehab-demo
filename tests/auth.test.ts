/**
 * 密码与令牌 —— 安全边界的地基。
 *
 * 这两块出错不会白屏，只会静默地把门打开，人工测试基本发现不了。
 */
import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword } from '../server/auth/password.ts'
import { signToken, verifyToken } from '../server/auth/jwt.ts'

describe('密码哈希（scrypt）', () => {
  it('正确密码通过，错误密码拒绝', () => {
    const { hash, salt } = hashPassword('123456')
    expect(verifyPassword('123456', hash, salt)).toBe(true)
    expect(verifyPassword('123457', hash, salt)).toBe(false)
    expect(verifyPassword('', hash, salt)).toBe(false)
  })

  it('每次加盐不同 —— 相同密码不会产生相同哈希', () => {
    const a = hashPassword('123456')
    const b = hashPassword('123456')
    expect(a.salt).not.toBe(b.salt)
    expect(a.hash).not.toBe(b.hash)
  })

  it('明文不出现在哈希里', () => {
    const { hash } = hashPassword('123456')
    expect(hash).not.toContain('123456')
  })

  it('哈希长度异常时返回 false 而不是抛异常', () => {
    // timingSafeEqual 长度不等会抛，password.ts 先挡了一道
    expect(() => verifyPassword('123456', 'ab', 'cd')).not.toThrow()
    expect(verifyPassword('123456', 'ab', 'cd')).toBe(false)
  })
})

describe('JWT 令牌', () => {
  const claims = {
    sub: 'u-family-chen',
    username: 'chen',
    role: 'family' as const,
    displayName: '陈家属',
  }

  it('签发后能原样校验回来', async () => {
    const token = await signToken(claims)
    const back = await verifyToken(token)
    expect(back?.sub).toBe('u-family-chen')
    expect(back?.role).toBe('family')
    expect(back?.username).toBe('chen')
  })

  it('令牌被篡改时返回 null，且不抛异常', async () => {
    const token = await signToken(claims)
    const tampered = token.slice(0, -4) + 'AAAA'
    await expect(verifyToken(tampered)).resolves.toBeNull()
  })

  it('乱字符串一律返回 null', async () => {
    await expect(verifyToken('not-a-token')).resolves.toBeNull()
    await expect(verifyToken('')).resolves.toBeNull()
  })

  it('角色写在令牌里 —— 前端改不了自己的角色', async () => {
    const token = await signToken({ ...claims, role: 'therapist' })
    expect((await verifyToken(token))?.role).toBe('therapist')
  })
})
