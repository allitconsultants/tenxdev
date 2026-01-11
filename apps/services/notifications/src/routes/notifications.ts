import { Hono } from 'hono';
import { z } from 'zod';
import { db, notifications, eq, desc, and } from '@tenxdev/database';
import { NotFoundError, ValidationError, logger } from '@tenxdev/service-utils';

const notificationsRoutes = new Hono();

const createNotificationSchema = z.object({
  userId: z.string().uuid(),
  organizationId: z.string().uuid().optional(),
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
  metadata: z.record(z.unknown()).optional(),
});

// List notifications for user
notificationsRoutes.get('/user/:userId', async (c) => {
  const userId = c.req.param('userId');
  const unreadOnly = c.req.query('unreadOnly') === 'true';
  const limit = parseInt(c.req.query('limit') || '50', 10);

  const whereCondition = unreadOnly
    ? and(eq(notifications.userId, userId), eq(notifications.isRead, false))
    : eq(notifications.userId, userId);

  const result = await db
    .select()
    .from(notifications)
    .where(whereCondition)
    .orderBy(desc(notifications.createdAt))
    .limit(limit);

  return c.json({
    success: true,
    data: result,
  });
});

// Get unread count
notificationsRoutes.get('/user/:userId/unread-count', async (c) => {
  const userId = c.req.param('userId');

  const result = await db
    .select()
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));

  return c.json({
    success: true,
    data: { count: result.length },
  });
});

// Create notification
notificationsRoutes.post('/', async (c) => {
  const body = await c.req.json();
  const parsed = createNotificationSchema.safeParse(body);

  if (!parsed.success) {
    throw new ValidationError(
      'Invalid notification data',
      parsed.error.flatten().fieldErrors
    );
  }

  const result = await db
    .insert(notifications)
    .values({
      userId: parsed.data.userId,
      organizationId: parsed.data.organizationId,
      type: parsed.data.type,
      title: parsed.data.title,
      message: parsed.data.message,
      link: parsed.data.link,
      metadata: parsed.data.metadata,
    })
    .returning();

  logger.info(
    { userId: parsed.data.userId, type: parsed.data.type },
    'Notification created'
  );

  return c.json(
    {
      success: true,
      data: result[0],
    },
    201
  );
});

// Mark as read
notificationsRoutes.patch('/:id/read', async (c) => {
  const id = c.req.param('id');

  const existing = await db
    .select()
    .from(notifications)
    .where(eq(notifications.id, id))
    .limit(1);

  if (existing.length === 0) {
    throw new NotFoundError('Notification not found');
  }

  await db
    .update(notifications)
    .set({
      isRead: true,
      readAt: new Date(),
    })
    .where(eq(notifications.id, id));

  return c.json({
    success: true,
    message: 'Notification marked as read',
  });
});

// Mark all as read for user
notificationsRoutes.patch('/user/:userId/read-all', async (c) => {
  const userId = c.req.param('userId');

  await db
    .update(notifications)
    .set({
      isRead: true,
      readAt: new Date(),
    })
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));

  logger.info({ userId }, 'All notifications marked as read');

  return c.json({
    success: true,
    message: 'All notifications marked as read',
  });
});

// Delete notification
notificationsRoutes.delete('/:id', async (c) => {
  const id = c.req.param('id');

  const existing = await db
    .select()
    .from(notifications)
    .where(eq(notifications.id, id))
    .limit(1);

  if (existing.length === 0) {
    throw new NotFoundError('Notification not found');
  }

  await db.delete(notifications).where(eq(notifications.id, id));

  return c.json({
    success: true,
    message: 'Notification deleted',
  });
});

export { notificationsRoutes };
