# 登录后界面：左侧导航说明与规划

本文档说明 Web 应用在**登录成功并进入工作台**后的整体布局、左侧菜单含义，以及后续可扩展方向。实现代码位于 `apps/web/src/layouts/dashboard-layout.tsx` 及相关页面。

---

## 1. 布局结构

| 区域 | 说明 |
|------|------|
| **顶栏** | 左侧为侧栏折叠按钮；右侧为 **通知铃铛**（未读角标、`GET /messages` 抽屉列表、轮询未读数 + `GET /messages/stream` SSE，见 [message通知/前端实现方案.md](./message通知/前端实现方案.md)）与用户区（头像、邮箱、退出）。 |
| **左侧导航（Sider）** | 扁平菜单项：首页、使用文档、个人中心、用户管理；折叠后仅图标。 |
| **主内容区** | 浅灰背景上的白色卡片/表格，具体由子路由页面渲染（`Outlet`）。 |

未登录用户访问 `/dashboard/*` 会被重定向到 `/login`（见 `apps/web/src/auth/require-auth.tsx`）。

---

## 2. 左侧导航项（当前）

| 菜单 | 路由 | 说明 |
|------|------|------|
| **首页** | `/dashboard/home` | 工作台首页：环境变量与 **Ping** 连通性调试；右下角保留 **AI 聊天** 浮层（与访客首页能力一致，需登录态时带 Token 调后端）。 |
| **文档 → 使用文档** | `/dashboard/docs` | 仓库内 `docs/` 文档索引（路径提示，便于在 IDE 中打开）；HTTP 契约见 [FRONTEND_API.md](./FRONTEND_API.md)。 |
| **用户 → 个人中心** | `/dashboard/account` | 修改登录密码：`POST /auth/change-password`（Bearer），见 [FRONTEND_API.md](./FRONTEND_API.md) §2.1。 |
| **用户 → 用户管理** | `/dashboard/users` | `GET /users` 分页列表与 `current_user`；**`admin`** 可对非本人执行 **`DELETE /users/{user_id}`**（`users.remove`）。见 [FRONTEND_API.md](./FRONTEND_API.md) §2 路由一览。 |

访客首页仍为 `/`（未登录可看环境与 Ping、匿名 AI 等）；**已登录用户访问 `/` 会重定向到 `/dashboard/home`**。

---

## 3. 与后端的对应关系

- **鉴权**：请求头 `Authorization: Bearer <access_token>`，由 `@repo/api` 的 `createHttpBundle` 统一附加；`401/403` 时清会话并跳转登录。
- **用户列表**：`GET /api/v1/users?limit=&offset=`，响应中的 `current_user` 用于顶栏旁信息与管理页提示；`users` + `total` 用于表格与分页。
- **删除用户**：`DELETE /api/v1/users/{user_id}`，仅 **`admin`**；不可删当前登录账号（`400`）。前端仅在 `current_user.roles` 含 `admin` 时展示删除操作，当前行展示「当前账号」。
- **角色展示**：`roles` 为字符串数组（如 `user`、`admin`）；**注意**：JWT 内 `roles` 在改角色后可能滞后至 Token 过期，见 [FRONTEND_API.md](./FRONTEND_API.md) §3。

---

## 4. 后续规划（建议）

以下项可按产品优先级迭代，**不改变**当前路由前缀 `/dashboard` 的约定，仅在侧栏增删菜单与对应子路由即可。

| 方向 | 说明 |
|------|------|
| **权限菜单** | 根据 `current_user.roles` 或 JWT 解码结果隐藏/禁用「用户管理」等仅管理员可见的入口。 |
| **个人中心扩展** | 在 `/dashboard/account` 上增加只读账户信息卡片（邮箱、user_id、角色）；与 JWT / `GET /users` 的 `current_user` 对齐展示。 |
| **使用文档内嵌** | 若需站内阅读 Markdown，可引入 MD 渲染或链接到部署的文档站点，替代当前「路径索引」形态。 |
| **主题与国际化** | 顶栏可增加暗色切换、语言切换；与 antd `ConfigProvider` 联动。 |
| **面包屑与页签** | 复杂后台可补充 `Breadcrumb`、多页签缓存等。 |

---

## 5. 相关文件索引

| 路径 | 用途 |
|------|------|
| `apps/web/src/app.tsx` | 路由：`/`、`/login`、`/register`、受保护的 `/dashboard/*`。 |
| `apps/web/src/layouts/dashboard-layout.tsx` | 顶栏 + 侧栏 + `Outlet`。 |
| `apps/web/src/features/messages/dashboard-message-bell.tsx` | 顶栏通知：角标、抽屉、SSE + 轮询。 |
| `packages/api/src/apis/messages.api.ts` | 站内通知 REST。 |
| `packages/api/src/apis/messages-stream.api.ts` | `GET /messages/stream` SSE 解析。 |
| `apps/web/src/pages/account-page.tsx` | 个人中心：修改密码表单。 |
| `apps/web/src/pages/users-management-page.tsx` | 用户列表、分页与 **admin 删除**（二次确认）。 |
| `packages/api/src/apis/users.api.ts` | `GET /users`、`DELETE /users/{id}`（`users.remove`）类型与封装。 |
| [FRONTEND_API.md](./FRONTEND_API.md) | HTTP 接口、JWT、错误格式。 |
| [FRONTEND.md](./FRONTEND.md) | 对接总览、工程与安全、索引。 |

---

*侧栏结构或路由变更时，请同步更新本文与 `docs/` 下相关索引。*
