/** 仅用于展示；不校验签名，与 docs/FRONTEND_API.md §3 一致。 */
export type JwtPayloadDisplay = {
  sub?: string;
  email?: string;
  /** 常见：字符串数组，如 `user` / `admin` */
  roles?: string[];
  /** 少数签发方使用单数 `role` */
  role?: string;
  exp?: number;
  iat?: number;
};

/** 从 JWT payload 推断是否管理员（仅前端展示；以后端鉴权为准）。 */
export function isAdminFromJwtPayload(p: JwtPayloadDisplay | null): boolean {
  if (!p) return false;
  if (Array.isArray(p.roles) && p.roles.includes('admin')) return true;
  if (p.role === 'admin') return true;
  return false;
}

export function decodeJwtPayloadDisplay(token: string): JwtPayloadDisplay | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), '=');
    const json = decodeURIComponent(
      [...atob(padded)].map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`).join('')
    );
    return JSON.parse(json) as JwtPayloadDisplay;
  } catch {
    return null;
  }
}
