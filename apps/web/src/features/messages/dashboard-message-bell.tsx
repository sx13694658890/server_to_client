import { BellOutlined, MoreOutlined } from '@ant-design/icons';
import { Badge, Button, Dropdown, Popover, Typography } from 'antd';
import type { MessageItem } from '@repo/api';
import { useNavigate } from 'react-router-dom';
import { useMessageInboxContext } from './message-inbox-context';
import {
  MessageInboxFooterLink,
  MessageInboxList,
  MessageInboxTabs,
} from './message-inbox-ui';

export function DashboardMessageBell() {
  const navigate = useNavigate();
  const {
    unreadCount,
    popoverOpen,
    setPopoverOpen,
    activeTab,
    setTab,
    displayItems,
    listLoading,
    canLoadMore,
    loadList,
    onReadAll,
    onMarkRead,
    onDelete,
  } = useMessageInboxContext();

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
      setPopoverOpen(false);
    }
  };

  const panel = (
    <div className="w-[340px]">
      <div className="flex items-center justify-between border-b border-neutral-200 px-3 pb-2 pt-1">
        <Typography.Text strong className="text-base">
          通知
        </Typography.Text>
        <Dropdown
          trigger={['click']}
          menu={{
            items: [
              {
                key: 'readAll',
                label: '全部已读',
                onClick: () => void onReadAll(),
              },
              {
                key: 'refresh',
                label: '刷新',
                onClick: () => void loadList(true),
              },
            ],
          }}
        >
          <Button
            type="text"
            size="small"
            icon={<MoreOutlined className="text-neutral-500" />}
            className="!text-neutral-500"
            aria-label="更多操作"
          />
        </Dropdown>
      </div>

      <MessageInboxTabs activeTab={activeTab} onChange={setTab} />

      <MessageInboxList
        compact
        displayItems={displayItems}
        listLoading={listLoading}
        activeTab={activeTab}
        canLoadMore={canLoadMore}
        onLoadMore={() => void loadList(false)}
        onMarkRead={onMarkRead}
        onDelete={onDelete}
        onItemActivate={onItemActivate}
      />

      <MessageInboxFooterLink
        onClick={() => {
          setPopoverOpen(false);
          navigate('/dashboard/messages');
        }}
      />
    </div>
  );

  return (
    <Popover
      open={popoverOpen}
      onOpenChange={setPopoverOpen}
      trigger="click"
      placement="bottomRight"
      arrow={false}
      overlayInnerStyle={{ padding: 0 }}
      content={panel}
    >
      <Badge count={unreadCount > 0 ? unreadCount : 0} size="small" offset={[-2, 8]}>
        <button
          type="button"
          aria-label="通知"
          className="flex h-9 w-9 items-center justify-center rounded-md border-0 bg-transparent text-lg text-neutral-600 hover:bg-neutral-100"
        >
          <BellOutlined />
        </button>
      </Badge>
    </Popover>
  );
}
