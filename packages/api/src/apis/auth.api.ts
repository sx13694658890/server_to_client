import type { AxiosInstance } from 'axios';

export type LoginBody = {
  username: string;
  password: string;
};

export type LoginResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

export type RegisterResponse = {
  user_id: string;
  email: string;
};

export type ChangePasswordBody = {
  current_password: string;
  new_password: string;
};

export type ChangePasswordResponse = {
  message: string;
};

export function createAuthApi(client: AxiosInstance) {
  return {
    login(body: LoginBody) {
      return client.post<LoginResponse>('/auth/login', body, { skipAuth: true });
    },
    register(body: LoginBody) {
      return client.post<RegisterResponse>('/auth/register', body, { skipAuth: true });
    },
    /** 需 Bearer，见 FRONTEND_API.md §2.1 */
    changePassword(body: ChangePasswordBody) {
      return client.post<ChangePasswordResponse>('/auth/change-password', body, {
        skipUnauthorizedRedirect: true,
      });
    },
  };
}
