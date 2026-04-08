import type { HttpBundle } from '../http';
import { readFetchErrorMessage } from '../errors';
import { sseEventSchema } from '../schemas/sse-event';

export type StreamHandlers = {
  onMeta?: (route: 'answer' | 'human_handoff') => void;
  onDelta?: (text: string) => void;
  onDone?: (args: {
    content: string;
    sources: { title: string; path: string }[];
    route: 'answer' | 'human_handoff';
  }) => void;
  onStreamError?: (detail: string) => void;
};

/**
 * POST /api/v1/ai/chat/stream（SSE），按 docs/FRONTEND_API.md §5 解析。
 */
export async function postAiChatStream(
  bundle: HttpBundle,
  body: unknown,
  signal: AbortSignal,
  handlers: StreamHandlers
): Promise<void> {
  const res = await bundle.fetchWithAuth('ai/chat/stream', {
    method: 'POST',
    body: JSON.stringify(body),
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
      const parsed = sseEventSchema.safeParse(raw);
      if (!parsed.success) continue;

      const ev = parsed.data;
      switch (ev.type) {
        case 'meta':
          handlers.onMeta?.(ev.route);
          break;
        case 'delta':
          if (ev.text) handlers.onDelta?.(ev.text);
          break;
        case 'done':
          handlers.onDone?.({
            content: ev.message.content,
            sources: ev.sources,
            route: ev.route,
          });
          break;
        case 'error':
          handlers.onStreamError?.(ev.detail);
          break;
        default:
          break;
      }
    }
  }
}
