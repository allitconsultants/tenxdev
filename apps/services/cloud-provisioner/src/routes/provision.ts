import { Hono } from 'hono';
import { z } from 'zod';
import { db, cloudAccounts, projects, eq } from '@tenxdev/database';
import { NotFoundError, ValidationError, logger } from '@tenxdev/service-utils';
import { Inngest } from 'inngest';
import path from 'path';
import { TerraformExecutor } from '../terraform/executor.js';

const provisionRoutes = new Hono();

// Inngest client for triggering jobs
const inngest = new Inngest({
  id: 'cloud-provisioner',
  eventKey: process.env.INNGEST_EVENT_KEY,
});

const terraformExecutor = new TerraformExecutor();

const TERRAFORM_TEMPLATES_PATH = process.env.TERRAFORM_TEMPLATES_PATH ||
  path.join(process.cwd(), '..', '..', '..', 'terraform', 'templates');

const provisionSchema = z.object({
  template: z.enum(['full-stack', 'api-only', 'frontend-only']).default('full-stack'),
  variables: z.record(z.string()).optional(),
});

const destroySchema = z.object({
  confirmed: z.boolean(),
});

const terraformExecuteSchema = z.object({
  template: z.enum(['full-stack', 'api-only', 'frontend-only']).optional(),
  variables: z.record(z.string()).optional(),
  workspace: z.string(),
  provider: z.enum(['aws', 'gcp', 'azure']),
  planFile: z.string().optional(),
});

// Get provisioning status
provisionRoutes.get('/:id/provision/status', async (c) => {
  const id = c.req.param('id');

  const account = await db
    .select()
    .from(cloudAccounts)
    .where(eq(cloudAccounts.id, id))
    .limit(1);

  if (account.length === 0) {
    throw new NotFoundError('Cloud account not found');
  }

  return c.json({
    success: true,
    data: {
      status: account[0].status,
      lastRun: account[0].lastTerraformRun,
      workspace: account[0].terraformWorkspace,
      stateKey: account[0].terraformStateKey,
    },
  });
});

// Trigger provisioning (plan + apply)
provisionRoutes.post('/:id/provision', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = provisionSchema.safeParse(body);

  if (!parsed.success) {
    throw new ValidationError('Invalid provision data', parsed.error.flatten().fieldErrors);
  }

  const account = await db
    .select()
    .from(cloudAccounts)
    .where(eq(cloudAccounts.id, id))
    .limit(1);

  if (account.length === 0) {
    throw new NotFoundError('Cloud account not found');
  }

  // Get project for variables
  let projectName = 'unknown';
  if (account[0].projectId) {
    const project = await db
      .select()
      .from(projects)
      .where(eq(projects.id, account[0].projectId))
      .limit(1);

    if (project.length > 0) {
      projectName = project[0].slug || project[0].name;
    }
  }

  // Build variables
  const variables = {
    project_name: projectName,
    environment: account[0].environment || 'staging',
    cloud_provider: account[0].provider,
    region: account[0].region || 'us-east-1',
    ...parsed.data.variables,
  };

  // Trigger Inngest job for plan
  const eventId = await inngest.send({
    name: 'terraform/plan.requested',
    data: {
      accountId: id,
      template: parsed.data.template,
      variables,
    },
  });

  logger.info({ accountId: id, template: parsed.data.template, eventId }, 'Terraform plan job triggered');

  return c.json({
    success: true,
    message: 'Provisioning started - plan in progress',
    data: {
      jobId: eventId.ids[0],
    },
  });
});

