import { z } from 'zod';

const chatSourceSchema = z.object({
  title: z.string(),
  path: z.string(),
});

/** SSE: data: { ... } JSON，与 docs/FRONTEND_API.md §8.3 对齐 */
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
