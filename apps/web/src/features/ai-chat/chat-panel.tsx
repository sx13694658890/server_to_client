import { CloseOutlined, ReloadOutlined } from '@ant-design/icons';
import { Alert, Button, Input, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { ChatMessageList } from './chat-message-list';
import { QuickReplies } from './quick-replies';
import type { QuickQuestionItem } from '../../schemas/ai-chat';
import type { ChatMessage } from './use-ai-chat';

const { Text } = Typography;

export type ChatPanelProps = {
  open: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  quickQuestions: QuickQuestionItem[];
  quickLoading: boolean;
  sending: boolean;
  lastError: string | null;
  sources: { title: string; path: string }[];
  onClearError: () => void;
  onSendText: (text: string) => void;
  onQuickSelect: (item: QuickQuestionItem) => void;
  onReset: () => void;
  anchorClassName: string;
};

export function ChatPanel({
  open,
  onClose,
  messages,
  quickQuestions,
  quickLoading,
  sending,
  lastError,
  sources,
  onClearError,
  onSendText,
  onQuickSelect,
  onReset,
  anchorClassName,
}: ChatPanelProps) {
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  function submit() {
    const t = draft.trim();
    if (!t || sending) return;
    onSendText(t);
    setDraft('');
  }

  return (
    <div
      className={`fixed z-[1000] flex max-h-[70vh] w-[min(100vw-1.5rem,420px)] flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xl ${anchorClassName}`}
      role="dialog"
      aria-label="AI 助手对话"
    >
      <div className="flex items-center gap-2 border-b border-neutral-100 px-3 py-2">
        <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-green-500" aria-hidden />
        <Text strong className="flex-1 truncate">
            
        </Text>
        <Button
          type="text"
          size="small"
          icon={<ReloadOutlined />}
          aria-label="清空会话"
          onClick={onReset}
        />
        <Button
          type="text"
          size="small"
          icon={<CloseOutlined />}
          aria-label="关闭"
          onClick={onClose}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        {lastError ? (
          <Alert
            type="error"
            showIcon
            closable
            className="!m-2"
            message={lastError}
            onClose={onClearError}
          />
        ) : null}

        <Text type="secondary" className="px-3 pt-2 text-xs">
          AI 生成内容仅供参考，不构成专业建议。
        </Text>

        <ChatMessageList messages={messages} sending={sending} />

        {sources.length > 0 ? (
          <div className="border-t border-neutral-100 px-3 py-2">
            <Text type="secondary" className="text-xs">
              引用
            </Text>
            <ul className="mt-1 list-inside list-disc text-xs text-neutral-600">
              {sources.map((s, i) => (
                <li key={`${s.path}-${i}`}>
                  {s.title}
                  {s.path ? (
                    <>
                      {' '}
                      <Text type="secondary">({s.path})</Text>
                    </>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <QuickReplies
          items={quickQuestions}
          disabled={sending || quickLoading}
          onSelect={onQuickSelect}
        />

        <div className="mt-auto border-t border-neutral-100 p-2">
          <Input.TextArea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="输入消息…"
            autoSize={{ minRows: 1, maxRows: 4 }}
            disabled={sending}
            onPressEnter={(e) => {
              if (!e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
          />
          <div className="mt-2 flex justify-end">
            <Button type="primary" loading={sending} onClick={submit}>
              发送
            </Button>
          </div>
          <div className="mt-1 text-center">
            <Text type="secondary" className="text-[10px]">
              转人工等场景由服务端识别快捷问题或文案路由。
            </Text>
          </div>
        </div>
      </div>
    </div>
  );
}
