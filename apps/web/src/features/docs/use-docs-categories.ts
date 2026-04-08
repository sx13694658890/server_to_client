import { getApiErrorMessage } from '@repo/api';
import { useCallback, useEffect, useState } from 'react';
import { useWebApi } from '../../hooks/use-web-api';
import { DOCS_LIST_REFRESH_EVENT } from './docs-refresh-events';
import { mergeCategoriesFromDocItems } from './docs-menu-config';

/**
 * 分类聚合用分页拉列表，单页不宜过大：多数后端对 `limit` 有上限（常见 ≤100），传 500 易 422。
 */
const CATEGORY_FETCH_PAGE_SIZE = 100;
/** 防止异常大库拖死页面；超出部分分类可能暂不出现，需后端提供分类接口 */
const MAX_PAGES = 200;

function parseListTotal(data: { total?: unknown }): number | undefined {
  const t = data.total;
  if (typeof t === 'number' && Number.isFinite(t)) return t;
  if (typeof t === 'string' && /^\d+$/.test(t.trim())) return Number(t.trim());
  return undefined;
}

/**
 * 分页请求 `GET /docs`（不带 category），从每条 `items[].category` 聚合侧栏分类。
 */
export function useDocsCategories() {
  const api = useWebApi();
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const seen = new Set<string>();
    try {
      let offset = 0;
      for (let p = 0; p < MAX_PAGES; p++) {
        const { data } = await api.docs.list({
          limit: CATEGORY_FETCH_PAGE_SIZE,
          offset,
        });
        const items = Array.isArray(data.items) ? data.items : [];
        mergeCategoriesFromDocItems(seen, items);

        if (items.length === 0) break;

        offset += items.length;
        const total = parseListTotal(data);
        /** 末页；或未返回合法 total 时仅靠「满页则继续」翻页，避免 total 缺失被当成 0 只拉一页 */
        if (items.length < CATEGORY_FETCH_PAGE_SIZE) break;
        if (total !== undefined && offset >= total) break;
      }
      setCategories([...seen].sort((a, b) => a.localeCompare(b, 'zh-CN')));
    } catch (e) {
      setError(getApiErrorMessage(e));
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onRefresh = () => void load();
    window.addEventListener(DOCS_LIST_REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(DOCS_LIST_REFRESH_EVENT, onRefresh);
  }, [load]);

  return { categories, loading, error, reload: load };
}
