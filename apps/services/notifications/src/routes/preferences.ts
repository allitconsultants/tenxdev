import { Hono } from 'hono';
import { z } from 'zod';
import { db, notificationPreferences, eq } from '@tenxdev/database';
import { NotFoundError, ValidationError, logger } from '@tenxdev/service-utils';

const preferencesRoutes = new Hono();

const updatePreferencesSchema = z.object({
  emailEnabled: z.boolean().optional(),
  inAppEnabled: z.boolean().optional(),
  webhookEnabled: z.boolean().optional(),
  webhookUrl: z.string().url().optional().nullable(),
  webhookSecret: z.string().optional().nullable(),
  projectUpdates: z.boolean().optional(),
  milestoneAlerts: z.boolean().optional(),
  billingAlerts: z.boolean().optional(),
  domainAlerts: z.boolean().optional(),
  marketingEmails: z.boolean().optional(),
});

// Get preferences for user
preferencesRoutes.get('/user/:userId', async (c) => {
  const userId = c.req.param('userId');

  const result = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId))
    .limit(1);

  if (result.length === 0) {
    // Return defaults if no preferences exist
    return c.json({
      success: true,
      data: {
        userId,
        emailEnabled: true,
        inAppEnabled: true,
        webhookEnabled: false,
        webhookUrl: null,
        projectUpdates: true,
        milestoneAlerts: true,
        billingAlerts: true,
        domainAlerts: true,
        marketingEmails: false,
      },
    });
  }

  return c.json({
    success: true,
    data: result[0],
  });
});

// Create or update preferences
preferencesRoutes.put('/user/:userId', async (c) => {
  const userId = c.req.param('userId');
  const body = await c.req.json();
  const parsed = updatePreferencesSchema.safeParse(body);

  if (!parsed.success) {
    throw new ValidationError(
      'Invalid preferences data',
      parsed.error.flatten().fieldErrors
    );
  }

  const existing = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId))
    .limit(1);

  let result;

  if (existing.length === 0) {
    // Create new preferences
    result = await db
      .insert(notificationPreferences)
      .values({
        userId,
        ...parsed.data,
      })
      .returning();
  } else {
    // Update existing
    result = await db
      .update(notificationPreferences)
      .set({
        ...parsed.data,
        updatedAt: new Date(),
      })
      .where(eq(notificationPreferences.userId, userId))
      .returning();
  }

  logger.info({ userId }, 'Notification preferences updated');

  return c.json({
    success: true,
    data: result[0],
  });
});

// Test webhook
preferencesRoutes.post('/user/:userId/test-webhook', async (c) => {
  const userId = c.req.param('userId');

  const prefs = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId))
    .limit(1);

  if (prefs.length === 0 || !prefs[0].webhookUrl) {
    throw new NotFoundError('Webhook URL not configured');
  }

  const testPayload = {
    event: 'test',
    data: {
      message: 'This is a test webhook from TenxDev',
      timestamp: new Date().toISOString(),
    },
    timestamp: new Date().toISOString(),
  };

  try {
    const response = await fetch(prefs[0].webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Event': 'test',
      },
      body: JSON.stringify(testPayload),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return c.json({
        success: false,
        message: `Webhook returned ${response.status}`,
      });
    }

    return c.json({
      success: true,
      message: 'Test webhook sent successfully',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return c.json({
      success: false,
      message: `Webhook delivery failed: ${errorMessage}`,
    });
  }
});

export { preferencesRoutes };
