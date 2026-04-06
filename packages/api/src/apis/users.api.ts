import type { AxiosInstance } from 'axios';

export type UserListItem = {
  user_id: string;
  email: string;
  created_at: string;
  roles: string[];
};

export type CurrentUserSummary = {
  user_id: string;
  email: string;
  roles: string[];
};

export type UsersListResponse = {
  current_user: CurrentUserSummary;
  users: UserListItem[];
  total: number;
};

export type UsersListParams = {
  limit?: number;
  offset?: number;
};

export function createUsersApi(client: AxiosInstance) {
  return {
    list(params?: UsersListParams) {
      return client.get<UsersListResponse>('/users', { params });
    },
    remove(userId: string) {
      return client.delete<void>(`/users/${userId}`);
    },
  };
}
