import type { Request, Response, NextFunction } from 'express';
import { emailService } from '../services/emailService.js';
import { logger } from '../utils/logger.js';
import type { NewsletterInput } from '../validators/newsletter.js';

export const newsletterController = {
  async subscribe(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body as NewsletterInput;

      await emailService.sendNewsletterWelcome(email);

      logger.info({ email }, 'Newsletter subscription');

      res.status(201).json({
        success: true,
        message: 'Thanks for subscribing! Check your inbox for a welcome email.',
      });
    } catch (error) {
      next(error);
    }
  },
};
