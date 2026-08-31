# 系统架构

本文描述 `main`（产品线）的实际形态。比赛线冻结在 tag `demo-competition-20260830`，
是另一套架构（浏览器内数据、无后端），不适用本文。

---

## 一、系统由哪些子系统组成

十个，各自独立可测：

| 子系统 | 位置 | 职责 |
|---|---|---|
| 双端前端 | `src/pages/` | 老人/家属端 + 康复师端，19 页面 14 组件 |
| 自建设计系统 | `src/styles/` | 设计令牌 + 组件样式，1249 行，无 UI 库（[ADR 0004](adr/0004-不引入外部依赖.md)） |
| 前端数据边界 | `src/store/store.ts` | 14 个对外函数，乐观更新 + 后台提交（[ADR 0012](adr/0012-写操作乐观更新.md)） |
| 鉴权 | `server/auth/` | scrypt 密码、jose JWT、三层中间件 |
| 持久层 | `server/db/` | SQLite + 迁移执行器，28 表 21 索引 |
| 业务接口 | `server/routes/` | 49 个路由处理器，按域拆分 |
| 知识库 | `server/kb/` | 导入、切片、中文分词、FTS5 检索 |
| 实时推送 | `server/events/` | fetch 流式读（[ADR 0011](adr/0011-实时推送不用-EventSource.md)） |
| 内容审核 | `server/routes/review.ts` | 四类内容审核 + 审计日志（[ADR 0014](adr/0014-内容审核走页面.md)） |
| AI 咨询 | `server/index.ts` `/api/chat` | RAG：先检索再作答，带出处 |

---

## 二、演示主线的数据流

这是整个系统存在的理由 —— 一条闭环：

```
家属端点「完成」
   │
   ├─ store.ts 立刻改本地缓存并重渲染          ← 乐观更新，点一下就变
   │
   └─ POST /api/patients/:id/checkins
          │
          ├─ requireAuth        令牌有效？账号还 active？
          ├─ requirePatientAccess  这个用户对这个患者有授权吗？→ 无则 403
          │
          ├─ 写 check_ins 表
          └─ events/bus 广播
                 │
                 └─ 康复师端的流式连接收到事件
                        │
                        └─ 重新拉取 → 依从性由 0/4 变 1/4，无需刷新
```

失败时 `store.ts` 从服务端重新拉取，界面退回真实状态（对勾自己消失），
**不留假的成功** —— 在医疗场景里谎报"已完成训练"是不可接受的。

---

## 三、鉴权与权限模型

三层，逐层收紧：

```
requireAuth            令牌可解 + 账号 status = active
   ↓                   （令牌有效不等于账号仍有效，每次回库核一次）
requireRole            角色闸：family / therapist / admin
   ↓
requirePatientAccess   行级权限：查 patient_members，无记录即 403
```

**行级权限是产品线的核心安全不变量。** 比赛版 `PATIENT_ID` 写死，
任何人拿到页面就能看全部数据；产品线必须逐患者校验。

一个刻意的设计：**不区分「患者不存在」与「无权访问」**，两者都返回 403。
否则可以靠状态码差异枚举出系统里有哪些患者。

令牌存 `sessionStorage`、经 `Authorization: Bearer` 回传，
**不得改用 Cookie**（[ADR 0002](adr/0002-登录态用-sessionStorage.md)）。

由 `tests/access.test.ts` 守住。

---

## 四、数据模型

28 张表 / 21 个索引 / 3 支迁移，按域分组：

| 域 | 表 |
|---|---|
| 账号与权限 | `users`、`patient_members` |
| 患者档案 | `patients`、`patient_contact`、`patient_diagnosis`、`patient_function`、`patient_goals`、`admissions`、`assessments`、`medications` |
| 康复计划 | `task_defs`、`reminders`、`videos`、`video_steps` |
| 执行与随访 | `check_ins`、`vitals`、`uploads`、`care_events`、`escalations` |
| 沟通 | `messages`、`guidances` |
| 内容 | `preset_qa`、`guidance_articles` |
| 知识库 | `kb_collections`、`kb_documents`、`kb_chunks`、`kb_search_log`（另有 FTS5 虚表 `kb_chunks_fts`） |
| 审计 | `audit_log` |

迁移执行器要点：

- **启动即建连跑迁移**，让"表缺失"在启动时暴露，而不是等第一个请求
- 单个迁移**整体成事务**，中途失败不留半张表
- **可重入**：已应用的迁移不重复执行（由 `tests/migrations.test.ts` 守住）
- 空库自动灌种，仅当 `users` 表为空；已有数据的库绝不重灌
- 外键约束开启 —— 否则行级权限可被脏数据绕过
- WAL 模式：SSE 长连接与写入同时进行时必需

---

## 五、接口

49 个路由处理器：

