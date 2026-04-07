import {
  createAiApi,
  createAuthApi,
  createDocsApi,
  createHttpBundle,
  createMessagesApi,
  createSystemApi,
  createUsersApi,
} from '@repo/api';
import { useAuth } from '@repo/hooks';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_V1_PREFIX } from '../constants';

/**
 * 带鉴权与 401 跳转的 HTTP 封装（axios + 按模块 apis）。
 */
export function useWebApi() {
  const navigate = useNavigate();
  const { accessToken, clearAuth } = useAuth();

  return useMemo(() => {
    const bundle = createHttpBundle({
      getEnv: () => ({
        VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
      }),
      apiPrefix: API_V1_PREFIX,
      getToken: () => accessToken,
      onUnauthorized: () => {
        clearAuth();
        navigate('/login', { replace: true });
      },
    });

    return {
      client: bundle.client,
      fetchWithAuth: bundle.fetchWithAuth,
      auth: createAuthApi(bundle.client),
      system: createSystemApi(bundle.client),
      ai: createAiApi(bundle.client),
      users: createUsersApi(bundle.client),
      messages: createMessagesApi(bundle.client),
      docs: createDocsApi(bundle.client),
    };
  }, [accessToken, clearAuth, navigate]);
}
