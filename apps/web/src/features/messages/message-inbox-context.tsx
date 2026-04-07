import { createContext, useContext, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useMessagesInbox } from './use-messages-inbox';

export type MessageInboxContextValue = ReturnType<typeof useMessagesInbox> & {
  popoverOpen: boolean;
  setPopoverOpen: (open: boolean) => void;
};

const MessageInboxContext = createContext<MessageInboxContextValue | null>(null);

export function MessageInboxProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const listEnabled =
    popoverOpen || location.pathname.startsWith('/dashboard/messages');

  const inbox = useMessagesInbox({ listEnabled });

  const value: MessageInboxContextValue = {
    ...inbox,
    popoverOpen,
    setPopoverOpen,
  };

  return (
    <MessageInboxContext.Provider value={value}>{children}</MessageInboxContext.Provider>
  );
}

export function useMessageInboxContext(): MessageInboxContextValue {
  const ctx = useContext(MessageInboxContext);
  if (!ctx) {
    throw new Error('useMessageInboxContext 须在 MessageInboxProvider 内使用');
  }
  return ctx;
}
