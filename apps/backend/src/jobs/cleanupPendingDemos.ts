import { calendarService } from '../services/calendarService.js';
import { logger } from '../utils/logger.js';
import { loadSecrets } from '../config/secrets.js';

const PENDING_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour in milliseconds

export async function cleanupPendingDemos(): Promise<void> {
  logger.info('Starting pending demos cleanup job');

  try {
    const pendingEvents = await calendarService.getPendingEvents();
    logger.info({ count: pendingEvents.length }, 'Found pending demo events');

    const now = Date.now();
    let deletedCount = 0;

    for (const event of pendingEvents) {
      const createdAt = new Date(event.createdAt).getTime();
      const ageMs = now - createdAt;

      if (ageMs > PENDING_TIMEOUT_MS) {
        logger.info(
          {
            eventId: event.eventId,
            summary: event.summary,
            createdAt: event.createdAt,
            ageMinutes: Math.round(ageMs / 60000),
          },
          'Deleting expired pending demo'
        );

        const deleted = await calendarService.deleteEvent(event.eventId);
        if (deleted) {
          deletedCount++;
        }
      }
    }

    logger.info({ deletedCount }, 'Pending demos cleanup completed');
  } catch (error) {
    logger.error({ error }, 'Error during pending demos cleanup');
    throw error;
  }
}

// CLI entry point for Kubernetes CronJob
export async function runCleanupJob(): Promise<void> {
  try {
    await loadSecrets();
    await cleanupPendingDemos();
    process.exit(0);
  } catch (error) {
    logger.error({ error }, 'Cleanup job failed');
    process.exit(1);
  }
}
