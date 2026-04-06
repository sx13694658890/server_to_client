import { CloseOutlined, MessageOutlined } from '@ant-design/icons';
import { FloatButton } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { ChatPanel } from './chat-panel';
import { useAiChat } from './use-ai-chat';

const FAB_GAP = 24;

function fabPosition(): 'left' | 'right' {
  return import.meta.env.VITE_AI_CHAT_FAB_POSITION === 'right' ? 'right' : 'left';
}

export function AiChatWidget() {
  const [open, setOpen] = useState(false);
  const side = useMemo(() => fabPosition(), []);

  const anchor = side === 'left' ? 'bottom-24 left-6' : 'bottom-24 right-6';

  const fabStyle = useMemo(
    () =>
      ({
        position: 'fixed',
        zIndex: 1001,
        bottom: FAB_GAP,
        ...(side === 'left'
          ? { left: FAB_GAP, right: 'auto' }
          : { right: FAB_GAP, left: 'auto' }),
      }) as const,
    [side]
  );

  const tooltipPlacement = side === 'left' ? 'right' : 'left';

  const {
    messages,
    quickQuestions,
    quickLoading,
    sending,
    lastError,
    sources,
    fetchQuickQuestions,
    sendText,
    sendQuickQuestion,
    resetThread,
    clearError,
  } = useAiChat();

  useEffect(() => {
    if (open) {
      void fetchQuickQuestions();
    }
  }, [open, fetchQuickQuestions]);

  return (
    <>
      <ChatPanel
        open={open}
        onClose={() => setOpen(false)}
        messages={messages}
        quickQuestions={quickQuestions}
        quickLoading={quickLoading}
        sending={sending}
        lastError={lastError}
        sources={sources}
        onClearError={clearError}
        onSendText={sendText}
        onQuickSelect={sendQuickQuestion}
        onReset={resetThread}
        anchorClassName={anchor}
      />

      <FloatButton
        type="primary"
        shape="circle"
        icon={
          open ? (
            <CloseOutlined className="text-[20px] !leading-none block" />
          ) : (
            <MessageOutlined className="text-[20px] !leading-none block" />
          )
        }
        tooltip={{
          title: open ? '关闭 AI 助手' : '打开 AI 助手',
          placement: tooltipPlacement,
        }}
        aria-label={open ? '关闭 AI 助手' : '打开 AI 助手'}
        onClick={() => setOpen((v) => !v)}
        style={fabStyle}
        rootClassName="!shadow-[0_4px_14px_rgba(22,119,255,0.45)] hover:!shadow-[0_6px_20px_rgba(22,119,255,0.5)] [&_.ant-float-btn-body]:!p-0 [&_.ant-float-btn-icon]:flex [&_.ant-float-btn-icon]:items-center [&_.ant-float-btn-icon]:justify-center [&_.ant-float-btn-icon]:!leading-none"
      />
    </>
  );
}
