import { inngest } from '../inngest.js';
import { db, cloudAccounts, projects, eq } from '@tenxdev/database';
import { logger } from '@tenxdev/service-utils';

// Sync cloud resources daily
export const syncCloudResources = inngest.createFunction(
  { id: 'sync-cloud-resources', name: 'Sync Cloud Resources' },
  { cron: '0 2 * * *' }, // 2 AM daily
  async ({ step }) => {
    const accounts = await step.run('get-active-accounts', async () => {
      return db.select().from(cloudAccounts).where(eq(cloudAccounts.status, 'active'));
    });

    logger.info({ count: accounts.length }, 'Syncing cloud resources for accounts');

    for (const account of accounts) {
      await step.run(`sync-account-${account.id}`, async () => {
        // Call cloud provisioner to sync resources
        const response = await fetch(
          `${process.env.CLOUD_PROVISIONER_URL}/api/v1/accounts/${account.id}/resources/sync`,
          { method: 'POST' }
        );

        if (response.ok) {
          logger.info({ accountId: account.id }, 'Cloud resources synced');
        } else {
          logger.error({ accountId: account.id }, 'Failed to sync cloud resources');
        }
      });
    }

    return { processed: accounts.length };
  }
);

// Sync cloud costs weekly
export const syncCloudCosts = inngest.createFunction(
  { id: 'sync-cloud-costs', name: 'Sync Cloud Costs' },
  { cron: '0 3 * * 0' }, // 3 AM Sunday
  async ({ step }) => {
    const accounts = await step.run('get-active-accounts', async () => {
      return db.select().from(cloudAccounts).where(eq(cloudAccounts.status, 'active'));
    });

    logger.info({ count: accounts.length }, 'Syncing cloud costs for accounts');

    for (const account of accounts) {
      await step.run(`sync-costs-${account.id}`, async () => {
        // Call cloud provisioner to sync costs
        const response = await fetch(
          `${process.env.CLOUD_PROVISIONER_URL}/api/v1/accounts/${account.id}/costs/sync`,
          { method: 'POST' }
        );

        if (response.ok) {
          logger.info({ accountId: account.id }, 'Cloud costs synced');
        } else {
          logger.error({ accountId: account.id }, 'Failed to sync cloud costs');
        }
      });
    }

    return { processed: accounts.length };
  }
);

// Execute transfer workflow
export const executeTransfer = inngest.createFunction(
  { id: 'execute-transfer', name: 'Execute Cloud Transfer' },
  { event: 'cloud/transfer.initiated' },
  async ({ event, step }) => {
    const { accountId, transferId, projectId } = event.data;

    logger.info({ accountId, transferId }, 'Starting cloud transfer workflow');

    // Step 1: Verify all checklist items completed
    await step.run('verify-checklist', async () => {
      const response = await fetch(
        `${process.env.CLOUD_PROVISIONER_URL}/api/v1/accounts/${accountId}/transfer`
      );
      const data = await response.json();

      const incompleteItems = data.data.checklist.filter(
        (item: { completed: boolean }) => !item.completed
      );

      if (incompleteItems.length > 0) {
        throw new Error(`Transfer blocked: ${incompleteItems.length} checklist items incomplete`);
      }
    });

    // Step 2: Remove TenxDev IAM users
    await step.run('remove-iam-users', async () => {
      await fetch(
        `${process.env.CLOUD_PROVISIONER_URL}/api/v1/accounts/${accountId}/transfer/remove-iam-users`,
        { method: 'POST' }
      );
    });

    // Step 3: Remove management role
    await step.run('remove-management-role', async () => {
      await fetch(
        `${process.env.CLOUD_PROVISIONER_URL}/api/v1/accounts/${accountId}/transfer/remove-role`,
        { method: 'POST' }
      );
    });

    // Step 4: Generate handover documentation
    await step.run('generate-documentation', async () => {
      await fetch(
        `${process.env.CLOUD_PROVISIONER_URL}/api/v1/accounts/${accountId}/transfer/documentation`,
        { method: 'POST' }
      );
    });

    // Step 5: Update account status
    await step.run('finalize-transfer', async () => {
      await db
        .update(cloudAccounts)
        .set({
          status: 'transferred',
          updatedAt: new Date(),
        })
        .where(eq(cloudAccounts.id, accountId));

      // Update project status
      if (projectId) {
        await db
          .update(projects)
          .set({
            status: 'transferred',
            updatedAt: new Date(),
          })
          .where(eq(projects.id, projectId));
      }
    });

    // Step 6: Send notification
    await step.run('send-notification', async () => {
      const project = await db
        .select()
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1);

      if (project.length > 0) {
        await fetch(`${process.env.NOTIFICATIONS_SERVICE_URL}/api/v1/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: project[0].clientUserId,
            type: 'transfer_ready',
            title: 'Transfer Complete',
            message: `Your cloud infrastructure for ${project[0].name} has been transferred to your account.`,
            link: `/cloud/accounts/${accountId}`,
            emailTemplate: 'transfer-complete',
            emailVariables: {
              projectName: project[0].name,
              documentationUrl: `${process.env.PORTAL_URL}/cloud/accounts/${accountId}/documentation`,
            },
          }),
        });
      }
    });

    logger.info({ accountId, transferId }, 'Cloud transfer completed');

    return { success: true, accountId, transferId };
  }
);
