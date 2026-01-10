// Entry point for Kubernetes CronJob
import { runCleanupJob } from './cleanupPendingDemos.js';

runCleanupJob();
