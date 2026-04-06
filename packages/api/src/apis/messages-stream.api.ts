import type { HttpBundle } from '../http';
import { readFetchErrorMessage } from '../errors';
import { messageSseEventSchema, type MessageSseEvent } from '../schemas/message-sse-event';
import type { MessageItem } from './messages.api';

export type MessageStreamHandlers = {
  onNotification?: (item: MessageItem) => void;
  onUnreadCount?: (count: number) => void;
  onHeartbeat?: () => void;
};

function dispatchEvent(ev: MessageSseEvent, handlers: MessageStreamHandlers) {
  switch (ev.type) {
    case 'notification':
      handlers.onNotification?.(ev.item as MessageItem);
      break;
    case 'unread_count':
      handlers.onUnreadCount?.(ev.unread_count);
      break;
    case 'heartbeat':
      handlers.onHeartbeat?.();
      break;
    default:
      break;
  }
}

/**
 * GET /messages/stream（SSE + Bearer），按 docs/FRONTEND_API.md §6 解析。
 */
export async function readMessagesStream(
  bundle: HttpBundle,
  signal: AbortSignal,
  handlers: MessageStreamHandlers
): Promise<void> {
  const res = await bundle.fetchWithAuth('messages/stream', {
    method: 'GET',
    signal,
    headers: { Accept: 'text/event-stream' },
  });

  if (!res.ok) {
    const msg = await readFetchErrorMessage(res);
    throw new Error(msg);
  }

  const reader = res.body?.getReader();
  if (!reader) {
    throw new Error('无响应体');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let sep: number;
    while ((sep = buffer.indexOf('\n\n')) !== -1) {
      const block = buffer.slice(0, sep).trim();
      buffer = buffer.slice(sep + 2);
      if (!block.startsWith('data: ')) continue;
      let raw: unknown;
      try {
        raw = JSON.parse(block.slice(6));
      } catch {
        continue;
      }
      const parsed = messageSseEventSchema.safeParse(raw);
      if (!parsed.success) continue;
      dispatchEvent(parsed.data, handlers);
    }
  }
}
