import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

interface TelegramResponse {
  ok: boolean;
  result?: {
    message_id: number;
  };
  description?: string;
}

export const telegramService = {
  async sendMessage(text: string): Promise<boolean> {
    if (!config.telegramBotToken || !config.telegramChatId) {
      logger.warn('Telegram not configured, skipping message');
      return true; // Allow in development
    }

    try {
      const response = await fetch(
        `https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chat_id: config.telegramChatId,
            text,
            parse_mode: 'HTML',
          }),
        }
      );

      const data = (await response.json()) as TelegramResponse;

      if (!data.ok) {
        logger.error({ error: data.description }, 'Telegram send failed');
        return false;
      }

      logger.info({ messageId: data.result?.message_id }, 'Telegram message sent');
      return true;
    } catch (error) {
      logger.error({ error }, 'Telegram send error');
      return false;
    }
  },

  async notifyNewChat(message: string, metadata?: { ip?: string; userAgent?: string }): Promise<boolean> {
    const formattedMessage = `
<b>🗨️ New Chat Message</b>

<b>Message:</b>
${escapeHtml(message)}

<b>Metadata:</b>
• IP: ${metadata?.ip || 'Unknown'}
• Time: ${new Date().toISOString()}
• User Agent: ${metadata?.userAgent?.substring(0, 100) || 'Unknown'}

<i>Reply via the admin dashboard or Telegram bot.</i>
    `.trim();

    return this.sendMessage(formattedMessage);
  },
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
