import {
  BellOutlined,
  CheckOutlined,
  DeleteOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import {
  App,
  Badge,
  Button,
  Drawer,
  Empty,
  List,
  Popconfirm,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd';
import { getApiErrorMessage, readMessagesStream, type MessageItem } from '@repo/api';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWebApi } from '../../hooks/use-web-api';

const PAGE_SIZE = 20;
const POLL_MS = 45_000;

function categoryIcon(category: string) {
  if (category === 'security') return <SafetyOutlined className="text-amber-600" />;
  return null;
}

export function DashboardMessageBell() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const api = useWebApi();

  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<MessageItem[]>([]);
  const [total, setTotal] = useState(0);
  const [listLoading, setListLoading] = useState(false);

  const itemsRef = useRef<MessageItem[]>([]);
  itemsRef.current = items;

  const apiRef = useRef(api);
  apiRef.current = api;

  const mergeItem = useCallback((item: MessageItem) => {
    setItems((prev) => {
      const i = prev.findIndex((x) => x.id === item.id);
      if (i === -1) {
        return [item, ...prev].slice(0, 100);
      }
      const next = [...prev];
      next[i] = { ...next[i], ...item };
      return next;
    });
  }, []);

  const refreshUnread = useCallback(async () => {
    try {
      const { data } = await apiRef.current.messages.unreadCount();
      setUnreadCount(data.unread_count);
    } catch {
      /* 轮询失败不打扰；打开抽屉时会重新拉列表 */
    }
  }, []);

  const loadList = useCallback(
    async (reset: boolean) => {
      setListLoading(true);
      try {
        const offset = reset ? 0 : itemsRef.current.length;
        const { data } = await apiRef.current.messages.list({
          limit: PAGE_SIZE,
          offset,
          only_unread: false,
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
      void refreshUnread();
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [refreshUnread]);

  useEffect(() => {
    if (open) void loadList(true);
  }, [open, loadList]);

  useEffect(() => {
    const stop = { current: false };
    let abort: AbortController | null = null;

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    (async () => {
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
    })();

    return () => {
      stop.current = true;
      abort?.abort();
    };
  }, [mergeItem, refreshUnread]);

  const onReadAll = async () => {
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
    } catch (e) {
      message.error(getApiErrorMessage(e));
    }
  };

  const onMarkRead = async (item: MessageItem) => {
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
  };

  const onDelete = async (id: string) => {
    try {
      await api.messages.remove(id);
      setItems((prev) => prev.filter((x) => x.id !== id));
      setTotal((t) => Math.max(0, t - 1));
      void refreshUnread();
      message.success('已删除');
    } catch (e) {
      message.error(getApiErrorMessage(e));
    }
  };

  const onItemActivate = async (item: MessageItem) => {
    await onMarkRead(item);
    const payload = item.payload;
    if (
      payload &&
      typeof payload === 'object' &&
      !Array.isArray(payload) &&
      'kind' in payload &&
      payload.kind === 'password_changed'
    ) {
      navigate('/dashboard/account');
      setOpen(false);
    }
  };

  const canLoadMore = items.length < total && !listLoading;

  return (
    <>
      <Badge count={unreadCount > 0 ? unreadCount : 0} size="small" offset={[-2, 2]}>
        <button
          type="button"
          aria-label="通知"
          className="flex h-9 w-9 items-center justify-center rounded-md border-0 bg-transparent text-lg text-neutral-600 hover:bg-neutral-100"
          onClick={() => setOpen(true)}
        >
          <BellOutlined />
        </button>
      </Badge>

      <Drawer
        title="通知"
        placement="right"
        width={400}
        open={open}
        onClose={() => setOpen(false)}
        extra={
          <Button type="link" size="small" onClick={() => void onReadAll()}>
            全部已读
          </Button>
        }
      >
        {listLoading && items.length === 0 ? (
          <div className="flex justify-center py-12">
            <Spin />
          </div>
        ) : items.length === 0 ? (
          <Empty description="暂无通知" />
        ) : (
          <List
            dataSource={items}
            loadMore={
              canLoadMore ? (
                <div className="mt-4 text-center">
                  <Button loading={listLoading} onClick={() => void loadList(false)}>
                    加载更多
                  </Button>
                </div>
              ) : null
            }
            renderItem={(item) => (
              <List.Item
                className={
                  item.priority === 'high'
                    ? '!border-l-4 !border-l-red-500 !pl-3'
                    : undefined
                }
                actions={[
                  !item.is_read ? (
                    <Button
                      key="read"
                      type="link"
                      size="small"
                      icon={<CheckOutlined />}
                      onClick={() => void onMarkRead(item)}
                    >
                      已读
                    </Button>
                  ) : null,
                  <Popconfirm
                    key="del"
                    title="删除此通知？"
                    okText="删除"
                    okType="danger"
                    cancelText="取消"
                    onConfirm={() => void onDelete(item.id)}
                  >
                    <Button type="link" danger size="small" icon={<DeleteOutlined />}>
                      删除
                    </Button>
                  </Popconfirm>,
                ].filter(Boolean)}
              >
                <button
                  type="button"
                  className="w-full cursor-pointer text-left"
                  onClick={() => void onItemActivate(item)}
                >
                  <List.Item.Meta
                    title={
                      <Space size="small" wrap>
                        {categoryIcon(item.category)}
                        <Typography.Text strong={!item.is_read} className="!text-sm">
                          {item.title}
                        </Typography.Text>
                        <Tag>{item.category}</Tag>
                        {item.priority === 'high' ? <Tag color="red">高优先级</Tag> : null}
                      </Space>
                    }
                    description={
                      <Typography.Paragraph
                        type="secondary"
                        className="!mb-0 !mt-1 !whitespace-pre-wrap !text-xs"
                      >
                        {item.content}
                      </Typography.Paragraph>
                    }
                  />
                  <Typography.Text type="secondary" className="!mt-1 !block !text-xs">
                    {new Date(item.created_at).toLocaleString()}
                  </Typography.Text>
                </button>
              </List.Item>
            )}
          />
        )}
      </Drawer>
    </>
  );
}
