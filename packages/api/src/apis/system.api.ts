import type { AxiosInstance } from 'axios';

export function createSystemApi(client: AxiosInstance) {
  return {
    /** 连通性检查，默认不带 Token */
    ping() {
      return client.get<string>('/ping', {
        skipAuth: true,
        responseType: 'text',
        transformResponse: [(data) => data],
      });
    },
  };
}
