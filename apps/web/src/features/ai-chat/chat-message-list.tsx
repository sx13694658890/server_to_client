import { RobotOutlined, UserOutlined } from '@ant-design/icons';
import { Avatar, Spin, Typography } from 'antd';
import { useEffect, useRef } from 'react';
import type { ChatMessage } from './use-ai-chat';

const { Text, Paragraph } = Typography;

export type ChatMessageListProps = {
  messages: ChatMessage[];
  sending: boolean;
};

export function ChatMessageList({ messages, sending }: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, sending]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-8 text-center">
        <Text type="secondary">你好，我是 AI 助手。</Text>
        <Text type="secondary" className="text-xs">
          可从下方快捷问题开始，或直接输入内容。
        </Text>
      </div>
    );
  }

  return (
    <div className="flex max-h-[min(42vh,360px)] flex-col gap-3 overflow-y-auto px-1 py-2">
      {messages.map((m) => (
        <div
          key={m.id}
          className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
        >
          <Avatar
            size="small"
            className="shrink-0"
            icon={m.role === 'user' ? <UserOutlined /> : <RobotOutlined />}
            style={{
              backgroundColor: m.role === 'user' ? '#1677ff' : 'rgba(0,0,0,0.45)',
            }}
          />
          <div
            className={`max-w-[85%] rounded-lg px-3 py-2 ${
              m.role === 'user'
                ? 'bg-[#1677ff] text-white'
                : 'border border-neutral-200 bg-neutral-50 text-neutral-900'
            }`}
          >
            {m.role === 'assistant' && m.status === 'sending' && !m.content ? (
              <Spin size="small" />
            ) : (
              <Paragraph
                className={`!mb-0 whitespace-pre-wrap break-words ${
                  m.role === 'user' ? '!text-white' : ''
                }`}
              >
                {m.status === 'failed'
                  ? '（未能完成回复，请重试或稍后再试）'
                  : m.content}
              </Paragraph>
            )}
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
