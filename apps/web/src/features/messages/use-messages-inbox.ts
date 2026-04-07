import { getApiErrorMessage, readMessagesStream, type MessageItem } from '@repo/api';
import { App } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useWebApi } from '../../hooks/use-web-api';

const PAGE_SIZE = 20;
const POLL_MS = 45_000;
const UNREAD_DEDUPE_MS = 2000;

let unreadCountCache: number | null = null;
let unreadCountLastAt = 0;
let unreadCountInFlight: Promise<number> | null = null;

export type MessageInboxTab = 'unread' | 'read';

export type UseMessagesInboxOptions = {
  /** 为 true 时拉取/分页列表（Popover 打开或通知中心页） */
  listEnabled: boolean;
};

export function useMessagesInbox(options: UseMessagesInboxOptions) {
  const { listEnabled } = options;
  const { message } = App.useApp();
  const api = useWebApi();

  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState<MessageInboxTab>('unread');
  const [items, setItems] = useState<MessageItem[]>([]);
  const [total, setTotal] = useState(0);
  const [listLoading, setListLoading] = useState(false);

  const itemsRef = useRef<MessageItem[]>([]);
  itemsRef.current = items;

  const apiRef = useRef(api);
  apiRef.current = api;

  const activeTabRef = useRef<MessageInboxTab>(activeTab);
  activeTabRef.current = activeTab;

  const unreadPollingRef = useRef(false);

  const displayItems = useMemo(() => {
    if (activeTab === 'unread') return items;
    return items.filter((i) => i.is_read);
  }, [activeTab, items]);

  const mergeItem = useCallback((item: MessageItem) => {
    setItems((prev) => {
      const tab = activeTabRef.current;
      if (tab === 'unread') {
        if (item.is_read) {
          return prev.filter((x) => x.id !== item.id);
        }
        const i = prev.findIndex((x) => x.id === item.id);
        if (i === -1) return [item, ...prev].slice(0, 100);
        const next = [...prev];
        next[i] = { ...next[i], ...item };
        return next;
      }
      const i = prev.findIndex((x) => x.id === item.id);
      if (i === -1) {
        if (!item.is_read) return prev;
        return [item, ...prev].slice(0, 100);
      }
      const next = [...prev];
      next[i] = { ...next[i], ...item };
      return next;
    });
  }, []);

  const refreshUnread = useCallback(async () => {
    try {
      const now = Date.now();
      if (unreadCountCache != null && now - unreadCountLastAt < UNREAD_DEDUPE_MS) {
        setUnreadCount(unreadCountCache);
        return;
      }

      if (!unreadCountInFlight) {
        unreadCountInFlight = apiRef.current.messages
          .unreadCount()
          .then(({ data }) => {
            unreadCountCache = data.unread_count;
            unreadCountLastAt = Date.now();
            return data.unread_count;
          })
          .finally(() => {
            unreadCountInFlight = null;
          });
      }

      const count = await unreadCountInFlight;
      setUnreadCount(count);
    } catch {
      /* ignore */
    }
  }, []);

  const loadList = useCallback(
    async (reset: boolean) => {
      setListLoading(true);
      try {
        const tab = activeTabRef.current;
        const offset = reset ? 0 : itemsRef.current.length;
        const { data } = await apiRef.current.messages.list({
          limit: PAGE_SIZE,
          offset,
          only_unread: tab === 'unread',
        });
        setTotal(data.total);
        setUnreadCount(data.unread_count);
        setItems((prev) => (reset ? data.items : [...prev, ...data.items]));
      } catch (e) {
        message.error(getApiErrorMessage(e));
      } finally {
        setListLoading(false);
      }
    },
    [message]
  );

  useEffect(() => {
    void refreshUnread();
  }, [refreshUnread]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (unreadPollingRef.current) return;
      unreadPollingRef.current = true;
      void refreshUnread().finally(() => {
        unreadPollingRef.current = false;
      });
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [refreshUnread]);

  useEffect(() => {
    if (!listEnabled) return;
    void loadList(true);
  }, [listEnabled, activeTab, loadList]);

  useEffect(() => {
    const stop = { current: false };
    let abort: AbortController | null = null;
    let bootTimer: number | null = null;

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    const run = async () => {
      let attempt = 0;
      while (!stop.current) {
        abort = new AbortController();
        const bundle = {
          client: apiRef.current.client,
          fetchWithAuth: apiRef.current.fetchWithAuth,
        };
        try {
          await readMessagesStream(bundle, abort.signal, {
            onNotification: (item) => {
              mergeItem(item);
              void refreshUnread();
            },
            onUnreadCount: (n) => setUnreadCount(n),
          });
          attempt = 0;
        } catch {
          if (stop.current || abort.signal.aborted) break;
          attempt += 1;
        }

        if (stop.current) break;

        const delay = Math.min(30_000, 1000 * 2 ** Math.min(attempt, 5));
        await sleep(delay);
      }
    };

    bootTimer = window.setTimeout(() => {
      if (!stop.current) void run();
    }, 0);

    return () => {
      stop.current = true;
      if (bootTimer != null) window.clearTimeout(bootTimer);
      abort?.abort();
    };
  }, [mergeItem, refreshUnread]);

  const setTab = useCallback((tab: MessageInboxTab) => {
    setActiveTab(tab);
    setItems([]);
    setTotal(0);
  }, []);

  const onReadAll = useCallback(async () => {
    try {
      const { data } = await api.messages.readAll();
      setItems((prev) =>
        prev.map((x) => ({
          ...x,
          is_read: true,
          read_at: x.read_at ?? new Date().toISOString(),
        }))
      );
      setUnreadCount(0);
      message.success(data.updated > 0 ? `已标记 ${data.updated} 条已读` : '暂无未读');
      if (listEnabled) void loadList(true);
    } catch (e) {
      message.error(getApiErrorMessage(e));
    }
  }, [api.messages, listEnabled, loadList, message]);

  const onMarkRead = useCallback(
    async (item: MessageItem) => {
      if (item.is_read) return;
      try {
        await api.messages.markRead(item.id);
        setItems((prev) =>
          prev.map((x) =>
            x.id === item.id
              ? { ...x, is_read: true, read_at: new Date().toISOString() }
              : x
          )
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch (e) {
        message.error(getApiErrorMessage(e));
      }
    },
    [api.messages, message]
  );

  const onDelete = useCallback(
    async (id: string) => {
      try {
        await api.messages.remove(id);
        setItems((prev) => prev.filter((x) => x.id !== id));
        setTotal((t) => Math.max(0, t - 1));
        void refreshUnread();
        message.success('已删除');
      } catch (e) {
        message.error(getApiErrorMessage(e));
      }
    },
    [api.messages, message, refreshUnread]
  );

  const canLoadMore = items.length < total && !listLoading;

  return {
    unreadCount,
    activeTab,
    setTab,
    items,
    displayItems,
    total,
    listLoading,
    loadList,
    refreshUnread,
    onReadAll,
    onMarkRead,
    onDelete,
    canLoadMore,
  };
}
