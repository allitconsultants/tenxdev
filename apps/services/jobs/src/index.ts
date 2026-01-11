import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve as inngestServe } from 'inngest/hono';
import { errorHandler, requestLogger, logger } from '@tenxdev/service-utils';
import { inngest } from './inngest.js';

// Import all functions
import { checkOverdueInvoices, sendInvoiceReminders } from './functions/billing.js';
import { checkExpiringDomains, autoRenewDomains } from './functions/domains.js';
import { syncCloudResources, syncCloudCosts, executeTransfer } from './functions/cloud.js';
import { runTerraformPlan, runTerraformApply, runTerraformDestroy } from './functions/terraform.js';
import {
  checkStaleProjects,
  checkOverdueMilestones,
  notifyMilestoneCompleted,
} from './functions/projects.js';
import {
  cleanupOldNotifications,
  archiveOldActivityLogs,
  generateWeeklySummary,
} from './functions/cleanup.js';

const app = new Hono();

// Middleware
app.use('*', cors());
app.use('*', requestLogger);

// Health check
app.get('/health', (c) => c.json({ status: 'healthy', service: 'jobs' }));

// Inngest endpoint
app.on(
  ['GET', 'POST', 'PUT'],
  '/api/inngest',
  inngestServe({
    client: inngest,
    functions: [
      // Billing
      checkOverdueInvoices,
      sendInvoiceReminders,
      // Domains
      checkExpiringDomains,
      autoRenewDomains,
      // Cloud
      syncCloudResources,
      syncCloudCosts,
      executeTransfer,
      // Terraform
      runTerraformPlan,
      runTerraformApply,
      runTerraformDestroy,
      // Projects
      checkStaleProjects,
      checkOverdueMilestones,
      notifyMilestoneCompleted,
      // Cleanup
      cleanupOldNotifications,
      archiveOldActivityLogs,
      generateWeeklySummary,
    ],
  })
);

// Manual trigger endpoints for testing
app.post('/api/v1/trigger/:functionId', async (c) => {
  const functionId = c.req.param('functionId');
  const body = await c.req.json().catch(() => ({}));

  // Map function IDs to events
  const eventMap: Record<string, string> = {
    'execute-transfer': 'cloud/transfer.initiated',
    'notify-milestone-completed': 'project/milestone.completed',
    'terraform-plan': 'terraform/plan.requested',
    'terraform-apply': 'terraform/apply.requested',
    'terraform-destroy': 'terraform/destroy.requested',
  };

  const eventName = eventMap[functionId];

  if (eventName) {
    await inngest.send({
      name: eventName,
      data: body,
    });

    return c.json({
      success: true,
      message: `Event ${eventName} sent`,
    });
  }

  return c.json(
    {
      success: false,
      message: 'Unknown function',
    },
    400
  );
});

// Error handler
app.onError(errorHandler);

const port = parseInt(process.env.PORT || '3007', 10);

serve({ fetch: app.fetch, port }, () => {
  logger.info({ port }, 'Jobs service started');
});

export default app;
