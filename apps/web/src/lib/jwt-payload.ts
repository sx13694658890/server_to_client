/** 仅用于展示；不校验签名，与 docs/FRONTEND_API.md §3 一致。 */
export type JwtPayloadDisplay = {
  sub?: string;
  email?: string;
  roles?: string[];
  exp?: number;
  iat?: number;
};

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
