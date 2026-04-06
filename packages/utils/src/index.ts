/**
 * FastAPI / Pydantic 风格错误体中的 `detail` 字段（见 docs/FRONTEND_API.md §6）。
 */
export type FastApiDetailItem = {
  type?: string;
  loc?: (string | number)[];
  msg?: string;
  input?: unknown;
};

export type FastApiDetail = string | FastApiDetailItem[];

export type FastApiErrorBody = {
  detail?: FastApiDetail;
};

/**
 * 将 `detail` 转为适合直接展示的单条文案：字符串原样；数组取首条 `msg` 或拼接。
 */
export function formatFastApiDetail(detail: FastApiDetail | undefined): string {
  if (detail == null) return '';
  if (typeof detail === 'string') return detail;
  if (detail.length === 0) return '';
  const first = detail[0];
  const msg = first?.msg?.trim();
  if (msg) return msg;
  return detail.map((d) => d.msg ?? '').filter(Boolean).join('；') || '请求失败';
}

/**
 * 开发环境代理下可为空字符串，由相对路径 `/api/v1` 走同源；否则为完整 origin。
 */
export function getApiBaseUrl(env: { VITE_API_BASE_URL?: string }): string {
  const v = env.VITE_API_BASE_URL;
  return v == null || v === '' ? '' : v.replace(/\/$/, '');
}

export function joinApiPath(baseUrl: string, path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  if (!baseUrl) return p;
  return `${baseUrl}${p}`;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuidString(value: string): boolean {
  return UUID_RE.test(value);
}
