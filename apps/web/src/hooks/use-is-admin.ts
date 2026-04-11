import { useAuth } from '@repo/hooks';
import { useEffect, useMemo, useState } from 'react';
import { decodeJwtPayloadDisplay, isAdminFromJwtPayload } from '../lib/jwt-payload';
import { useWebApi } from './use-web-api';

/**
 * 是否管理员（用于展示上传文档、详情页删除等）。
 * 优先以 `GET /users` 响应中的 `current_user.roles` 为准（与「用户管理」页一致）；
 * 请求未完成或失败时回退到 JWT 中的 `roles` / `role`。
 */
export function useIsAdmin() {
  const { accessToken } = useAuth();
  const api = useWebApi();

  const jwtAdmin = useMemo(() => {
    if (!accessToken) return false;
    return isAdminFromJwtPayload(decodeJwtPayloadDisplay(accessToken));
  }, [accessToken]);

  const [serverAdmin, setServerAdmin] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    if (!accessToken) {
      setServerAdmin(undefined);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const { data } = await api.users.list({ limit: 1, offset: 0 });
        if (cancelled) return;
        setServerAdmin(data.current_user.roles.includes('admin'));
      } catch {
        if (!cancelled) setServerAdmin(undefined);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accessToken, api]);

  return serverAdmin !== undefined ? serverAdmin : jwtAdmin;
}
