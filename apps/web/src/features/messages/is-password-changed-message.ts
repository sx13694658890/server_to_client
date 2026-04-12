import type { MessageItem } from '@repo/api';

/** 后端推送的「密码已修改」系统通知，见消息 payload.kind */
export function isPasswordChangedMessage(item: MessageItem): boolean {
  const p = item.payload;
  return (
    p != null &&
    typeof p === 'object' &&
    !Array.isArray(p) &&
    'kind' in p &&
    (p as { kind?: unknown }).kind === 'password_changed'
  );
}
