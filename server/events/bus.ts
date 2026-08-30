/**
 * 患者数据变更事件总线 —— 替代原来的浏览器 storage 事件。
 *
 * 原方案靠同源 localStorage：一端写，另一端的 storage 事件立刻触发。
 * 换成后端后该事件不再产生，「家属端打卡 → 康复师端立刻看到」这条演示主线
 * 会断掉（docs/后端与知识库方案.md §5 坑 1）。这里用进程内广播 + SSE 补上。
 *
 * 进程内即可：本项目是单进程 Express。将来若多实例部署，这一层要换成
 * Redis pub/sub 之类，但对外的 SSE 契约不变。
 */

import type { Response } from 'express'

export type ChangeKind =
  | 'checkin' | 'vital' | 'upload' | 'message' | 'guidance' | 'escalation' | 'reset'

interface Client {
  id: number
  patientId: string
  res: Response
}

let seq = 0
const clients = new Set<Client>()

export function addClient(patientId: string, res: Response): () => void {
  const c: Client = { id: ++seq, patientId, res }
  clients.add(c)
  return () => { clients.delete(c) }
}

/** 广播给关注该患者的所有连接。写操作提交后调用。 */
export function publish(patientId: string, kind: ChangeKind) {
  const payload = `event: change\ndata: ${JSON.stringify({ kind, patientId, at: Date.now() })}\n\n`
  for (const c of clients) {
    if (c.patientId !== patientId) continue
    try {
      c.res.write(payload)
    } catch {
      // 连接已断但还没触发 close 回调，丢弃即可，close 会清理
      clients.delete(c)
    }
  }
}

/** 心跳：穿过代理与浏览器的空闲超时，否则连接会被静默掐断而前端不自知 */
export function heartbeat() {
  for (const c of clients) {
    try { c.res.write(': ping\n\n') } catch { clients.delete(c) }
  }
}

export function clientCount() {
  return clients.size
}
