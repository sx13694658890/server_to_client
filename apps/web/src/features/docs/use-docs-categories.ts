import { getApiErrorMessage } from '@repo/api';
import { useCallback, useEffect, useState } from 'react';
import { useWebApi } from '../../hooks/use-web-api';
import { DOCS_LIST_REFRESH_EVENT } from './docs-refresh-events';

const PAGE = 500;
/** 防止异常大库拖死页面；超出部分分类可能暂不出现，需后端提供分类接口 */
const MAX_PAGES = 40;

/**
 * 从文档列表聚合后端 `category`（去重、排序），与列表筛选共用同一数据源。
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
      let total = 0;
      for (let p = 0; p < MAX_PAGES; p++) {
        const { data } = await api.docs.list({ limit: PAGE, offset });
        total = typeof data.total === 'number' ? data.total : 0;
        const items = Array.isArray(data.items) ? data.items : [];
        for (const it of items) {
          const c = it.category?.trim();
          if (c) seen.add(c);
        }
        offset += items.length;
        if (items.length < PAGE || offset >= total || items.length === 0) break;
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
