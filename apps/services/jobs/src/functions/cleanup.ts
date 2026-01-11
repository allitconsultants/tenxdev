import { inngest } from '../inngest.js';
import { db, notifications, activityLogs, lt, and, eq } from '@tenxdev/database';
import { logger } from '@tenxdev/service-utils';

// Clean up old read notifications (older than 90 days)
export const cleanupOldNotifications = inngest.createFunction(
  { id: 'cleanup-old-notifications', name: 'Cleanup Old Notifications' },
  { cron: '0 4 * * 0' }, // 4 AM Sunday
  async ({ step }) => {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const deletedCount = await step.run('delete-old-notifications', async () => {
      const result = await db
        .delete(notifications)
        .where(
          and(
            eq(notifications.isRead, true),
            lt(notifications.createdAt, ninetyDaysAgo)
          )
        )
        .returning();

      return result.length;
    });

    logger.info({ deletedCount }, 'Cleaned up old notifications');

    return { deletedCount };
  }
);

// Archive old activity logs (older than 1 year)
export const archiveOldActivityLogs = inngest.createFunction(
  { id: 'archive-old-activity-logs', name: 'Archive Old Activity Logs' },
  { cron: '0 5 1 * *' }, // 5 AM first day of month
  async ({ step }) => {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    // In production, you'd export to cold storage before deleting
    const archivedCount = await step.run('archive-logs', async () => {
      const logs = await db
        .select()
        .from(activityLogs)
        .where(lt(activityLogs.createdAt, oneYearAgo));

      // TODO: Export to cold storage (S3, etc.)
      logger.info({ count: logs.length }, 'Activity logs to archive');

      return logs.length;
    });

    return { archivedCount };
  }
);

// Generate weekly activity summary
export const generateWeeklySummary = inngest.createFunction(
  { id: 'generate-weekly-summary', name: 'Generate Weekly Summary' },
  { cron: '0 8 * * 1' }, // 8 AM Monday
  async ({ step }) => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // Get activity stats
    const stats = await step.run('get-activity-stats', async () => {
      const activities = await db
        .select()
        .from(activityLogs)
        .where(lt(activityLogs.createdAt, oneWeekAgo));

      const byType: Record<string, number> = {};
      for (const activity of activities) {
        byType[activity.type] = (byType[activity.type] || 0) + 1;
      }

      return {
        total: activities.length,
        byType,
      };
    });

    logger.info({ stats }, 'Weekly activity summary generated');

    return stats;
  }
);
