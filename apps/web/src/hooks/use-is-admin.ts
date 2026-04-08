import { useAuth } from '@repo/hooks';
import { useMemo } from 'react';
import { decodeJwtPayloadDisplay } from '../lib/jwt-payload';

export function useIsAdmin() {
  const { accessToken } = useAuth();

  return useMemo(() => {
    if (!accessToken) return false;
    const p = decodeJwtPayloadDisplay(accessToken);
    return Boolean(p?.roles?.includes('admin'));
  }, [accessToken]);
}