| 文件 | 数量 | 内容 |
|---|---|---|
| `patients.ts` | 34 | 档案、打卡、体征、上传、消息、指导、升级、待处理 |
| `auth.ts` | 5 | 登录、登出、当前用户 |
| `kb.ts` | 5 | 检索、文档、合集 |
| `review.ts` | 4 | 审核清单、审核动作、审计记录 |
| `content.ts` | 1 | 内容下发（**过滤 `review_status <> 'rejected'`**） |

`content.ts` 那一行 WHERE 是[内容审核](adr/0014-内容审核走页面.md)承诺的落地点：
驳回即停止下发。由 `tests/review.test.ts` 守住。

---

## 六、知识库检索

中文检索方案：**二字滑窗分词 + FTS5 + BM25**。

```
语料文件 → import.ts 解析 → chunk.ts 切片 → tokenize.ts 转二字滑窗串
                                                    ↓
                                    kb_chunks.bigram（触发器同步进 FTS5 虚表）
                                                    ↓
查询 → toMatchQuery → FTS5 MATCH → BM25 打分 → 权重加权 → 近重复折叠 → topK
```

打分链路上的三个业务规则：

- `review_status = 'rejected'` 与 `enabled = 0` 的文档**在 SQL 里直接排除**
- `approved` 的文档额外加权
- 同一 `dup_group`（近重复簇）在 topK 内只保留最高分一条，
  因此先多取候选（LIMIT 60）再折叠，否则折叠后不够数

命中项作为第一帧回传前端，用于渲染"依据"。
**检索失败不阻断回答** —— 退回纯档案模式，比整个问答挂掉强。

---

## 七、AI 咨询

```
提问 → 检索知识库 → 命中项注入系统提示词 → 调模型（流式）→ 前端逐字渲染
        │                                      │
        └─ 失败则退回纯档案模式                  └─ 失败/空响应则降级预设答案
```

三层超时，逐层放宽：

| 层 | 上限 | 作用 |
|---|---|---|
| SDK 单次请求 | `LLM_TIMEOUT_MS`（15 s） | 单次调用超时 |
| 整条流 | `LLM_TIMEOUT_MS × 2` | 流中途卡住不发新 chunk 时 SDK 不一定会断 |
| 前端等待 | `LLM_ABORT_MS`（20 s） | 比服务端略长，让服务端错误先浮出来 |

模型走**白名单**，前端传来的 `model` 字段不被信任，不在白名单一律回退默认
（[ADR 0016](adr/0016-模型白名单以实测为准.md)）。

本地无模型时立刻返回 503 而非等超时 —— 现场网络不可控，
转圈半分钟演示就砸了（[ADR 0015](adr/0015-本地立刻关闭-AI.md)）。

---

## 八、一个仓两种跑法

差异全部收敛到运行时开关，不分仓（[ADR 0008](adr/0008-一个仓两种跑法.md)）：

| 环境变量 | 作用 | 默认 |
|---|---|---|
| `PORT` | 服务端口 | 5099（与 Vite 代理对齐）；部署由 `run.sh` 显式设 5000 |
| `DB_PATH` | 数据库位置 | 项目 `data/`；目录只读时退 `/tmp` |
| `JWT_SECRET` | 令牌密钥 | 未设则落盘持久化，避免重启掉登录态 |
| `AI_ENABLED` | AI 开关 | 检测到扣子容器密钥则开，否则关 |
| `LLM_TIMEOUT_MS` | 模型死超时 | 15000 |

**服务端不得在模块加载阶段写盘** —— 密钥与数据库路径必须支持环境变量覆盖
并回退可写目录，否则只读沙箱直接启动失败（实测踩过）。

---

## 九、部署形态

**开发**：两个进程。Vite（5173）提供前端，Express（5099）提供 `/api`，
Vite 代理转发，浏览器看到的是同源。

**部署**：单进程。`build.sh` 构建产物，`run.sh` 起 Express，
由它同时托管 `dist/` 与 `/api`，天然同源。

两端必须部署在**同一域名的两个路径**下 ——
前端以相对路径请求 `/api`，跨域名会让接口打空（[ADR 0003](adr/0003-两端同源部署.md)）。

---

## 十、验证链路

```
pnpm verify  =  typecheck  +  lint  +  test
```

- **typecheck** 覆盖 `src` / `server` / `tests` / 根目录脚本
- **test** 32 条服务端冒烟测试，各自临时数据库隔离，约 0.4 秒
- **CI**（`.github/workflows/ci.yml`）每次推送在干净克隆上重跑全部
- **交付前**：`scripts/verify-clean-clone.sh` 从远端重新克隆验证

CI 第一步校验源码树完整性，直接针对 2026-08-30 那次
「`.gitignore` 少写前导斜杠吞掉 `src/data/`、本地全绿而线上全挂」的事故。
