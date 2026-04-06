import {
  createAiApi,
  createHttpBundle,
  getApiErrorMessage,
  postAiChatStream,
} from '@repo/api';
import { useAuth } from '@repo/hooks';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { API_V1_PREFIX } from '../../constants';
import {
  chatRequestSchema,
  chatResponseSchema,
  quickQuestionsResponseSchema,
  type ChatRequestPayload,
  type QuickQuestionItem,
} from '../../schemas/ai-chat';
import {
  createStreamTextRevealFromEnv,
  type StreamTextReveal,
} from './stream-text-reveal';

const SESSION_KEY = 'ai-chat:v1';

export type ChatMessageRole = 'user' | 'assistant';

export type ChatMessageStatus = 'sending' | 'sent' | 'failed';

export type ChatMessage = {
  id: string;
  role: ChatMessageRole;
  content: string;
  status: ChatMessageStatus;
  createdAt: number;
};

type PersistedSession = {
  messages: ChatMessage[];
  conversationId: string | null;
};

const FALLBACK_QUICK_QUESTIONS: QuickQuestionItem[] = [
  { id: 'what_is_it', label: '这是什么?有什么用?' },
  { id: 'how_to_use', label: '要怎么用?' },
  { id: 'transfer_human', label: '转人工' },
];

function loadSession(): PersistedSession {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return { messages: [], conversationId: null };
    const data = JSON.parse(raw) as PersistedSession;
    if (!Array.isArray(data.messages)) return { messages: [], conversationId: null };
    return {
      messages: data.messages.filter(
        (m) =>
          m &&
          typeof m.id === 'string' &&
          (m.role === 'user' || m.role === 'assistant') &&
          typeof m.content === 'string' &&
          (m.status === 'sending' || m.status === 'sent' || m.status === 'failed')
      ),
      conversationId: typeof data.conversationId === 'string' ? data.conversationId : null,
    };
  } catch {
    return { messages: [], conversationId: null };
  }
}

function saveSession(session: PersistedSession) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    /* ignore quota */
  }
}

function newId(): string {
  return crypto.randomUUID();
}

function buildChatPayload(
  threadForApi: ChatMessage[],
  conversationId: string | null,
  quickQuestionId: string | null
): ChatRequestPayload {
  const apiMessages = threadForApi
    .filter(
      (m) =>
        m.content.trim() !== '' &&
        (m.role === 'user' || (m.role === 'assistant' && m.status === 'sent'))
    )
    .map((m) => ({ role: m.role, content: m.content.trim() }));

  const parsed = chatRequestSchema.safeParse({
    messages: apiMessages,
    conversation_id: conversationId,
    quick_question_id: quickQuestionId,
  });
  if (!parsed.success) {
    throw new Error('对话消息格式无效');
  }
  return parsed.data;
}

function isAiChatStreamEnabled(): boolean {
  return import.meta.env.VITE_AI_CHAT_USE_STREAM === 'true';
}

