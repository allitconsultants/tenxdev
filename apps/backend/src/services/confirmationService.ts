import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

interface ConfirmationPayload {
  eventId: string;
  email: string;
}

const TOKEN_EXPIRY = '1h';

export const confirmationService = {
  generateToken(eventId: string, email: string): string {
    const secret = config.jwtSecret;
    if (!secret) {
      throw new Error('JWT secret not configured');
    }

    const payload: ConfirmationPayload = { eventId, email };
    return jwt.sign(payload, secret, { expiresIn: TOKEN_EXPIRY });
  },

  verifyToken(token: string): ConfirmationPayload {
    const secret = config.jwtSecret;
    if (!secret) {
      throw new Error('JWT secret not configured');
    }

    try {
      const decoded = jwt.verify(token, secret) as ConfirmationPayload;
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        logger.warn({ error }, 'Confirmation token expired');
        throw new Error('TOKEN_EXPIRED');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        logger.warn({ error }, 'Invalid confirmation token');
        throw new Error('TOKEN_INVALID');
      }
      throw error;
    }
  },

  generateConfirmationUrl(eventId: string, email: string): string {
    const token = this.generateToken(eventId, email);
    const baseUrl = process.env.API_BASE_URL || 'https://api.tenxdev.ai';
    return `${baseUrl}/api/v1/demo-confirm?token=${encodeURIComponent(token)}`;
  },
};
