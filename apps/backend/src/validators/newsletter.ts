import { z } from 'zod';

export const newsletterSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export type NewsletterInput = z.infer<typeof newsletterSchema>;
