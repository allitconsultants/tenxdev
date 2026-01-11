import { getSecretValue } from './secrets.js';

// Base config that doesn't need secrets
const baseConfig = {
  port: parseInt(process.env.PORT || '8080', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',

  email: {
    fromEmail: process.env.EMAIL_FROM || '"tenxdev demo" <hello@tenxdev.ai>',
    toEmail: process.env.EMAIL_TO || 'team@tenxdev.ai',
    brevoLogin: process.env.BREVO_LOGIN || '9e675f001@smtp-brevo.com',
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },
};

// Config with lazy-loaded secrets (supports GCP Secret Manager + env fallback)
export const config = {
  ...baseConfig,

  get brevoSmtpKey(): string {
    return getSecretValue('brevoSmtpKey', process.env.BREVO_SMTP_KEY);
  },

  get turnstileSecretKey(): string {
    return getSecretValue('turnstileSecretKey', process.env.TURNSTILE_SECRET_KEY);
  },

  get telegramBotToken(): string {
    return getSecretValue('telegramBotToken', process.env.TELEGRAM_BOT_TOKEN);
  },

  get telegramChatId(): string {
    return getSecretValue('telegramChatId', process.env.TELEGRAM_CHAT_ID);
  },

  get anthropicApiKey(): string {
    return getSecretValue('anthropicApiKey', process.env.ANTHROPIC_API_KEY);
  },

  get googleCalendarId(): string {
    return getSecretValue('googleCalendarId', process.env.GOOGLE_CALENDAR_ID);
  },

  get jwtSecret(): string {
    return getSecretValue('jwtSecret', process.env.JWT_SECRET);
  },

  // R2 (Cloudflare) credentials for resume uploads
  get r2AccountId(): string {
    return getSecretValue('r2AccountId', process.env.R2_ACCOUNT_ID);
  },

  get r2AccessKeyId(): string {
    return getSecretValue('r2AccessKeyId', process.env.R2_ACCESS_KEY_ID);
  },

  get r2SecretAccessKey(): string {
    return getSecretValue('r2SecretAccessKey', process.env.R2_SECRET_ACCESS_KEY);
  },

  get r2BucketName(): string {
    return getSecretValue('r2BucketName', process.env.R2_BUCKET_NAME);
  },
};