// Run Terraform plan
provisionRoutes.post('/:id/provision/plan', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const parsed = provisionSchema.safeParse(body);

  const account = await db
    .select()
    .from(cloudAccounts)
    .where(eq(cloudAccounts.id, id))
    .limit(1);

  if (account.length === 0) {
    throw new NotFoundError('Cloud account not found');
  }

  if (!account[0].terraformWorkspace) {
    throw new ValidationError('No Terraform workspace configured');
  }

  // Get project for variables
  let projectName = 'unknown';
  if (account[0].projectId) {
    const project = await db
      .select()
      .from(projects)
      .where(eq(projects.id, account[0].projectId))
      .limit(1);

    if (project.length > 0) {
      projectName = project[0].slug || project[0].name;
    }
  }

  const template = parsed.success ? parsed.data.template : 'full-stack';
  const variables = {
    project_name: projectName,
    environment: account[0].environment || 'staging',
    cloud_provider: account[0].provider,
    region: account[0].region || 'us-east-1',
    ...(parsed.success ? parsed.data.variables : {}),
  };

  // Trigger Inngest job
  const eventId = await inngest.send({
    name: 'terraform/plan.requested',
    data: {
      accountId: id,
      template,
      variables,
    },
  });

  logger.info({ accountId: id, eventId }, 'Terraform plan job triggered');

  return c.json({
    success: true,
    message: 'Plan started',
    data: {
      jobId: eventId.ids[0],
    },
  });
});

// Apply Terraform changes
provisionRoutes.post('/:id/provision/apply', async (c) => {
  const id = c.req.param('id');

  const account = await db
    .select()
    .from(cloudAccounts)
    .where(eq(cloudAccounts.id, id))
    .limit(1);

  if (account.length === 0) {
    throw new NotFoundError('Cloud account not found');
  }

  // Trigger Inngest job
  const eventId = await inngest.send({
    name: 'terraform/apply.requested',
    data: {
      accountId: id,
    },
  });

  logger.info({ accountId: id, eventId }, 'Terraform apply job triggered');

  return c.json({
    success: true,
    message: 'Apply started',
    data: {
      jobId: eventId.ids[0],
    },
  });
});

// Destroy infrastructure
provisionRoutes.post('/:id/provision/destroy', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = destroySchema.safeParse(body);

  if (!parsed.success) {
    throw new ValidationError('Confirmation required', { confirmed: ['Must be true to proceed'] });
  }

  if (!parsed.data.confirmed) {
    throw new ValidationError('Destroy not confirmed');
  }

  const account = await db
    .select()
    .from(cloudAccounts)
    .where(eq(cloudAccounts.id, id))
    .limit(1);

  if (account.length === 0) {
    throw new NotFoundError('Cloud account not found');
  }

  // Trigger Inngest job
  const eventId = await inngest.send({
    name: 'terraform/destroy.requested',
    data: {
      accountId: id,
      confirmed: true,
    },
  });

  logger.warn({ accountId: id, eventId }, 'Terraform destroy job triggered');

  return c.json({
    success: true,
    message: 'Destroy initiated',
    data: {
      jobId: eventId.ids[0],
    },
  });
});

// ========================================
// Internal endpoints called by jobs service
// ========================================

// Execute Terraform plan (internal)
provisionRoutes.post('/:id/terraform/plan', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = terraformExecuteSchema.safeParse(body);

  if (!parsed.success) {
    throw new ValidationError('Invalid terraform data', parsed.error.flatten().fieldErrors);
  }

  const { template = 'full-stack', variables = {}, workspace, provider } = parsed.data;

  logger.info({ accountId: id, template, workspace }, 'Executing Terraform plan');

  const templatePath = path.join(TERRAFORM_TEMPLATES_PATH, template);

  try {
    // Prepare working directory
    const workdir = await terraformExecutor.prepare({
      templatePath,
      workspace,
      variables,
      backendConfig: {},
      provider: provider as 'aws' | 'gcp' | 'azure',
    });

    // Initialize Terraform
    const initResult = await terraformExecutor.init(workdir);
    if (!initResult.success) {
      await terraformExecutor.cleanup(workdir);
      throw new Error(`Terraform init failed: ${initResult.error}`);
    }

    // Select workspace
    const wsResult = await terraformExecutor.selectWorkspace(workdir, workspace);
    if (!wsResult.success) {
      await terraformExecutor.cleanup(workdir);
      throw new Error(`Workspace selection failed: ${wsResult.error}`);
    }

    // Run plan
    const planResult = await terraformExecutor.plan(workdir);

    // Update account with plan output
    await db
      .update(cloudAccounts)
      .set({
        updatedAt: new Date(),
      })
      .where(eq(cloudAccounts.id, id));

    // Cleanup working directory
    await terraformExecutor.cleanup(workdir);

    return c.json({
      success: planResult.success,
      data: {
        output: planResult.output,
        changes: planResult.changes,
        planFile: planResult.planFile,
      },
    });
  } catch (error) {
    logger.error({ error, accountId: id }, 'Terraform plan failed');
    throw error;
  }
});

