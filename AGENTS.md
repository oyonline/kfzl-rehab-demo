## 项目概述

居家康复智能助手（双端演示原型）——面向脑卒中居家康复场景的 PC 双端可交互原型。演示主线闭环：老人/家属端执行并打卡 → 康复师端远程查看 → 康复师回写指导 → 家属端收到。

## 技术栈

- **框架**：React 19 + Vite 8 + TypeScript 6
- **路由**：react-router-dom 7（CSR，HashRouter/BrowserRouter 待确认）
- **样式**：自定义 CSS（设计令牌 + 组件样式），无 Tailwind / 组件库
- **状态管理**：localStorage + 跨标签页订阅（自建 store）
- **认证**：sessionStorage（按标签页隔离，两端并排演示不互顶）
- **Lint**：oxlint
- **包管理器**：pnpm

## 目录结构

```
src/
  main.tsx              应用入口
  App.tsx               路由配置
  auth/auth.ts          账号密码登录（sessionStorage）
  store/store.ts        localStorage + 跨标签页订阅
  data/
    types.ts            双端共用数据契约（已冻结）
    seed.ts             虚构案例、入院记录、任务计划等
    qa.ts               咨询预设答案
    guidance.ts         饮食与健康指导
    videoSteps.ts       训练分步说明
  styles/               设计令牌与组件样式
  components/           图标、完整档案抽屉、登录守卫
  pages/patient/        老人/家属端页面
  pages/therapist/      康复师端页面
scripts/
  dev-build.sh          预览 build（安装依赖）
  dev-run.sh            预览 run（Vite dev server）
  build.sh              部署 build（Vite 构建产物）
  run.sh                部署 run（serve dist）
```

## 关键入口 / 核心模块

- **路由入口**：`src/App.tsx`
- **数据层**：`src/data/`（types.ts 为冻结契约，改动须两端同步）
- **状态层**：`src/store/store.ts`（localStorage 跨标签页同步）
- **认证层**：`src/auth/auth.ts`（sessionStorage 登录态）

## 路由结构

家属端：
- `/patient` 今日、`/patient/chat` 康复咨询、`/patient/calendar` 打卡日历、`/patient/guidance` 饮食与健康
- `/patient/videos` 训练视频列表 → `/patient/videos/:id` 详情
- `/patient/guidance/:id` 饮食与健康详情

康复师端：
- `/therapist` 在管患者列表（工作台首页）
- `/therapist/inbox` 待处理
- `/therapist/patients/:id` 患者详情（随访概览 / 咨询记录 / 依从性 / 指导记录）

## 运行与预览

- 预览：`scripts/dev-build.sh` + `scripts/dev-run.sh`（Vite dev server，端口从 `.preview` 读取）
- 部署：`scripts/build.sh` + `scripts/run.sh`（Vite build → serve dist）
- `.preview` 文件声明 `expose_port = 5000`

## 三条硬约束（来自 README）

1. **两端必须同源部署**：同一域名下的两个路径，否则 localStorage 不互通
2. **登录态必须用 sessionStorage**：不得改回 localStorage，否则两端互顶会话
3. **不引入任何外部字体、图标库或 CDN**：图标内联 SVG，字体用系统字体，断网也要完整呈现

## 用户偏好与长期约束

- 包管理器只用 pnpm
- 不引入外部 CDN / 字体 / 图标库
- Git 提交身份必须是用户本人：`ouyang <81409107@qq.com>`（沙箱默认的 coze noreply 身份不合规，已在仓库本地 git config 修正）

## 常见问题和预防

- 登录态放 localStorage 会导致两端互顶 → 必须用 sessionStorage
- 跨域名部署会导致 localStorage 不互通 → 必须同源
- 视频未到位时不做假播放 → `videos[].src` 为空时显示海报 + 分步图文