export function useAiChat() {
  const { accessToken } = useAuth();
  const httpBundle = useMemo(
    () =>
      createHttpBundle({
        getEnv: () => ({ VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL }),
        apiPrefix: API_V1_PREFIX,
        getToken: () => accessToken,
      }),
    [accessToken]
  );

  const ai = useMemo(() => createAiApi(httpBundle.client), [httpBundle]);

  const [messages, setMessages] = useState<ChatMessage[]>(() => loadSession().messages);
  const [conversationId, setConversationId] = useState<string | null>(
    () => loadSession().conversationId
  );
  const [quickQuestions, setQuickQuestions] =
    useState<QuickQuestionItem[]>(FALLBACK_QUICK_QUESTIONS);
  const [quickLoading, setQuickLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [sources, setSources] = useState<{ title: string; path: string }[]>([]);

  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const abortRef = useRef<AbortController | null>(null);
  const sendingRef = useRef(false);

  useEffect(() => {
    saveSession({ messages, conversationId });
  }, [messages, conversationId]);

  const fetchQuickQuestions = useCallback(async () => {
    setQuickLoading(true);
    try {
      const { data } = await ai.getQuickQuestions();
      const parsed = quickQuestionsResponseSchema.safeParse(data);
      if (parsed.success && parsed.data.items.length > 0) {
        setQuickQuestions(parsed.data.items);
      }
    } catch {
      /* keep fallback */
    } finally {
      setQuickLoading(false);
    }
  }, [ai]);

  const clearError = useCallback(() => setLastError(null), []);

  const appendAndSend = useCallback(
    async (userContent: string, quickQuestionId: string | null) => {
      const trimmed = userContent.trim();
      if (!trimmed || sendingRef.current) return;

      sendingRef.current = true;
      setSending(true);
      setLastError(null);

      const prev = messagesRef.current;
      const userMsg: ChatMessage = {
        id: newId(),
        role: 'user',
        content: trimmed,
        status: 'sent',
        createdAt: Date.now(),
      };
      const assistantId = newId();
      const assistantPlaceholder: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        status: 'sending',
        createdAt: Date.now(),
      };

      const fullUi = [...prev, userMsg, assistantPlaceholder];
      messagesRef.current = fullUi;
      setMessages(fullUi);

      const threadForApi = [...prev, userMsg];
      setSources([]);

      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      const failAssistant = (err: string) => {
        setLastError(err);
        setMessages((cur) => {
          const next = cur.map((m) =>
            m.id === assistantId
              ? { ...m, status: 'failed' as const, content: '' }
              : m
          );
          messagesRef.current = next;
          return next;
        });
      };

      let streamDrainPending = false;
      let activeStreamReveal: StreamTextReveal | null = null;

      try {
        const body = buildChatPayload(threadForApi, conversationId, quickQuestionId);

        if (isAiChatStreamEnabled()) {
          let streamFinished = false;
          let streamErrored = false;
          activeStreamReveal = createStreamTextRevealFromEnv((visible) => {
            setMessages((cur) => {
              const next: ChatMessage[] = cur.map((m) =>
                m.id === assistantId ? { ...m, content: visible, status: 'sending' } : m
              );
              messagesRef.current = next;
              return next;
            });
          });

          const endStreamSending = () => {
            sendingRef.current = false;
            setSending(false);
          };

          await postAiChatStream(httpBundle, body, ac.signal, {
            onDelta: (t) => {
              activeStreamReveal?.pushDelta(t);
            },
            onDone: ({ content, sources: src }) => {
              streamFinished = true;
              streamDrainPending = true;
              const full =
                content.length > 0 ? content : (activeStreamReveal?.getTarget() ?? '');
              activeStreamReveal!.finalize(full, () => {
                setSources(src ?? []);
                setMessages((cur) => {
                  const next: ChatMessage[] = cur.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: full, status: 'sent' }
                      : m
                  );
                  messagesRef.current = next;
                  return next;
                });
                endStreamSending();
              });
            },
            onStreamError: (detail) => {
              streamErrored = true;
              activeStreamReveal?.cancel();
              failAssistant(detail);
              endStreamSending();
            },
          });

          if (!streamFinished && !streamErrored && activeStreamReveal) {
            activeStreamReveal.cancel();
            const tail = activeStreamReveal.getTarget();
            setMessages((cur) => {
              const next: ChatMessage[] = cur.map((m) =>
                m.id === assistantId && m.status === 'sending'
                  ? {
                      ...m,
                      content: m.content || tail,
                      status: 'sent',
                    }
                  : m
              );
              messagesRef.current = next;
              return next;
            });
            endStreamSending();
          }
        } else {
          const { data } = await ai.chat(body, { signal: ac.signal });
          const parsed = chatResponseSchema.safeParse(data);
          if (!parsed.success) {
            failAssistant('响应格式与约定不一致');
            return;
          }
          setSources(parsed.data.sources ?? []);
          setMessages((cur) => {
            const next: ChatMessage[] = cur.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    content: parsed.data.message.content,
                    status: 'sent',
                  }
                : m
            );
            messagesRef.current = next;
            return next;
          });
        }
      } catch (e) {
        activeStreamReveal?.cancel();
        if (e instanceof Error && e.name === 'AbortError') {
          setMessages((cur) => {
            const next = cur.filter((m) => m.id !== assistantId);
            messagesRef.current = next;
            return next;
          });
          return;
        }
        failAssistant(getApiErrorMessage(e));
      } finally {
        abortRef.current = null;
        if (!streamDrainPending) {
          sendingRef.current = false;
          setSending(false);
        }
      }
    },
    [ai, httpBundle, conversationId]
  );

  const sendText = useCallback(
    (text: string) => appendAndSend(text, null),
    [appendAndSend]
  );

  const sendQuickQuestion = useCallback(
    (item: QuickQuestionItem) => appendAndSend(item.label, item.id),
    [appendAndSend]
  );

  const resetThread = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setConversationId(null);
    setSources([]);
    setLastError(null);
    messagesRef.current = [];
    sessionStorage.removeItem(SESSION_KEY);
  }, []);

  return {
    messages,
    quickQuestions,
    quickLoading,
    sending,
    lastError,
    sources,
    conversationId,
    setConversationId,
    fetchQuickQuestions,
    sendText,
    sendQuickQuestion,
    resetThread,
    clearError,
  };
}
