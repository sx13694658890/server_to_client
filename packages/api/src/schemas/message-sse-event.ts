import { z } from 'zod';

const messageItemSchema = z.object({
  id: z.string(),
  category: z.string(),
  title: z.string(),
  content: z.string(),
  payload: z.record(z.string(), z.unknown()).nullable().optional(),
  priority: z.enum(['low', 'normal', 'high']),
  is_read: z.boolean(),
  read_at: z.string().nullable(),
  created_at: z.string(),
});

/** GET /messages/stream 的 data: JSON，见 docs/FRONTEND_API.md §6 */
export const messageSseEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('notification'),
    item: messageItemSchema,
  }),
  z.object({
    type: z.literal('unread_count'),
    unread_count: z.number(),
  }),
  z.object({
    type: z.literal('heartbeat'),
  }),
]);

export type MessageSseEvent = z.infer<typeof messageSseEventSchema>;
