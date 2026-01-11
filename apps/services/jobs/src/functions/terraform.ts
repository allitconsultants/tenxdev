import { inngest } from '../inngest.js';
import { db, cloudAccounts, projects, eq } from '@tenxdev/database';
import { logger } from '@tenxdev/service-utils';
import path from 'path';

const CLOUD_PROVISIONER_URL = process.env.CLOUD_PROVISIONER_URL || 'http://localhost:3006';
const NOTIFICATIONS_URL = process.env.NOTIFICATIONS_SERVICE_URL || 'http://localhost:3004';
const TERRAFORM_TEMPLATES_PATH = process.env.TERRAFORM_TEMPLATES_PATH || '/app/terraform/templates';

// Run Terraform Plan
export const runTerraformPlan = inngest.createFunction(
  {
    id: 'terraform-plan',
    name: 'Run Terraform Plan',
    retries: 1,
  },
  { event: 'terraform/plan.requested' },
  async ({ event, step }) => {
    const { accountId, template, variables } = event.data;

    logger.info({ accountId, template }, 'Starting Terraform plan job');

    // Step 1: Get account details
    const account = await step.run('get-account', async () => {
      const result = await db
        .select()
        .from(cloudAccounts)
        .where(eq(cloudAccounts.id, accountId))
        .limit(1);

      if (result.length === 0) {
        throw new Error(`Account not found: ${accountId}`);
      }

      return result[0];
    });

    // Step 2: Update status to planning
    await step.run('update-status-planning', async () => {
      await db
        .update(cloudAccounts)
        .set({
          status: 'provisioning',
          updatedAt: new Date(),
        })
        .where(eq(cloudAccounts.id, accountId));
    });

    // Step 3: Call cloud-provisioner to execute plan
    const planResult = await step.run('execute-plan', async () => {
      const response = await fetch(
        `${CLOUD_PROVISIONER_URL}/api/v1/accounts/${accountId}/terraform/plan`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            template,
            variables,
            workspace: account.terraformWorkspace,
            provider: account.provider,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Terraform plan failed: ${error}`);
      }

      return response.json();
    });

    // Step 4: Store plan output
    await step.run('store-plan-output', async () => {
      await db
        .update(cloudAccounts)
        .set({
          status: 'active',
          updatedAt: new Date(),
        })
        .where(eq(cloudAccounts.id, accountId));
    });

    // Step 5: Get project for notification
    const project = await step.run('get-project', async () => {
      if (!account.projectId) return null;

      const result = await db
        .select()
        .from(projects)
        .where(eq(projects.id, account.projectId))
        .limit(1);

      return result[0] || null;
    });

    // Step 6: Send notification
    if (project) {
      await step.run('send-notification', async () => {
        await fetch(`${NOTIFICATIONS_URL}/api/v1/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: project.clientUserId,
            type: 'terraform_plan_complete',
            title: 'Infrastructure Plan Ready',
            message: `Terraform plan completed for ${project.name}. Review the changes before applying.`,
            link: `/cloud/accounts/${accountId}`,
          }),
        });
      });
    }

    logger.info({ accountId, planResult }, 'Terraform plan completed');

    return {
      success: true,
      accountId,
      planResult,
    };
  }
);

