import 'axios';

declare module 'axios' {
  export interface AxiosRequestConfig {
    /** 为 true 时不附加 Authorization（如登录、注册、匿名 ping） */
    skipAuth?: boolean;
    /**
     * 为 true 时 401/403 不触发全局 `onUnauthorized`（如改密接口用 401 表示「当前密码错误」）。
     */
    skipUnauthorizedRedirect?: boolean;
  }
  export interface InternalAxiosRequestConfig {
    skipAuth?: boolean;
    skipUnauthorizedRedirect?: boolean;
  }
}

export {};
