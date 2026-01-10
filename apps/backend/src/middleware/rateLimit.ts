import rateLimit from 'express-rate-limit';
import { config } from '../config/index.js';

export const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    success: false,
    error: 'Too many requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 contact form submissions per hour
  message: {
    success: false,
    error: 'Too many contact requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const salesChatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 messages per minute for AI chat
  message: {
    success: false,
    error: 'Too many messages. Please wait a moment before sending more.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
