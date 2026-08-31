# ADR 0011 · 跨端实时用 fetch 流式读，不用 EventSource

- 日期：2026-08-30
- 状态：生效
- 相关代码：`src/store/store.ts`、`server/events/bus.ts`

## 背景

演示主线要求：家属端打卡后，**康复师端无刷新**由 0/4 变 1/4。
数据搬到服务端后（[0010](0010-数据层搬到-SQLite.md)），
原来的 localStorage 跨标签页订阅失效，需要服务端推送。

## 备选

1. **轮询**：实现最简单，但延迟明显，演示时"变化"来得不干脆。
2. **WebSocket**：能力最强，但为单向推送引入双向协议，且需额外鉴权设计。
3. **SSE via `EventSource`**：浏览器原生，正是为单向推送设计的。
4. **SSE via `fetch` + `ReadableStream`**：手写流读取。

## 裁决

**方案 4。** 理由是一个硬限制：

**`EventSource` 不能带自定义请求头**，而令牌走 `Authorization: Bearer`
（[0002](0002-登录态用-sessionStorage.md)）。唯一的变通是把令牌塞进 URL 查询串 ——
那会让凭证进入**浏览器历史与服务端访问日志**，不可接受。

`fetch` + `ReadableStream` 能带头，且与 `ChatView` 读 `/api/chat` 的写法一致。

## 后果

- 令牌不落地到 URL，凭证不进历史与日志。
- 代价：断线重连、心跳、流关闭要自己实现，`EventSource` 自带的这些能力全部手写。
- 这是 [0002](0002-登录态用-sessionStorage.md) 的直接连锁后果 ——
  一个存储位置的选择，最终决定了实时推送的技术方案。
