import type { Request, Response, NextFunction } from 'express';
import { emailService } from '../services/emailService.js';
import { logger } from '../utils/logger.js';
import type { ContactInput } from '../validators/contact.js';

export const contactController = {
  async submit(req: Request, res: Response, next: NextFunction) {
    try {
      const data = req.body as ContactInput;

      // Send notification to team
      await emailService.sendContactNotification(data);

      // Send confirmation to user (non-blocking)
      emailService.sendContactConfirmation(data).catch(() => {
        // Logged in service, no action needed
      });

      logger.info({ email: data.email, service: data.service }, 'Contact form submitted');

      res.status(201).json({
        success: true,
        message: "Thank you! We'll be in touch within 24 hours.",
      });
    } catch (error) {
      next(error);
    }
  },
};
