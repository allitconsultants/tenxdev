import { Router, IRouter } from 'express';
import { chatController } from '../controllers/chatController.js';
import { validate } from '../middleware/validation.js';
import { contactLimiter } from '../middleware/rateLimit.js';
import { chatSchema } from '../validators/chat.js';

const router: IRouter = Router();

router.post(
  '/',
  contactLimiter,
  validate(chatSchema),
  chatController.handleMessage
);

export const chatRoutes: IRouter = router;
