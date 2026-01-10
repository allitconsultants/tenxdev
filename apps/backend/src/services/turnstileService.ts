import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

interface TurnstileResponse {
  success: boolean;
  'error-codes'?: string[];
  challenge_ts?: string;
  hostname?: string;
}

export const turnstileService = {
  async verify(token: string, ip?: string): Promise<boolean> {
    if (!config.turnstileSecretKey) {
      logger.warn('Turnstile secret key not configured, skipping verification');
      return true; // Allow in development
    }

    try {
      const formData = new URLSearchParams();
      formData.append('secret', config.turnstileSecretKey);
      formData.append('response', token);
      if (ip) {
        formData.append('remoteip', ip);
      }

      const response = await fetch(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData,
        }
      );

      const data = (await response.json()) as TurnstileResponse;

      if (!data.success) {
        logger.warn({ errors: data['error-codes'] }, 'Turnstile verification failed');
        return false;
      }

      logger.info({ hostname: data.hostname }, 'Turnstile verification successful');
      return true;
    } catch (error) {
      logger.error({ error }, 'Turnstile verification error');
      return false;
    }
  },
};
