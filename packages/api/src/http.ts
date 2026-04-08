import axios, { type AxiosInstance } from 'axios';
import { joinApiPath } from '@repo/utils';

export type CreateHttpBundleOptions = {
  getEnv: () => { VITE_API_BASE_URL?: string };
  apiPrefix: string;
  getToken: () => string | null;
  onUnauthorized?: () => void;
};

export type HttpBundle = {
  client: AxiosInstance;
  /**
   * 与 axios 同源 baseURL、鉴权策略；用于 SSE 等 axios 不便处理的场景。
   * `path` 为相对 v1 前缀的路径，如 `ai/chat/stream`。
   */
  fetchWithAuth: (
    path: string,
    init?: RequestInit & { skipAuth?: boolean }
  ) => Promise<Response>;
};

function normalizePrefix(prefix: string): string {
  if (!prefix) return '';
  return prefix.startsWith('/') ? prefix : `/${prefix}`;
}

export function createHttpBundle(options: CreateHttpBundleOptions): HttpBundle {
  const base = (options.getEnv().VITE_API_BASE_URL ?? '').replace(/\/$/, '');
  const prefix = normalizePrefix(options.apiPrefix);
  const baseURL = joinApiPath(base, prefix);

  const client = axios.create({
    baseURL: baseURL || undefined,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
    timeout: 120_000,
  });

  client.interceptors.request.use((config) => {
    // FormData 必须由浏览器自动带 multipart boundary；勿沿用默认 application/json
    if (config.data instanceof FormData) {
      config.headers.delete('Content-Type');
    }
    if (!config.skipAuth) {
      const token = options.getToken();
      if (token) {
        config.headers.set('Authorization', `Bearer ${token}`);
      }
    }
    return config;
  });

  client.interceptors.response.use(
    (res) => res,
    (err) => {
      if (axios.isAxiosError(err)) {
        const s = err.response?.status;
        const cfg = err.config;
        // 仅 401 表示未认证；403 多为权限不足（如非 admin 上传），不应清会话
        if (s === 401 && cfg && !cfg.skipUnauthorizedRedirect) {
          options.onUnauthorized?.();
        }
      }
      return Promise.reject(err);
    }
  );

  const fetchWithAuth: HttpBundle['fetchWithAuth'] = (path, init = {}) => {
    const p = path.startsWith('/') ? path.slice(1) : path;
    const url = joinApiPath(client.defaults.baseURL ?? '', `/${p}`);
    const headers = new Headers(init.headers);
    if (
      !headers.has('Content-Type') &&
      init.body != null &&
      !(init.body instanceof FormData)
    ) {
      headers.set('Content-Type', 'application/json; charset=utf-8');
    }
    if (!init.skipAuth) {
      const token = options.getToken();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    }
    return fetch(url, { ...init, headers });
  };

  return { client, fetchWithAuth };
}
