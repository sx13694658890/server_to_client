# 前端工程开发计划（React Monorepo）

本文档在 [FRONTEND.md](./FRONTEND.md) 总览与 [FRONTEND_API.md](./FRONTEND_API.md) **HTTP 契约**基础上，约定前端技术选型、仓库结构、包职责与实施阶段，供立项与迭代排期使用。实现细节以 OpenAPI 与仓库代码为准。

---

## 1. 目标与范围

| 目标 | 说明 |
|------|------|
| 对接 FastAPI v1 | Base URL、认证、错误、JWT、各路径见 [FRONTEND_API.md](./FRONTEND_API.md)；工程与安全见 [FRONTEND.md](./FRONTEND.md) |
| 可维护的 Monorepo | 应用与可复用包分层，**pnpm workspace** 统一依赖与脚本 |
| 类型安全 | **全仓 TypeScript**，API 类型优先从 OpenAPI 生成并与手写类型对齐 |
| 组件与逻辑复用 | **UI 组件独立包**；业务与基础设施以 **Hooks** 为主组织 |
| 样式与组件库 | **Tailwind CSS** 负责布局与定制样式；**Ant Design（antd）** 提供基础组件，按需配置主题与样式隔离策略 |

**不在本文强制约定**：具体路由结构、状态管理库选型（可按阶段在 `apps/*` 内选定并文档化）。

---

## 2. 技术栈

| 层级 | 选型 | 备注 |
|------|------|------|
| 运行时 / 框架 | React 18+ | 函数组件 + Hooks |
| 语言 | TypeScript（strict 推荐） | `tsconfig` 基座在根或 `packages/tsconfig` 继承 |
| 包管理 | **pnpm** | `pnpm-workspace.yaml`；禁止混用 npm/yarn |
| 构建 | Vite（推荐）或团队既定方案 | 与 [FRONTEND.md](./FRONTEND.md) §3 **跨域与代理** 一致 |
| 样式 | **Tailwind CSS** | 与 antd 并存时需约定 Preflight/reset 与组件类名前缀 |
| UI | **antd** | 按需引入、主题 Token；业务封装放在 `packages/ui` |
| HTTP | fetch 封装或 axios | 集中实例：Base URL、`Authorization`、422/detail 解析 |
| JWT 解码（仅展示/路由） | `jwt-decode` 等 | **不**在前端校验签名，见 [FRONTEND_API.md](./FRONTEND_API.md) §5 |

---

## 3. Monorepo 目录结构（建议）

```
.
├── pnpm-workspace.yaml
├── package.json                 # 根脚本：lint / build / dev 聚合
├── tsconfig.base.json           # 或 packages/tsconfig/base.json
├── apps/
│   └── web/                     # 主 Web 应用（Vite + React）
│       ├── src/
│       ├── vite.config.ts       # server.proxy：/api → 后端
│       └── tailwind.config.js
└── packages/
    ├── ui/                      # 基于 antd 的业务组件封装（无业务路由）
    ├── hooks/                   # 通用 React Hooks（useAuth、useApi 等）
    ├── utils/                   # 纯函数、格式化、FastAPI detail 解析等
    ├── api-client/              # 可选：OpenAPI 生成客户端 + 薄封装
    └── config-eslint / config-tsconfig  # 可选：共享配置包
```

**原则**：

- `apps/*` 只负责组合：路由、页面、全局 Provider、环境变量入口。
- `packages/ui`：**单独发包或 workspace 引用**，导出明确入口（如 `@repo/ui`），避免应用内复制粘贴组件。
- `packages/hooks`、`packages/utils`：**提取公用方法**，供所有应用与 UI 包引用；禁止 `apps` 与 `packages` 循环依赖（依赖方向：`apps` → `packages`）。

---

## 4. 包职责说明

### 4.1 `apps/web`

- 环境变量：`VITE_API_BASE_URL` 等，与 [FRONTEND.md](./FRONTEND.md) §1 / [FRONTEND_API.md](./FRONTEND_API.md) §1 一致。
- Vite `server.proxy`：将 `/api` 代理到 `http://127.0.0.1:8000`（或环境变量），前端请求可用相对路径 `/api/v1/...`，规避开发期 CORS。
- 全局：`ConfigProvider`（antd）、可选 React Query / SWR 的 `QueryClientProvider`。
- 路由守卫：基于 JWT payload（`sub`、`roles`、`exp`）与后端约定。
- 登录后布局：`/dashboard/*`（顶栏 + 侧栏 + 用户管理等），侧栏与迭代规划见 [POST_LOGIN_NAV.md](./POST_LOGIN_NAV.md)。

### 4.2 `packages/utils`

- **统一错误处理**：`detail` 为 `string` 或数组时的解析与展示文案，对齐 [FRONTEND_API.md](./FRONTEND_API.md) §6。
- 日期、UUID 字符串校验等无副作用工具。
- 不包含 React 依赖（除非单独 `utils-react` 子包，按需拆分）。

### 4.3 `packages/hooks`

