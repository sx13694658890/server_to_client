# 前端 API 速查

**以 `GET /openapi.json` 为准**；本文只列常用路径与易踩坑。**基址、代理、安全**见 [FRONTEND.md](./FRONTEND.md)。

---

## 1. 基址与格式

- 常规：`Content-Type: application/json`，UTF-8，UUID 在 JSON 中为字符串。
- 需登录：`Authorization: Bearer <access_token>`；`401/403` 清会话或跳转登录（无 refresh）。

---

## 2. 路由一览（相对 `{API_V1_PREFIX}`，默认 `/api/v1`）

| 鉴权 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 否 | POST | `/auth/register` | 注册，`username` 为邮箱 |
| 否 | POST | `/auth/login` | 登录，返回 `access_token`、`expires_in` |
| Bearer | POST | `/auth/change-password` | 修改密码，见 [§2.1](#21-修改密码-post-authchange-password) |
| 否 | GET | `/ping` | 连通性 |
| 否 | GET | `/db-check` | 数据库探测 |
| 否 | GET | `/ai/quick-questions` | 快捷问题 |
| 否 | POST | `/ai/chat` | AI 问答 JSON |
| 否 | POST | `/ai/chat/stream` | AI 问答 **SSE** |
| Bearer | GET | `/users` | 用户列表；`limit`、`offset` |
| Bearer | DELETE | `/users/{user_id}` | 删除用户，**admin**；不可删自己 |
| Bearer | GET | `/docs` | 文档列表；`limit`、`offset`、`keyword`、`category`（可选）；项含 `content_source`、`can_delete`、`created_at` 等 |
| Bearer | GET | `/docs/{id}` | 文档详情 JSON（`body`、`content_url`、`can_delete` 等） |
| Bearer | GET | `/docs/{id}/content` | 纯 Markdown 正文，`text/plain`；可与 `content_url` 二选一拉取 |
| Bearer | POST | `/docs/upload` | **admin**，`multipart/form-data`：`file`（`.md`/`.docx`）、`title`、`description`/`summary`、`category`、`tags` |
| Bearer | DELETE | `/docs/{id}` | **admin**，删除文档；成功 **204**；上传类同时删落盘文件 |
| Bearer | GET | *或见详情 `content_url`* | 亦可用相对路径拉正文，`responseType: text` |
| Bearer | GET | `/messages` | 通知列表；`limit`、`offset`、`only_unread` |
| Bearer | GET | `/messages/unread-count` | 未读条数 |
| Bearer | GET | `/messages/stream` | 通知 **SSE**，见 [§6](#6-站内通知-ssemessagesstream) |
| Bearer | POST | `/messages/read-all` | 全部已读 |
| Bearer | POST | `/messages/{message_id}/read` | 单条已读 |
| Bearer | DELETE | `/messages/{message_id}` | 软删除，**204** |

业务细节以 OpenAPI 与实现为准。

### 2.1 修改密码 `POST /auth/change-password`

- **Body**：`current_password`、`new_password`（**≥6** 位，最长 256）。
- **200**：`{"message": "密码已更新"}`。
- **常见**：`401`（未登录或当前密码错）；`400`（新旧相同）；`404`（用户已删）；`422`（新密码过短）。
- 改密后**已签发 JWT 仍有效至过期**；若要全局失效需后端黑名单/版本号（当前未实现）。

---

## 3. JWT（仅展示 / 路由守卫）

解码 payload 即可，**勿在前端验签**。常用：`sub`、`email`、`roles`（如 `user` / `admin`）、`exp`、`iat`。  
改角色后旧 Token 内 `roles` 可能滞后，**敏感权限以后端为准**。详见 [USER_ROLES_DESIGN.md](./USER_ROLES_DESIGN.md)。

---

## 4. 错误体（FastAPI）

多为 `{"detail": ...}`：`detail` 可为字符串或 **422 数组**；前端统一解析后展示。解析工具见 `packages/utils`。

---

## 5. AI 流式（`POST /ai/chat/stream`，SSE）

- **`EventSource` 不支持 POST**，请用 **`fetch` + ReadableStream**。
- `text/event-stream`，按 `\n\n` 分块，行以 `data: ` 后为 **JSON**。
- 事件：`meta` → 若干 `delta`（`text`）→ `done`；失败可为 `error`（`detail`）。  
非流式 `/ai/chat` 字段见 OpenAPI。

---

## 6. 站内通知 SSE（`GET /messages/stream`）

- 需 **Bearer**；可用原生 `EventSource`（GET）。
- `data:` 后为 JSON：`type` 如 `notification`（含 `item`）、`unread_count`、`heartbeat`。
- 多实例下仅推送到**当前进程**连接；跨进程需消息队列（当前未做）。

---

*接口变更以 OpenAPI 为主；本文仅在「前端易踩坑」变化时酌情更新。*
