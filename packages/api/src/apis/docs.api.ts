import type { AxiosInstance } from 'axios';

export type DocListItem = {
  id: string;
  title: string;
  summary: string;
  category?: string;
  score?: number;
  tags?: string[];
  /** 缺省或 false 时前端按无权限处理 */
  can_view?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type DocListResponse = {
  items: DocListItem[];
  total: number;
};

export type DocListParams = {
  limit?: number;
  offset?: number;
  keyword?: string;
  /** 分类筛选（若后端支持） */
  category?: string;
};

export type DocDetail = DocListItem & {
  content?: string;
  body?: string;
};

export function createDocsApi(client: AxiosInstance) {
  return {
    list(params?: DocListParams) {
      return client.get<DocListResponse>('/docs', { params });
    },
    detail(docId: string) {
      return client.get<DocDetail>(`/docs/${encodeURIComponent(docId)}`);
    },
  };
}