// Run Terraform Apply
export const runTerraformApply = inngest.createFunction(
  {
    id: 'terraform-apply',
    name: 'Run Terraform Apply',
    retries: 0, // Don't retry apply operations
  },
  { event: 'terraform/apply.requested' },
  async ({ event, step }) => {
    const { accountId, planFile } = event.data;

    logger.info({ accountId }, 'Starting Terraform apply job');

    // Step 1: Get account details
    const account = await step.run('get-account', async () => {
      const result = await db
        .select()
        .from(cloudAccounts)
        .where(eq(cloudAccounts.id, accountId))
        .limit(1);

      if (result.length === 0) {
        throw new Error(`Account not found: ${accountId}`);
      }

      return result[0];
    });

    // Step 2: Update status to applying
    await step.run('update-status-applying', async () => {
      await db
        .update(cloudAccounts)
        .set({
          status: 'provisioning',
          updatedAt: new Date(),
        })
        .where(eq(cloudAccounts.id, accountId));
    });

    // Step 3: Call cloud-provisioner to execute apply
    const applyResult = await step.run('execute-apply', async () => {
      const response = await fetch(
        `${CLOUD_PROVISIONER_URL}/api/v1/accounts/${accountId}/terraform/apply`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            planFile,
            workspace: account.terraformWorkspace,
            provider: account.provider,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Terraform apply failed: ${error}`);
      }

      return response.json();
    });

    // Step 4: Update status and store outputs
    await step.run('update-status-complete', async () => {
      await db
        .update(cloudAccounts)
        .set({
          status: 'active',
          lastTerraformRun: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(cloudAccounts.id, accountId));
    });

    // Step 5: Sync resources after apply
    await step.run('sync-resources', async () => {
      await fetch(
        `${CLOUD_PROVISIONER_URL}/api/v1/accounts/${accountId}/resources/sync`,
        { method: 'POST' }
      );
    });

    // Step 6: Get project for notification
    const project = await step.run('get-project', async () => {
      if (!account.projectId) return null;

      const result = await db
        .select()
        .from(projects)
        .where(eq(projects.id, account.projectId))
        .limit(1);

      return result[0] || null;
    });

    // Step 7: Send notification
    if (project) {
      await step.run('send-notification', async () => {
        await fetch(`${NOTIFICATIONS_URL}/api/v1/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: project.clientUserId,
            type: 'terraform_apply_complete',
            title: 'Infrastructure Deployed',
            message: `Infrastructure has been successfully deployed for ${project.name}.`,
            link: `/cloud/accounts/${accountId}`,
            emailTemplate: 'infrastructure-deployed',
            emailVariables: {
              projectName: project.name,
              provider: account.provider,
            },
          }),
        });
      });
    }

    logger.info({ accountId, applyResult }, 'Terraform apply completed');

    return {
      success: true,
      accountId,
      applyResult,
    };
  }
);

// Run Terraform Destroy
export const runTerraformDestroy = inngest.createFunction(
  {
    id: 'terraform-destroy',
    name: 'Run Terraform Destroy',
    retries: 0, // Don't retry destroy operations
  },
  { event: 'terraform/destroy.requested' },
  async ({ event, step }) => {
    const { accountId, confirmed } = event.data;

    logger.warn({ accountId, confirmed }, 'Starting Terraform destroy job');

    // Step 1: Verify confirmation
    if (!confirmed) {
      throw new Error('Destroy not confirmed - aborting');
    }

    // Step 2: Get account details
    const account = await step.run('get-account', async () => {
      const result = await db
        .select()
        .from(cloudAccounts)
        .where(eq(cloudAccounts.id, accountId))
        .limit(1);

      if (result.length === 0) {
        throw new Error(`Account not found: ${accountId}`);
      }

      return result[0];
    });

    // Step 3: Update status to destroying
    await step.run('update-status-destroying', async () => {
      await db
        .update(cloudAccounts)
        .set({
          status: 'provisioning',
          updatedAt: new Date(),
        })
        .where(eq(cloudAccounts.id, accountId));
    });

    // Step 4: Call cloud-provisioner to execute destroy
    const destroyResult = await step.run('execute-destroy', async () => {
      const response = await fetch(
        `${CLOUD_PROVISIONER_URL}/api/v1/accounts/${accountId}/terraform/destroy`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspace: account.terraformWorkspace,
            provider: account.provider,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Terraform destroy failed: ${error}`);
      }

      return response.json();
    });

    // Step 5: Update status
    await step.run('update-status-destroyed', async () => {
      await db
        .update(cloudAccounts)
        .set({
          status: 'failed', // Mark as destroyed/inactive
          lastTerraformRun: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(cloudAccounts.id, accountId));
    });

    // Step 6: Get project for notification
    const project = await step.run('get-project', async () => {
      if (!account.projectId) return null;

      const result = await db
        .select()
        .from(projects)
        .where(eq(projects.id, account.projectId))
        .limit(1);

      return result[0] || null;
    });

    // Step 7: Send notification
    if (project) {
      await step.run('send-notification', async () => {
        await fetch(`${NOTIFICATIONS_URL}/api/v1/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: project.clientUserId,
            type: 'terraform_destroy_complete',
            title: 'Infrastructure Destroyed',
            message: `Infrastructure has been destroyed for ${project.name}.`,
            link: `/cloud/accounts/${accountId}`,
          }),
        });
      });
    }

    logger.warn({ accountId, destroyResult }, 'Terraform destroy completed');

    return {
      success: true,
      accountId,
      destroyResult,
    };
  }
);
