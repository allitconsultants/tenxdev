import { Router, IRouter } from 'express';
import { healthRoutes } from './health.js';
import { contactRoutes } from './contact.js';
import { newsletterRoutes } from './newsletter.js';
import { chatRoutes } from './chat.js';
import salesChatRoutes from './salesChat.js';
import demoConfirmRoutes from './demoConfirm.js';
import { apiLimiter, salesChatLimiter } from '../middleware/rateLimit.js';

const router: IRouter = Router();

// Apply rate limiting to all routes
router.use(apiLimiter);

// Health checks (no rate limit needed)
router.use('/health', healthRoutes);

// API routes
router.use('/contact', contactRoutes);
router.use('/newsletter', newsletterRoutes);
router.use('/chat', chatRoutes);
router.use('/sales-chat', salesChatLimiter, salesChatRoutes);
router.use('/demo-confirm', demoConfirmRoutes);

export const routes: IRouter = router;
