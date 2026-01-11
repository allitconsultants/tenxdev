import { Hono } from 'hono';
import { z } from 'zod';
import { db, notifications, notificationPreferences, users, eq } from '@tenxdev/database';
import { ValidationError, logger } from '@tenxdev/service-utils';
import { emailProvider } from '../providers/email.js';
import { webhookProvider } from '../providers/webhook.js';

const sendRoutes = new Hono();

const sendNotificationSchema = z.object({
  // Either userId or email is required
  userId: z.string().uuid().optional(),
  email: z.string().email().optional(),
  organizationId: z.string().uuid().optional(),
  type: z.enum([
    'project_update',
    'milestone_completed',
    'invoice_sent',
    'payment_received',
    'payment_due',
    'domain_expiring',
    'transfer_ready',
    'transfer_update',
    'document_signed',
    'signature_requested',
    'signature_declined',
    'terraform_plan_complete',
    'terraform_apply_complete',
    'terraform_destroy_complete',
    'system',
  ]),
  title: z.string().min(1).max(255),
  message: z.string(),
  link: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  emailTemplate: z.string().optional(),
  emailVariables: z.record(z.string()).optional(),
}).refine(
  (data) => data.userId || data.email,
  { message: 'Either userId or email is required' }
);

const sendBulkSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1),
  type: z.enum([
    'project_update',
    'milestone_completed',
    'invoice_sent',
    'payment_received',
    'domain_expiring',
    'transfer_ready',
    'system',
  ]),
  title: z.string().min(1).max(255),
  message: z.string(),
  link: z.string().url().optional(),
});

// Send notification to user (handles all channels based on preferences)
sendRoutes.post('/', async (c) => {
  const body = await c.req.json();
  const parsed = sendNotificationSchema.safeParse(body);

  if (!parsed.success) {
    throw new ValidationError('Invalid notification data', parsed.error.flatten().fieldErrors);
  }

  const { userId, email, organizationId, type, title, message, link, metadata, emailTemplate, emailVariables } = parsed.data;

  const results = {
    inApp: false,
    email: false,
    webhook: false,
  };

  // If sending to direct email (no userId), just send the email
  if (email && !userId) {
    if (emailTemplate && emailVariables) {
      try {
        await emailProvider.sendTemplate(email, emailTemplate, emailVariables);
        results.email = true;
      } catch (error) {
        logger.error({ email, error }, 'Failed to send email notification');
      }
    }

    logger.info({ email, type, results }, 'Email notification sent');

    return c.json({
      success: true,
      data: results,
    });
  }

  // If we have a userId, get user preferences and send through all channels
  if (!userId) {
    throw new ValidationError('userId is required for in-app notifications');
  }

  // Get user preferences
  const prefs = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId))
    .limit(1);

  const preferences = prefs[0] || {
    emailEnabled: true,
    inAppEnabled: true,
    webhookEnabled: false,
    webhookUrl: null,
    webhookSecret: null,
    projectUpdates: true,
    milestoneAlerts: true,
    billingAlerts: true,
    domainAlerts: true,
  };

  // Check if this notification type is enabled
  const typeEnabled = isNotificationTypeEnabled(type, preferences);

  // Create in-app notification if enabled
  if (preferences.inAppEnabled && typeEnabled) {
    await db.insert(notifications).values({
      userId,
      organizationId,
      type,
      title,
      message,
      link,
      metadata,
    });
    results.inApp = true;
  }

  // Send email if enabled
  if (preferences.emailEnabled && typeEnabled && emailTemplate && emailVariables) {
    try {
      // Get user email
      const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (user.length > 0) {
        await emailProvider.sendTemplate(user[0].email, emailTemplate, emailVariables);
        results.email = true;
      }
    } catch (error) {
      logger.error({ userId, error }, 'Failed to send email notification');
    }
  }

  // Send webhook if enabled
  if (preferences.webhookEnabled && preferences.webhookUrl && typeEnabled) {
    try {
      const webhookResult = await webhookProvider.deliver(
        preferences.webhookUrl,
        {
          event: type,
          data: { title, message, link, metadata },
          timestamp: new Date().toISOString(),
        },
        preferences.webhookSecret || undefined
      );
      results.webhook = webhookResult.success;
    } catch (error) {
      logger.error({ userId, error }, 'Failed to send webhook notification');
    }
  }

  logger.info({ userId, type, results }, 'Notification sent');

  return c.json({
    success: true,
    data: results,
  });
});

// Send bulk notifications
sendRoutes.post('/bulk', async (c) => {
  const body = await c.req.json();
  const parsed = sendBulkSchema.safeParse(body);

  if (!parsed.success) {
    throw new ValidationError('Invalid bulk notification data', parsed.error.flatten().fieldErrors);
  }

  const { userIds, type, title, message, link } = parsed.data;

  // Create in-app notifications for all users
  const notificationValues = userIds.map((userId) => ({
    userId,
    type,
    title,
    message,
    link,
  }));

  await db.insert(notifications).values(notificationValues);

  logger.info({ userCount: userIds.length, type }, 'Bulk notifications sent');

  return c.json({
    success: true,
    data: { sentCount: userIds.length },
  });
});

function isNotificationTypeEnabled(
  type: string,
  preferences: {
    projectUpdates?: boolean;
    milestoneAlerts?: boolean;
    billingAlerts?: boolean;
    domainAlerts?: boolean;
  }
): boolean {
  switch (type) {
    case 'project_update':
      return preferences.projectUpdates !== false;
    case 'milestone_completed':
      return preferences.milestoneAlerts !== false;
    case 'invoice_sent':
    case 'payment_received':
    case 'payment_due':
      return preferences.billingAlerts !== false;
    case 'domain_expiring':
      return preferences.domainAlerts !== false;
    // Transfer and infrastructure notifications always enabled
    case 'transfer_ready':
    case 'transfer_update':
    case 'terraform_plan_complete':
    case 'terraform_apply_complete':
    case 'terraform_destroy_complete':
    // Document signature notifications always enabled
    case 'document_signed':
    case 'signature_requested':
    case 'signature_declined':
    case 'system':
      return true;
    default:
      return true;
  }
}

export { sendRoutes };
