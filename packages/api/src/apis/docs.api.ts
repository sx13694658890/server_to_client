import type { AxiosInstance } from 'axios';

export type DocContentSource = 'repo' | 'upload' | 'inline';

export type DocListItem = {
  id: string;
  title: string;
  summary: string;
  category?: string;
  score?: number;
  tags?: string[];
  /** 缺省或 false 时前端按无权限处理 */
  can_view?: boolean;
  /** 创建/上传时间 */
  created_at?: string;
  updated_at?: string;
  content_source?: DocContentSource;
  /** admin 时可展示删除 */
  can_delete?: boolean;
  /** 有权限时由后端给出，用于拉取 Markdown 正文 */
  content_url?: string;
  /** 相对服务端仓库 docs/ 的路径（展示用） */
  docs_relpath?: string;
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
  /** 详情 JSON 内摘要性正文（可选） */
  content?: string;
  body?: string;
};

export type DocUploadResult = {
  id: string;
  title: string;
  summary: string;
  category?: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * 将 `content_url` 转为当前 axios 实例可用的请求目标：
 * - 绝对 URL 原样返回；
 * - 以 `/api/v1` 开头的路径会去掉此前缀（因 client.baseURL 已含 v1）。
 */
export function resolveDocsContentRequestRef(contentUrl: string): string {
  const u = contentUrl.trim();
  if (/^https?:\/\//i.test(u)) return u;
  let p = u.startsWith('/') ? u : `/${u}`;
  const prefix = '/api/v1';
  if (p === prefix || p.startsWith(`${prefix}/`)) {
    p = p.slice(prefix.length);
    if (!p.startsWith('/')) p = `/${p}`;
  }
  return p;
}

export function createDocsApi(client: AxiosInstance) {
  return {
    list(params?: DocListParams) {
      return client.get<DocListResponse>('/docs', { params });
    },
    detail(docId: string) {
      return client.get<DocDetail>(`/docs/${encodeURIComponent(docId)}`);
    },
    /** 拉取 Markdown 原文（相对 content_url），需带 Bearer */
    content(contentUrl: string) {
      const ref = resolveDocsContentRequestRef(contentUrl);
      return client.get<string>(ref, { responseType: 'text' });
    },
    /** `GET /docs/{id}/content` 纯 Markdown */
    contentById(docId: string) {
      return client.get<string>(`/docs/${encodeURIComponent(docId)}/content`, {
        responseType: 'text',
      });
    },
    /** multipart/form-data，仅 admin */
    upload(formData: FormData) {
      return client.post<DocUploadResult>('/docs/upload', formData);
    },
    /** 仅 admin，成功 204 */
    remove(docId: string) {
      return client.delete<void>(`/docs/${encodeURIComponent(docId)}`);
    },
  };
}
