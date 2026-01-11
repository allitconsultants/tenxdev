import { Hono } from 'hono';
import { z } from 'zod';
import { db, cloudAccounts, projects, eq, desc } from '@tenxdev/database';
import { getProvider } from '../providers/index.js';
import { NotFoundError, ValidationError } from '@tenxdev/service-utils';

const accountsRoutes = new Hono();

const createAccountSchema = z.object({
  projectId: z.string().uuid(),
  provider: z.enum(['aws', 'gcp', 'azure']),
  region: z.string(),
  environment: z.enum(['staging', 'production']).default('production'),
});

// List accounts
accountsRoutes.get('/', async (c) => {
  const projectId = c.req.query('projectId');

  let query = db.select().from(cloudAccounts);

  if (projectId) {
    query = query.where(eq(cloudAccounts.projectId, projectId)) as typeof query;
  }

  const result = await query.orderBy(desc(cloudAccounts.createdAt));

  return c.json({
    success: true,
    data: result,
  });
});

// Get account
accountsRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');

  const result = await db
    .select()
    .from(cloudAccounts)
    .where(eq(cloudAccounts.id, id))
    .limit(1);

  if (result.length === 0) {
    throw new NotFoundError('Cloud account not found');
  }

  return c.json({
    success: true,
    data: result[0],
  });
});

// Create account
accountsRoutes.post('/', async (c) => {
  const body = await c.req.json();
  const parsed = createAccountSchema.safeParse(body);

  if (!parsed.success) {
    throw new ValidationError('Invalid account data', parsed.error.flatten().fieldErrors);
  }

  const { projectId, provider, region, environment } = parsed.data;

  // Verify project exists
  const project = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);

  if (project.length === 0) {
    throw new NotFoundError('Project not found');
  }

  // Create account in cloud provider
  const cloudProvider = getProvider(provider);
  const accountName = `${project[0].slug}-${environment}`;
  const accountEmail = `${project[0].slug}-${environment}@tenxdev.ai`;

  const accountInfo = await cloudProvider.createAccount(accountName, accountEmail);

  // Save to database with provider-specific account ID
  const result = await db
    .insert(cloudAccounts)
    .values({
      projectId,
      provider,
      awsAccountId: provider === 'aws' ? accountInfo.id : null,
      gcpProjectId: provider === 'gcp' ? accountInfo.id : null,
      azureSubscriptionId: provider === 'azure' ? accountInfo.id : null,
      status: 'active',
      region,
      environment,
      terraformWorkspace: `${project[0].slug}-${environment}`,
      terraformStateKey: `clients/${project[0].slug}/${environment}/terraform.tfstate`,
    })
    .returning();

  // Update project with cloud provider
  await db
    .update(projects)
    .set({
      cloudProvider: provider,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, projectId));

  return c.json(
    {
      success: true,
      data: result[0],
    },
    201
  );
});

// Delete account
accountsRoutes.delete('/:id', async (c) => {
  const id = c.req.param('id');

  const account = await db
    .select()
    .from(cloudAccounts)
    .where(eq(cloudAccounts.id, id))
    .limit(1);

  if (account.length === 0) {
    throw new NotFoundError('Cloud account not found');
  }

  // Mark as being deleted (actual deletion is manual)
  await db
    .update(cloudAccounts)
    .set({
      status: 'failed',
      updatedAt: new Date(),
    })
    .where(eq(cloudAccounts.id, id));

  return c.json({
    success: true,
    message: 'Account marked for deletion',
  });
});

export { accountsRoutes };
