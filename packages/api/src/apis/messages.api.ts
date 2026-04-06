import type { AxiosInstance } from 'axios';

export type MessagePriority = 'low' | 'normal' | 'high';

export type MessageItem = {
  id: string;
  category: string;
  title: string;
  content: string;
  payload?: Record<string, unknown> | null;
  priority: MessagePriority;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
};

export type MessageListResponse = {
  items: MessageItem[];
  total: number;
  unread_count: number;
};

export type MessageListParams = {
  limit?: number;
  offset?: number;
  only_unread?: boolean;
};

export type UnreadCountResponse = {
  unread_count: number;
};

export type ReadAllResponse = {
  updated: number;
};

export type MarkReadResponse = {
  message: string;
};

export function createMessagesApi(client: AxiosInstance) {
  return {
    list(params?: MessageListParams) {
      return client.get<MessageListResponse>('/messages', { params });
    },
    unreadCount() {
      return client.get<UnreadCountResponse>('/messages/unread-count');
    },
    markRead(messageId: string) {
      return client.post<MarkReadResponse>(`/messages/${messageId}/read`);
    },
    readAll() {
      return client.post<ReadAllResponse>('/messages/read-all');
    },
    remove(messageId: string) {
      return client.delete<void>(`/messages/${messageId}`);
    },
  };
}
