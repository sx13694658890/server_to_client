# 前端对接与工程说明

面向本仓库 **React + FastAPI** 集成：环境、代理、安全、Monorepo 结构与迭代阶段。**HTTP 路径、请求体、SSE 细节**见专篇 [FRONTEND_API.md](./FRONTEND_API.md)；若与 `GET /openapi.json` 冲突，**以 OpenAPI 为准**。

---

## 1. 基址与环境

| 项 | 说明 |
|----|------|
| 开发示例 | `http://127.0.0.1:8000` |
| v1 前缀 | `API_V1_PREFIX`，默认 **`/api/v1`**（前端常量见 `apps/web/src/constants.ts`） |
| 完整 v1 根 | `{VITE_API_BASE_URL}{API_V1_PREFIX}` |
| 探活 | `GET /health`（无前缀） |
| 契约 | `GET /openapi.json`；`GET /docs`、`/redoc` |

```bash
# Vite 示例
VITE_API_BASE_URL=http://127.0.0.1:8000
# 直连时请求：${VITE_API_BASE_URL}${API_V1_PREFIX}/...
```

---

## 2. 跨域与本地开发

- 后端未默认全开 CORS 时，浏览器从 `localhost:5173` 直连后端易拦截。
- **推荐**：Vite `server.proxy` 将 **`/api`** 指到后端，前端用相对路径 **`/api/v1/...`**。
- **生产**：同源反代，或后端 CORS 白名单（以后端文档为准）。

---

## 3. OpenAPI 与类型

1. 启动后端，拉取 `openapi.json`。
2. 使用 **openapi-typescript**、**Orval**、**hey-api/openapi-ts** 等生成类型或客户端。
3. 本仓库当前为手写 `packages/api` 模块，生成物可对齐后逐步替换；CI 可固定 artifact 版本。

---

## 4. 安全与体验

- 生产 **HTTPS**；`access_token` 优先内存或 **httpOnly Cookie**（若后端支持）；评估 **localStorage** 的 XSS 风险。
- Token **勿放 URL 查询参数**。
- 登录失败状态码若需防枚举，须产品另行约定。

---

## 5. 工程结构（Monorepo）

**栈**：React 18、TypeScript、Vite、**pnpm workspace**、Tailwind + **Ant Design**、HTTP 用 axios 集中实例（`packages/api` + `useWebApi`）。

```
.
├── pnpm-workspace.yaml
├── apps/web/                 # Vite + React，路由、页面、全局 Provider
└── packages/
    ├── api/                  # 按域拆分的 API 封装（当前替代 OpenAPI 生成客户端）
    ├── hooks/                # Auth 等
    ├── utils/                # FastAPI detail 解析等（无 React 依赖）
    └── ui/                   # 可复用 UI（按需）
```

**依赖方向**：`apps/*` → `packages/*`，避免环依赖。  
**现状说明**：下文「阶段规划」中 `api-client` 包名与当前 **`packages/api`** 不一致时，以仓库为准。

---

## 6. `apps/web` 落地要点

- 环境变量与 [§1](#1-基址与环境) 一致；**代理** `/api` → 后端。
- 全局：`ConfigProvider`（antd）、`AuthProvider`；401 清会话并跳转登录（无 refresh）。
- 登录后工作台与导航：[POST_LOGIN_NAV.md](./POST_LOGIN_NAV.md)。

---

## 7. 阶段规划（自检用）

| 阶段 | 内容 |
|------|------|
| A 脚手架 | pnpm workspace、Vite、TS、Tailwind、antd、代理、根脚本 `dev/build/lint` |
| B 共享层 | `utils`（detail 解析）、`hooks`（`useAuth`）、`api` 或生成客户端 |
| C 认证闭环 | 注册/登录、Bearer、401 行为、至少一条受保护接口 |
| D 迭代 | 页面与路由、组件下沉、测试与 OpenAPI 同步 |

**风险备忘**：antd + Tailwind 的 Preflight/层叠需在一页试点后固化；Token 存哪类存储依赖安全评审。

---

## 8. 文档索引

| 文档 | 用途 |
|------|------|
| [FRONTEND_API.md](./FRONTEND_API.md) | **HTTP API 速查**（路由、JWT、错误、SSE） |
| [POST_LOGIN_NAV.md](./POST_LOGIN_NAV.md) | 登录后布局与导航 |
| [message通知/前端实现方案.md](./message通知/前端实现方案.md) | 站内消息交互补充 |
| [文档需求/FRONTEND_IMPL.md](./文档需求/FRONTEND_IMPL.md) | 文档中心前端实现要点 |
| [agri-remote-sensing/](./agri-remote-sensing/) | 农业遥感需求与开发计划（独立专题） |
| [DEVELOPMENT.md](./DEVELOPMENT.md) | 后端工程与迁移 |
| [USER_ROLES_DESIGN.md](./USER_ROLES_DESIGN.md) | 角色与 JWT |
| [ai问答需求/](./ai问答需求/) | 首页 AI 问答需求与计划 |

**历史**：原「前端工程开发计划」长文已并入本文 **§5～§7**；若书签指向 [FRONTEND_DEV_PLAN.md](./FRONTEND_DEV_PLAN.md)，该文件仅作跳转。

---

*接口演进请同步 OpenAPI 与 **FRONTEND_API.md**；重大变更建议 `CHANGELOG` 并通知协作方。*
