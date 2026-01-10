import type { Request, Response, NextFunction } from 'express';
import { turnstileService } from '../services/turnstileService.js';
import { telegramService } from '../services/telegramService.js';
import { logger } from '../utils/logger.js';
import type { ChatInput } from '../validators/chat.js';

// Simple responses for common questions
const autoResponses: Record<string, string> = {
  hello: "Hello! Thanks for reaching out. How can I help you today? If you'd like to discuss a project, feel free to share some details or book a call with our team.",
  hi: "Hi there! 👋 How can I help you today?",
  help: "I can help you learn about our services, pricing, or connect you with our team. What would you like to know?",
  pricing: "Our pricing starts at $2,500 for a Discovery session, $15k+ for MVP sprints, and $8k+/month for ongoing development. Visit /pricing for full details, or I can connect you with our team for a custom quote!",
  services: "We offer AI-Powered Development, Infrastructure Engineering, DevOps Automation, Cloud Architecture, Platform Engineering, and Consulting. Which area interests you?",
  contact: "You can reach us at hello@tenxdev.ai or fill out the contact form at /contact. Would you like me to notify our team about your inquiry?",
  mvp: "Our MVP Sprint is a 4-week program where we build your product from idea to launch. It includes everything from architecture to deployment. Interested in learning more?",
};

function getAutoResponse(message: string): string | null {
  const lowerMessage = message.toLowerCase().trim();

  for (const [keyword, response] of Object.entries(autoResponses)) {
    if (lowerMessage.includes(keyword)) {
      return response;
    }
  }

  return null;
}

export const chatController = {
  async handleMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const { message, turnstileToken } = req.body as ChatInput;
      const ip = req.ip || req.headers['x-forwarded-for']?.toString();
      const userAgent = req.headers['user-agent'];

      // Verify Turnstile token
      const isVerified = await turnstileService.verify(turnstileToken, ip);
      if (!isVerified) {
        res.status(403).json({
          success: false,
          message: 'Verification failed. Please refresh and try again.',
        });
        return;
      }

      // Check for auto-response
      const autoResponse = getAutoResponse(message);

      // Notify team via Telegram
      telegramService.notifyNewChat(message, { ip, userAgent }).catch(() => {
        // Log error but don't fail the request
      });

      logger.info({ message: message.substring(0, 100) }, 'Chat message received');

      // Send response
      const responseMessage = autoResponse ||
        "Thanks for your message! Our team has been notified and will get back to you shortly. In the meantime, feel free to explore our services or book a call at /contact.";

      res.status(200).json({
        success: true,
        message: responseMessage,
      });
    } catch (error) {
      next(error);
    }
  },
};
