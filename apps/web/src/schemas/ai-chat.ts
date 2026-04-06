import { z } from 'zod';

/** GET /api/v1/ai/quick-questions */
export const quickQuestionItemSchema = z.object({
  id: z.string(),
  label: z.string(),
});

export const quickQuestionsResponseSchema = z.object({
  items: z.array(quickQuestionItemSchema),
});

export type QuickQuestionItem = z.infer<typeof quickQuestionItemSchema>;

const chatRoleSchema = z.enum(['user', 'assistant', 'system']);

export const chatMessageApiSchema = z.object({
  role: chatRoleSchema,
  content: z.string(),
});

export type ChatMessageApi = z.infer<typeof chatMessageApiSchema>;

/** POST /api/v1/ai/chat & /ai/chat/stream body */
export const chatRequestSchema = z.object({
  messages: z.array(chatMessageApiSchema),
  conversation_id: z.string().uuid().nullable().optional(),
  quick_question_id: z.string().nullable().optional(),
});

export type ChatRequestPayload = z.infer<typeof chatRequestSchema>;

export const chatSourceSchema = z.object({
  title: z.string(),
  path: z.string(),
});

/** POST /api/v1/ai/chat 200 */
export const chatResponseSchema = z.object({
  message: z.object({
    role: z.literal('assistant'),
    content: z.string(),
  }),
  sources: z.array(chatSourceSchema).default([]),
  route: z.enum(['answer', 'human_handoff']),
});

export type ChatResponsePayload = z.infer<typeof chatResponseSchema>;

/** SSE: data: { ... } JSON lines */
export const sseEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('meta'),
    route: z.enum(['answer', 'human_handoff']),
  }),
  z.object({
    type: z.literal('delta'),
    text: z.string().optional(),
  }),
  z.object({
    type: z.literal('done'),
    message: z.object({
      role: z.literal('assistant'),
      content: z.string(),
    }),
    sources: z.array(chatSourceSchema),
    route: z.enum(['answer', 'human_handoff']),
  }),
  z.object({
    type: z.literal('error'),
    detail: z.string(),
  }),
]);

export type SseEvent = z.infer<typeof sseEventSchema>;
