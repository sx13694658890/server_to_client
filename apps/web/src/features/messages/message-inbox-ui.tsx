import {
  CheckOutlined,
  DeleteOutlined,
  RightOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import type { MessageItem } from '@repo/api';
import { Button, Empty, List, Popconfirm, Space, Spin, Tag, Typography } from 'antd';
import type { MessageInboxTab } from './use-messages-inbox';

function categoryIcon(category: string) {
  if (category === 'security') return <SafetyOutlined className="text-amber-600" />;
  return null;
}

export function MessageInboxTabs(props: {
  activeTab: MessageInboxTab;
  onChange: (tab: MessageInboxTab) => void;
}) {
  const { activeTab, onChange } = props;
  const tabBtn = (tab: MessageInboxTab, label: string) => {
    const active = activeTab === tab;
    return (
      <button
        type="button"
        onClick={() => onChange(tab)}
        className={[
          'flex-1 py-2.5 text-center text-sm transition-colors',
          active
            ? 'border-b-2 border-[#1677ff] font-medium text-[#1677ff]'
            : 'border-b-2 border-transparent text-neutral-700 hover:text-neutral-900',
        ].join(' ')}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="flex border-b border-neutral-200">
      {tabBtn('unread', '未读')}
      {tabBtn('read', '已读')}
    </div>
  );
}

export function MessageInboxList(props: {
  displayItems: MessageItem[];
  listLoading: boolean;
  activeTab: MessageInboxTab;
  canLoadMore: boolean;
  onLoadMore: () => void;
  onMarkRead: (item: MessageItem) => void;
  onDelete: (id: string) => void;
  onItemActivate: (item: MessageItem) => void;
  /** Popover 内限制高度；全页不传或 false */
  compact?: boolean;
}) {
  const {
    displayItems,
    listLoading,
    activeTab,
    canLoadMore,
    onLoadMore,
    onMarkRead,
    onDelete,
    onItemActivate,
    compact,
  } = props;

  const emptyText =
    activeTab === 'unread' ? '暂无未读通知' : '暂无已读通知';

  return (
    <div
      className={
        compact ? 'max-h-[320px] overflow-y-auto overflow-x-hidden' : 'min-h-[200px]'
      }
    >
      {listLoading && displayItems.length === 0 ? (
        <div className="flex justify-center py-10">
          <Spin />
        </div>
      ) : displayItems.length === 0 ? (
        <Empty className="py-8" description={emptyText} image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <List
          className="!p-0"
          split
          dataSource={displayItems}
          renderItem={(item) => (
            <List.Item
              className={[
                '!px-3 !py-3',
                item.priority === 'high' ? '!border-l-[3px] !border-l-red-500' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              actions={[
                !item.is_read ? (
                  <Button
                    key="read"
                    type="link"
                    size="small"
                    icon={<CheckOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      void onMarkRead(item);
                    }}
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
                  <Button
                    type="link"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={(e) => e.stopPropagation()}
                  >
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
                    <Space size="small" wrap className="!items-center">
                      {categoryIcon(item.category)}
                      <Typography.Text strong={!item.is_read} className="!text-sm">
                        {item.title}
                      </Typography.Text>
                      <Tag className="!m-0">{item.category}</Tag>
                      {item.priority === 'high' ? (
                        <Tag color="red" className="!m-0">
                          高优先级
                        </Tag>
                      ) : null}
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

      {canLoadMore && displayItems.length > 0 ? (
        <div className="border-t border-neutral-100 py-2 text-center">
          <Button type="link" size="small" loading={listLoading} onClick={() => onLoadMore()}>
            加载更多
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function MessageInboxFooterLink(props: { onClick: () => void }) {
  return (
    <div className="border-t border-neutral-200 py-2.5 text-center">
      <button
        type="button"
        onClick={props.onClick}
        className="inline-flex items-center gap-1 text-sm text-neutral-500 transition-colors hover:text-[#1677ff]"
      >
        查看所有通知
        <RightOutlined className="text-xs" />
      </button>
    </div>
  );
}
