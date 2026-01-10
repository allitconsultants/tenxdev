import { Router, type IRouter } from 'express';
import { handleSalesChat } from '../controllers/salesChatController.js';
import { validate } from '../middleware/validation.js';
import { salesChatSchema } from '../validators/salesChat.js';
import { turnstileService } from '../services/turnstileService.js';
import { logger } from '../utils/logger.js';
import type { Request, Response, NextFunction } from 'express';

const router: IRouter = Router();

// Turnstile verification middleware
// Only verify on first message (when messages array has 1 item - the current user message)
async function verifyTurnstile(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const { turnstileToken, messages } = req.body;

  // Skip verification if this is not the first message
  // (Turnstile tokens can only be used once)
  if (messages && messages.length > 1) {
    next();
    return;
  }

  const ip = req.ip || req.socket.remoteAddress || 'unknown';

  try {
    const isValid = await turnstileService.verify(turnstileToken, ip);
    if (!isValid) {
      res.status(403).json({ error: 'Security verification failed' });
      return;
    }
    next();
  } catch (error) {
    logger.error({ error }, 'Turnstile verification error');
    res.status(500).json({ error: 'Verification service unavailable' });
  }
}

// POST /api/v1/sales-chat - Stream sales chat with Claude
router.post(
  '/',
  validate(salesChatSchema),
  verifyTurnstile,
  handleSalesChat
);

export default router;
