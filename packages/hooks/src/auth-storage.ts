/** 与 AI 会话等区分命名空间，避免键冲突 */
export const AUTH_ACCESS_TOKEN_KEY = 'crs.auth.access_token';

export function readStoredAccessToken(): string | null {
  try {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(AUTH_ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function writeStoredAccessToken(token: string | null): void {
  try {
    if (typeof window === 'undefined') return;
    if (token) sessionStorage.setItem(AUTH_ACCESS_TOKEN_KEY, token);
    else sessionStorage.removeItem(AUTH_ACCESS_TOKEN_KEY);
  } catch {
    // 无痕模式 / 配额等
  }
}
