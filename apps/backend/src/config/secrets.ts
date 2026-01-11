import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { logger } from '../utils/logger.js';

const client = new SecretManagerServiceClient();

interface SecretsConfig {
  turnstileSiteKey?: string;
  turnstileSecretKey?: string;
  brevoSmtpKey?: string;
  telegramBotToken?: string;
  telegramChatId?: string;
  anthropicApiKey?: string;
  googleCalendarId?: string;
  jwtSecret?: string;
  r2AccountId?: string;
  r2AccessKeyId?: string;
  r2SecretAccessKey?: string;
  r2BucketName?: string;
}

const secretMappings: Record<keyof SecretsConfig, string> = {
  turnstileSiteKey: 'cloudflare-tenx-turnstile-sitekey',
  turnstileSecretKey: 'cloudflare-tenx-turnstile-secretkey',
  brevoSmtpKey: 'brevo-tenxdev-smtp-iey',
  telegramBotToken: 'telegram-bot-token',
  telegramChatId: 'telegram-chat-id',
  anthropicApiKey: 'claude-tenx-api-key',
  googleCalendarId: 'google-calendar-id-tenxdev',
  jwtSecret: 'jwt-secret-tenxdev',
  r2AccountId: 'r2-account-id',
  r2AccessKeyId: 'r2-access-key-id',
  r2SecretAccessKey: 'r2-secret-access-key',
  r2BucketName: 'r2-bucket-name',
};

export const secrets: SecretsConfig = {};

async function getSecret(secretName: string): Promise<string | undefined> {
  const projectId = process.env.GCP_PROJECT_ID;

  if (!projectId) {
    logger.warn('GCP_PROJECT_ID not set, skipping secret fetch');
    return undefined;
  }

  try {
    const name = `projects/${projectId}/secrets/${secretName}/versions/latest`;
    const [version] = await client.accessSecretVersion({ name });

    const payload = version.payload?.data;
    if (payload) {
      if (typeof payload === 'string') {
        return payload;
      }
      // payload is Uint8Array
      return Buffer.from(payload).toString('utf8');
    }
    return undefined;
  } catch (error) {
    logger.error({ error, secretName }, 'Failed to fetch secret from GCP');
    return undefined;
  }
}

export async function loadSecrets(): Promise<void> {
  const projectId = process.env.GCP_PROJECT_ID;

  if (!projectId) {
    logger.info('GCP_PROJECT_ID not set, using environment variables for secrets');
    return;
  }

  logger.info('Loading secrets from GCP Secret Manager...');

  const secretPromises = Object.entries(secretMappings).map(
    async ([key, secretName]) => {
      const value = await getSecret(secretName);
      if (value) {
        secrets[key as keyof SecretsConfig] = value;
        logger.info({ secretName }, 'Secret loaded successfully');
      }
    }
  );

  await Promise.all(secretPromises);
  logger.info('Secrets loading complete');
}

export function getSecretValue(key: keyof SecretsConfig, envFallback?: string): string {
  return secrets[key] || envFallback || '';
}
