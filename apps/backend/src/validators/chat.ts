import { z } from 'zod';

export const chatSchema = z.object({
  message: z.string().min(1, 'Message is required').max(1000, 'Message too long'),
  turnstileToken: z.string().min(1, 'Verification required'),
});

export type ChatInput = z.infer<typeof chatSchema>;