// Execute Terraform apply (internal)
provisionRoutes.post('/:id/terraform/apply', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = terraformExecuteSchema.safeParse(body);

  if (!parsed.success) {
    throw new ValidationError('Invalid terraform data', parsed.error.flatten().fieldErrors);
  }

  const { workspace, provider, planFile } = parsed.data;

  logger.info({ accountId: id, workspace }, 'Executing Terraform apply');

  // Get account for template info
  const account = await db
    .select()
    .from(cloudAccounts)
    .where(eq(cloudAccounts.id, id))
    .limit(1);

  if (account.length === 0) {
    throw new NotFoundError('Cloud account not found');
  }

  const templatePath = path.join(TERRAFORM_TEMPLATES_PATH, 'full-stack');

  try {
    // Prepare working directory
    const workdir = await terraformExecutor.prepare({
      templatePath,
      workspace,
      variables: {},
      backendConfig: {},
      provider: provider as 'aws' | 'gcp' | 'azure',
    });

    // Initialize Terraform
    const initResult = await terraformExecutor.init(workdir);
    if (!initResult.success) {
      await terraformExecutor.cleanup(workdir);
      throw new Error(`Terraform init failed: ${initResult.error}`);
    }

    // Select workspace
    const wsResult = await terraformExecutor.selectWorkspace(workdir, workspace);
    if (!wsResult.success) {
      await terraformExecutor.cleanup(workdir);
      throw new Error(`Workspace selection failed: ${wsResult.error}`);
    }

    // Run apply
    const applyResult = await terraformExecutor.apply(workdir, planFile);

    // Update account with outputs
    await db
      .update(cloudAccounts)
      .set({
        lastTerraformRun: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(cloudAccounts.id, id));

    // Cleanup
    await terraformExecutor.cleanup(workdir);

    return c.json({
      success: applyResult.success,
      data: {
        output: applyResult.output,
        outputs: applyResult.outputs,
      },
    });
  } catch (error) {
    logger.error({ error, accountId: id }, 'Terraform apply failed');

    // Update status to error
    await db
      .update(cloudAccounts)
      .set({
        status: 'failed',
        updatedAt: new Date(),
      })
      .where(eq(cloudAccounts.id, id));

    throw error;
  }
});

// Execute Terraform destroy (internal)
provisionRoutes.post('/:id/terraform/destroy', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = terraformExecuteSchema.safeParse(body);

  if (!parsed.success) {
    throw new ValidationError('Invalid terraform data', parsed.error.flatten().fieldErrors);
  }

  const { workspace, provider } = parsed.data;

  logger.warn({ accountId: id, workspace }, 'Executing Terraform destroy');

  const templatePath = path.join(TERRAFORM_TEMPLATES_PATH, 'full-stack');

  try {
    // Prepare working directory
    const workdir = await terraformExecutor.prepare({
      templatePath,
      workspace,
      variables: {},
      backendConfig: {},
      provider: provider as 'aws' | 'gcp' | 'azure',
    });

    // Initialize Terraform
    const initResult = await terraformExecutor.init(workdir);
    if (!initResult.success) {
      await terraformExecutor.cleanup(workdir);
      throw new Error(`Terraform init failed: ${initResult.error}`);
    }

    // Select workspace
    const wsResult = await terraformExecutor.selectWorkspace(workdir, workspace);
    if (!wsResult.success) {
      await terraformExecutor.cleanup(workdir);
      throw new Error(`Workspace selection failed: ${wsResult.error}`);
    }

    // Run destroy
    const destroyResult = await terraformExecutor.destroy(workdir);

    // Cleanup
    await terraformExecutor.cleanup(workdir);

    return c.json({
      success: destroyResult.success,
      data: {
        output: destroyResult.output,
      },
    });
  } catch (error) {
    logger.error({ error, accountId: id }, 'Terraform destroy failed');
    throw error;
  }
});

export { provisionRoutes };