- `useAuth`：登录态、Token 存储策略（安全策略见 [FRONTEND.md](./FRONTEND.md) §5）。
- `useApi` / `useMutation`：封装带 `Authorization: Bearer` 的请求；**401/403** 时统一跳转登录（当前无 refresh，需重新登录）。
- 依赖 `@repo/utils` 与（可选）`@repo/api-client`。

### 4.4 `packages/ui`

- 对 antd 的二次封装：表单、表格、布局、空状态等；**Tailwind** 用于外层布局与间距，避免与 antd 内部样式硬冲突（可用 `prefixCls` 或 CSS 层叠策略）。
- 导出类型与组件 API 文档（README 或 Storybook，按阶段引入）。

### 4.5 `packages/api-client`（推荐）

- 自 `http://127.0.0.1:8000/openapi.json` 用 **openapi-typescript** / **Orval** / **hey-api/openapi-ts** 生成类型与客户端，见 [FRONTEND.md](./FRONTEND.md) §4。
- CI：校验 OpenAPI 变更或 artifact 版本对齐。

---

## 5. TypeScript 与工程化

| 项 | 建议 |
|----|------|
| 严格模式 | `strict: true`，统一 `tsconfig` 继承 |
| 路径别名 | 在 Vite/tsconfig 中配置 `@/` 与 `@repo/*` |
| ESLint + Prettier | 根配置 + 可选 `packages/config-eslint` |
| 提交规范 | 可选 husky + lint-staged，与后端文档变更联动（`FRONTEND_API.md` / `FRONTEND.md` 索引） |

---

## 6. 与对接文档的映射检查表

实施各阶段可用下表自检：

| 文档 / 章节 | 前端落地 |
|-------------|----------|
| FRONTEND_API §1 | `VITE_API_BASE_URL`、拼接 `/api/v1`；健康检查可走代理或绝对 URL |
| FRONTEND_API §4 | `POST .../auth/register`、`POST .../auth/login`；`GET/DELETE .../users`；Bearer |
| FRONTEND_API §5 | 解码 `sub`、`email`、`roles`、`exp`；知悉角色变更延迟 |
| FRONTEND_API §6 | `utils` 中统一解析 `detail` |
| FRONTEND §4 | OpenAPI 生成脚本与 CI 约定 |
| FRONTEND §3 | 开发期 Vite 代理；生产同源或后端 CORS |
| FRONTEND §5 | Token 存储策略、HTTPS、不落 URL |

---

## 7. 分阶段实施计划

### 阶段 A：仓库脚手架（约 1–2 天）

- 初始化 pnpm workspace、`apps/web`（Vite + React + TS）。
- 接入 Tailwind、antd、`tsconfig` 继承链。
- 配置代理与 `VITE_API_BASE_URL` 示例 `.env.development`。
- 根脚本：`pnpm dev`、`pnpm build`、`pnpm lint`。

### 阶段 B：共享层（约 2–4 天）

- 新建 `packages/utils`（含 FastAPI `detail` 解析）。
- 新建 `packages/hooks`（HTTP 客户端 + `useAuth` 骨架）。
- 新建 `packages/ui`（示例：基于 antd 的 `AppLayout` / `PageHeader`）。
- 在 `apps/web` 中引用 workspace 包，验证构建与 HMR。

### 阶段 C：API 契约与认证闭环（约 3–5 天）

- 拉取/固定 `openapi.json`，生成 `packages/api-client`。
- 实现注册、登录页面与错误展示；登录后持久化策略按安全评审定稿。
- 实现至少一个需登录接口的占位或真实调用，验证 401 行为。

### 阶段 D：功能迭代与质量（持续）

- 按产品拆分路由与页面；组件下沉到 `packages/ui`。
- 补充 E2E/组件测试（按团队标准选 Playwright / Vitest + Testing Library）。
- OpenAPI 变更时更新生成物并修订 [FRONTEND_API.md](./FRONTEND_API.md)（及必要时 [FRONTEND.md](./FRONTEND.md) 索引）。

---

## 8. 风险与决策记录（需团队确认）

1. **antd + Tailwind**：是否关闭 Tailwind Preflight 或对 antd 使用单独层；建议在 `apps/web` 试点一页后固化配置。
2. **Token 存储**：内存 + 刷新丢失 vs httpOnly Cookie（依赖后端演进），与 [FRONTEND.md](./FRONTEND.md) §5 一致。
3. **Monorepo 工具**：若后续规模扩大，可评估 Turborepo / Nx（非首期必须）。

---

## 9. 文档索引

| 文档 | 用途 |
|------|------|
| [FRONTEND_API.md](./FRONTEND_API.md) | **HTTP API 参考**（必读） |
| [FRONTEND.md](./FRONTEND.md) | 对接总览、工程与安全、索引 |
| **FRONTEND_DEV_PLAN.md**（本文） | 前端 Monorepo 开发计划与包结构 |
| [DEVELOPMENT.md](./DEVELOPMENT.md) | 后端工程与 API 约定 |
| [USER_ROLES_DESIGN.md](./USER_ROLES_DESIGN.md) | 角色与 JWT 策略 |

---

*本文随技术选型与里程碑调整而更新；契约变更以 OpenAPI 与 FRONTEND_API.md 为准。*
