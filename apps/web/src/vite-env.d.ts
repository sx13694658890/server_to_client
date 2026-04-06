/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  /** 开发代理目标，默认 http://127.0.0.1:8000 */
  readonly VITE_PROXY_TARGET: string;
  /** 设为 `true` 时使用 POST /api/v1/ai/chat/stream（SSE） */
  readonly VITE_AI_CHAT_USE_STREAM: string;
  /** 浮标位置：`left`（默认）或 `right` */
  readonly VITE_AI_CHAT_FAB_POSITION: string;
  /** SSE 流式「打字机」刷新间隔（毫秒），越大越慢、越明显 */
  readonly VITE_AI_CHAT_STREAM_TICK_MS: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
