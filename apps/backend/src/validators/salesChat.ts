import { z } from 'zod';

const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(5000),
});

const leadInfoSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  company: z.string().optional(),
  phone: z.string().optional(),
  companySize: z.enum(['1-10', '11-50', '51-200', '201-1000', '1000+']).optional(),
  interests: z.array(z.string()).optional(),
  budgetRange: z.enum(['<10k', '10k-50k', '50k-100k', '100k+', 'not_sure']).optional(),
});

export const salesChatSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(50),
  turnstileToken: z.string().min(1),
  leadInfo: leadInfoSchema.optional(),
  timezone: z.string().optional().default('America/New_York'),
  selectedSlotId: z.string().optional(),
});

export type SalesChatInput = z.infer<typeof salesChatSchema>;
