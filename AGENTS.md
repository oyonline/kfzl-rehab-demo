## 项目概述
居家康复助手（参赛/演示项目）：家属端（患者打卡、智能问答）+ 康复师工作台（患者管理、审核、收件箱）。web 形态，前后端同仓。

## 技术栈
- 前端：Vite + React + TypeScript
- 后端：Express + better-sqlite3（SQLite 单文件库，无独立 DB 进程），tsx 直接跑 TS
- 包管理：pnpm；Node.js 24

## 目录结构
- `server/` Express 后端：`routes/`（auth/patients/kb/content/review）、`db/migrations/`（顺序 SQL 迁移）、`kb/`（知识库检索）、`seed/`（演示种子）、`index.ts`（入口）
- `src/` React 前端：`pages/patient/`（家属端）、`pages/therapist/`（工作台）、`store/store.ts`（状态与 API 封装）、`data/`（种子与类型）
- `scripts/` `build.sh`/`run.sh`（部署）、`dev-build.sh`/`dev-run.sh`（预览）
- `data/app.db` 本地 SQLite（部署机位置由 `DB_PATH` 环境变量决定，缺省 `data/app.db`，目录只读时退 `/tmp`）

## 关键入口 / 核心模块
- 启动即跑迁移：`server/db/index.ts` `migrate()`，按文件名顺序应用 `server/db/migrations/*.sql`，`schema_migrations` 表记录；每库只跑一次
- 空库自动灌种子：`server/index.ts` 启动时 users 为空才调 `runSeed()`，已有数据的库绝不重灌
- 智能问答：`/api/chat`（流式 SSE）；会话历史存 `messages` 表（role: family/ai/therapist）
- 相关表语义：`messages`=问答会话历史；`escalations`=康复师收件箱升级提问（独立功能）；`kb_search_log`=内部检索日志（界面不可见）

## 运行与预览
- 预览：`.coze [dev]` → `scripts/dev-run.sh` 双进程（Express 5100 + Vite 5000 代理 `/api`），端口读 `.preview`
- 部署：`.coze [deploy]` → `scripts/run.sh` 单进程 5000 托管 `dist/` + `/api`
- 验证：统一走 `test_run`（探活 + 接口冒烟）；本地账号见"常见问题"

## 用户偏好与长期约束
- 断网也要能完整演示：SQLite 单文件、本地 AI 关闭时回落预设答案（AI_ENABLED 由环境自动判定）
- 演示口令 123456（scrypt 存储），正式部署需改密

## 常见问题和预防
- 本地 `data/app.db` 是 2026-09 早期的种子库，与部署机数据不同步：本地无 `dengyi`/`p-dengyi`，可用账号 `chen`/`123456`（家属，患者 `p-001` 林奶奶）、`zhou`/`123456`（康复师）
- 患者详情接口是 `GET /api/patients/:id/state`（含 messages/checkIns 等），不是 `/:id`；Express 对未知路径返回 HTML 404（"Cannot GET"），接口冒烟返回 HTML 先怀疑路径写错
- 正式部署的库不跨部署持久：线上日志证实每次部署 0001 起迁移全部重新应用、随后重新灌种子（2026-09-20 实测）
- 种子预置对话已删除（2026-09-20）：`runSeed` 不再写入 dengMessages 4 条演示问答，新库问答页为空；`0007_clear_chat_history.sql` 迁移兜底可能存在的旧持久库；一次性数据变更需「迁移 + 种子」双改才对两种库形态都生效
- 一次性数据清理用迁移文件实现，部署启动时自动生效；全新空库先跑迁移再灌种子
