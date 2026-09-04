## 项目概述

居家康复智能助手 —— 面向脑卒中居家康复场景的双端系统（老人/家属端 + 康复师端）。
演示主线闭环：老人/家属端执行并打卡 → 康复师端远程查看 → 康复师回写指导 → 家属端收到。

**两条线，动手前先确认在哪条上：**

- **比赛线**：tag `demo-competition-20260830`，冻结的双端可交互原型，数据在浏览器内。需要 hotfix 从该 tag 拉分支，**不要用 main**。
- **产品线**：`main`，真实后端。本文件描述的是这条。

## 技术栈

**前端**

- React 19 + Vite 8 + TypeScript 6
- react-router-dom 7（CSR）
- 自定义 CSS（设计令牌 + 组件样式），**无 Tailwind / 无组件库 / 无 CDN**
- 19 页面 + 14 组件

**后端**

- Express 5 + better-sqlite3
- 鉴权：scrypt 密码哈希 + jose 签发 JWT，令牌存 sessionStorage 经 `Authorization: Bearer` 回传
- 持久层：SQLite，3 支迁移 / 28 张表 / 21 个索引，启动即建连跑迁移
- 检索：SQLite FTS5 全文检索，语料切片 + 分级加权
- 实时：`fetch` 流式读（不用 `EventSource`，理由见下）
- 49 个路由处理器

**工程**

- Lint：oxlint
- 包管理器：pnpm（`packageManager` 已锁 10.30.3）
- 测试：vitest，服务端冒烟测试 32 条（`tests/`），临时数据库隔离
- CI：GitHub Actions，每次推送在干净克隆上跑 typecheck / lint / test / build
- 一键验证：`pnpm verify`

## 目录结构

```
src/
  main.tsx              应用入口
  App.tsx               路由配置
  auth/auth.ts          登录（JWT 存 sessionStorage）
  store/store.ts        数据边界：乐观更新 + 后台提交 + 流式实时
  data/
    types.ts            双端共用数据契约（已冻结）
    seed.ts             病例、入院记录、任务计划等
    qa.ts               知识库标准问答（已审核版本由哈希清单锁定）
    guidance.ts         饮食与健康指导（已审核版本由哈希清单锁定）
    videoSteps.ts       训练分步说明（已审核版本由哈希清单锁定）
  styles/               设计令牌与组件样式
  components/           图标、完整档案抽屉、登录守卫
  pages/patient/        老人/家属端页面
  pages/therapist/      康复师端页面
server/
  index.ts              应用入口、AI 开关、空库自动灌种
  auth/                 jwt.ts · middleware.ts · password.ts
  db/                   index.ts · migrations/（0001_init · 0002_care_alerts · 0003_review_audit）
  routes/               auth · patients · kb · content · review · mappers
  kb/                   import · chunk · docx · tokenize · search
  events/bus.ts         跨端事件推送
  seed/run.ts           种子数据
scripts/
  dev-build.sh          预览 build（安装依赖）
  dev-run.sh            预览 run（Vite dev server）
  build.sh              部署 build（Vite 构建产物）
  run.sh                部署 run（起 Express）
```

## 关键入口 / 核心模块

- **前端路由入口**：`src/App.tsx`
- **数据边界**：`src/store/store.ts` —— 前端唯一碰数据源的地方，14 个对外函数签名冻结
- **认证层**：`src/auth/auth.ts`（前端）+ `server/auth/`（真正的安全边界）
- **服务端入口**：`server/index.ts`
- **数据契约**：`src/data/types.ts`（冻结，改动须两端同步）
- **AI 咨询**：`server/index.ts` 的 `/api/chat`（RAG：先检索知识库再作答）。
  模型白名单 `LLM_MODELS` + 默认 `DEFAULT_LLM_MODEL`，均经 `probe-models.ts` 实测；
  前端模型选择器在 `src/pages/patient/ChatView.tsx` 的 `LLM_OPTIONS`，
  **与服务端白名单一一对应，改动须两侧同步**

## 路由结构

根路径：
- `/` 角色选择页（`src/pages/LandingPage.tsx`）—— 两个入口各一张卡片；未知路径也兜底到这里

家属端：
- `/patient` 今日、`/patient/chat` 康复咨询、`/patient/calendar` 打卡日历、`/patient/guidance` 饮食与健康
- `/patient/videos` 训练视频列表 → `/patient/videos/:id` 详情
- `/patient/guidance/:id` 饮食与健康详情

康复师端：
- `/therapist` 在管患者列表（工作台首页）
- `/therapist/inbox` 待处理
- `/therapist/review` 内容审核后台（四类内容分页签，驳回即停止下发，写审计日志）
- `/therapist/patients/:id` 患者详情（随访概览 / 咨询记录 / 依从性 / 指导记录）

