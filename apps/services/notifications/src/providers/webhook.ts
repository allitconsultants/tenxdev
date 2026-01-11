import { logger } from '@tenxdev/service-utils';

export interface WebhookPayload {
  event: string;
  data: Record<string, unknown>;
  timestamp: string;
}

export interface WebhookDeliveryResult {
  success: boolean;
  statusCode?: number;
  error?: string;
  duration: number;
}

export const webhookProvider = {
  async deliver(
    url: string,
    payload: WebhookPayload,
    secret?: string
  ): Promise<WebhookDeliveryResult> {
    const startTime = Date.now();

    try {
      const body = JSON.stringify(payload);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Webhook-Event': payload.event,
        'X-Webhook-Timestamp': payload.timestamp,
      };

      if (secret) {
        const signature = await generateSignature(body, secret);
        headers['X-Webhook-Signature'] = signature;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body,
        signal: AbortSignal.timeout(30000),
      });

      const duration = Date.now() - startTime;

      if (!response.ok) {
        logger.warn(
          { url, statusCode: response.status, event: payload.event },
          'Webhook delivery failed'
        );
        return {
          success: false,
          statusCode: response.status,
          error: `HTTP ${response.status}`,
          duration,
        };
      }

      logger.info(
        { url, statusCode: response.status, event: payload.event, duration },
        'Webhook delivered successfully'
      );

      return {
        success: true,
        statusCode: response.status,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.error(
        { url, event: payload.event, error: errorMessage },
        'Webhook delivery error'
      );

      return {
        success: false,
        error: errorMessage,
        duration,
      };
    }
  },
};

async function generateSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const hashArray = Array.from(new Uint8Array(signature));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  return `sha256=${hashHex}`;
}
