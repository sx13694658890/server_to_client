import { Card, Typography } from 'antd';
import type { MessageItem } from '@repo/api';
import { useAuth } from '@repo/hooks';
import { useDocumentTitle } from 'usehooks-ts';
import { markPasswordChangedRelogin } from '../../auth/password-changed-session';
import { useMessageInboxContext } from '../../features/messages/message-inbox-context';
import { isPasswordChangedMessage } from '../../features/messages/is-password-changed-message';
import { MessageInboxList, MessageInboxTabs } from '../../features/messages/message-inbox-ui';

export function MessagesCenterPage() {
  useDocumentTitle('通知中心 · client-react-sp');

  const { clearAuth } = useAuth();
  const {
    activeTab,
    setTab,
    displayItems,
    listLoading,
    canLoadMore,
    loadList,
    onMarkRead,
    onDelete,
  } = useMessageInboxContext();

  const onItemActivate = async (item: MessageItem) => {
    if (isPasswordChangedMessage(item)) {
      markPasswordChangedRelogin();
      clearAuth();
      return;
    }
    await onMarkRead(item);
  };

  return (
    <div>
      <Typography.Title level={4} className="!mb-4">
        通知中心
      </Typography.Title>
      <Card className="shadow-sm" styles={{ body: { padding: 0 } }}>
        <div className="px-4 pt-4">
          <Typography.Text type="secondary" className="text-sm">
            未读 / 已读切换与列表；顶栏铃铛为快捷预览。
          </Typography.Text>
        </div>
        <div className="px-0 pt-2">
          <MessageInboxTabs activeTab={activeTab} onChange={setTab} />
        </div>
        <div className="px-0 pb-2">
          <MessageInboxList
            displayItems={displayItems}
            listLoading={listLoading}
            activeTab={activeTab}
            canLoadMore={canLoadMore}
            onLoadMore={() => void loadList(false)}
            onMarkRead={onMarkRead}
            onDelete={onDelete}
            onItemActivate={onItemActivate}
          />
        </div>
      </Card>
    </div>
  );
}