## 运行与预览

**开发需要同时起两个进程**：

```
pnpm server     # Express，提供 /api，默认 5099
pnpm dev        # Vite，5173，把 /api 代理到 5099
```

两个默认值已对齐（2026-08-31 修）。此前 server 默认 5000、Vite 代理默认 5099，
对不上，直接 `pnpm server` 会让所有接口请求连不上。不用 5000 是因为 macOS
AirPlay 占着它，且 `.preview` 把 5000 分给了 Vite。

- 预览：`scripts/dev-build.sh` + `scripts/dev-run.sh`（端口从 `.preview` 读取，`expose_port = 5000`）
- 部署：`scripts/build.sh` + `scripts/run.sh`（Vite build → Express 托管，单进程同源）
- 首次启动自动建表、跑迁移、灌种子（仅 `users` 表为空时）

## 三条硬约束

1. **两端必须同源部署**：同一域名下的两个路径。前端以相对路径请求 `/api`，跨域名部署接口打空。
2. **登录态必须用 sessionStorage，不得改用 Cookie**：Cookie 同源共享会让两端互相顶掉会话，并排演示当场失效（实测踩过）。
3. **不引入任何外部字体、图标库或 CDN**：图标内联 SVG，字体用系统字体，视频进仓，断网也要完整呈现。

## 用户偏好与长期约束

- 包管理器只用 pnpm
- 不引入外部 CDN / 字体 / 图标库
- Git 提交身份必须是用户本人：`ouyang <81409107@qq.com>`（沙箱默认的 coze noreply 身份不合规，已在仓库本地 git config 修正）
- **commit 消息一律不加 `Co-Authored-By`**

## 常见问题和预防

- 改动 `server/index.ts` 或 `vite.config.ts` 的默认端口时**两侧必须同改**，
  否则开发环境所有接口请求连接被拒（2026-08-31 前就是这个状态）
- 登录态改用 Cookie → 两端互顶会话
- 跨域名部署 → `/api` 相对路径打空
- 视频未到位时不做假播放 → `videos[].src` 为空时显示海报 + 分步图文；文件缺失走 `onError` 兜底
- 视频素材必须进 Git 仓库（`public/videos/`）：部署从仓库构建，排除会导致线上永远缺视频；现场断网可用，不能用外部对象存储/CDN 当视频源
- 写运行时目录的 `.gitignore` 条目**必须带前导斜杠**（`/data/` 而非 `data/`）：写成 `data/` 会连 `src/data/` 一起吞掉，源码静默漏推、线上构建全线失败（2026-08-30 实测）
- **服务端不得在模块加载阶段写盘**：密钥与数据库路径须支持环境变量覆盖并回退可写目录，否则只读沙箱直接启动失败
- 交付前对**推上去的那棵树**另做干净克隆构建：本地 `tsc`/`build`/浏览器全绿照不出漏推。
  已脚本化：`bash scripts/verify-clean-clone.sh --no-videos`
- **新增根目录脚本要记得进 `tsconfig.server.json` 的 include**：否则 `tsc` 不检查它。
  `probe-models.ts` 就因此带着一个类型错误进了仓，直到 tests 接入 typecheck 才暴露
- **平台模型快照会停运**：原默认 `doubao-seed-1-8-251228` 被平台下线，导致 AI 咨询整体故障
  （2026-08-30 发现，08-31 修复）。模型名必须用实测通过的快照 ID —— 平台文档列出的模型
  也可能 not found（`glm-5` / `minimax-m2.x` / `qwen-3.5` 实测均不可用），**以探测为准**。
  演示前建议跑一遍 `probe-models.ts` 确认模型仍在线
- **前端传来的 `model` 字段不可信任**：不在 `LLM_MODELS` 白名单的一律回退默认值并告警

## 决策记录

**改动前先查 [docs/adr/](docs/adr/)** —— 16 条关键决策的背景、备选、裁决与后果。
本仓多处实现是权衡结果而非疏忽（不用 `EventSource`、视频进 git、同步写签名等），
不读 ADR 直接"优化"会踩回原坑。

## 内容红线

- 2026-09-04 用户已确认三个医疗内容文件（`qa.ts` / `guidance.ts` / `videoSteps.ts`）及 57 篇知识库资料全部审核通过并启用；后续新增或修改的医疗内容仍须重新审核
- 量表分值来自甲方实测并署名，**本项目不生成任何分值**；用药剂量甲方未给，保持 `待专业确认`，**不生成剂量**
- 标注 `SYNTHETIC` 的字段是虚构的，勿当作甲方数据引用
- 不得出现"已由医生确认""已真实接入""已同步医院系统"等冒充生产事实的措辞
- 知识库 16 篇转载语料**版权状态未确认**
- 接入真实患者数据、接生产医疗系统**均未授权**
