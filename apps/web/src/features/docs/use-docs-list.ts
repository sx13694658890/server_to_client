import { getApiErrorMessage, type DocListItem } from '@repo/api';
import { useCallback, useEffect, useState } from 'react';
import { useWebApi } from '../../hooks/use-web-api';
import { DOCS_LIST_REFRESH_EVENT } from './docs-refresh-events';

export type UseDocsListParams = {
  category?: string;
  keyword: string;
  page: number;
  pageSize: number;
};

export function useDocsList({ category, keyword, page, pageSize }: UseDocsListParams) {
  const api = useWebApi();
  const offset = (page - 1) * pageSize;

  const [list, setList] = useState<DocListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (mode: 'full' | 'soft' = 'full') => {
      if (mode === 'full') setLoading(true);
      else setRefreshing(true);
      setError(null);
      try {
        const { data } = await api.docs.list({
          limit: pageSize,
          offset,
          ...(keyword.trim() ? { keyword: keyword.trim() } : {}),
          ...(category ? { category } : {}),
        });
        setList(Array.isArray(data.items) ? data.items : []);
        setTotal(typeof data.total === 'number' ? data.total : 0);
      } catch (e) {
        setError(getApiErrorMessage(e));
        setList([]);
        setTotal(0);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [api, category, keyword, offset, pageSize]
  );

  useEffect(() => {
    void load('full');
  }, [load]);

  useEffect(() => {
    const onRefresh = () => void load('soft');
    window.addEventListener(DOCS_LIST_REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(DOCS_LIST_REFRESH_EVENT, onRefresh);
  }, [load]);

  return {
    list,
    total,
    loading,
    error,
    refreshing,
    reload: () => void load('full'),
    softReload: () => void load('soft'),
  };
}
