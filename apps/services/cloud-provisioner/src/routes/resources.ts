import { Hono } from 'hono';
import { db, cloudAccounts, cloudResources, eq, desc } from '@tenxdev/database';
import { getProvider } from '../providers/index.js';
import { NotFoundError, ValidationError } from '@tenxdev/service-utils';

const resourcesRoutes = new Hono();

// List resources
resourcesRoutes.get('/:id/resources', async (c) => {
  const id = c.req.param('id');

  const account = await db
    .select()
    .from(cloudAccounts)
    .where(eq(cloudAccounts.id, id))
    .limit(1);

  if (account.length === 0) {
    throw new NotFoundError('Cloud account not found');
  }

  const resources = await db
    .select()
    .from(cloudResources)
    .where(eq(cloudResources.cloudAccountId, id))
    .orderBy(desc(cloudResources.lastSyncedAt));

  return c.json({
    success: true,
    data: resources,
  });
});

// Get resource summary
resourcesRoutes.get('/:id/resources/summary', async (c) => {
  const id = c.req.param('id');

  const account = await db
    .select()
    .from(cloudAccounts)
    .where(eq(cloudAccounts.id, id))
    .limit(1);

  if (account.length === 0) {
    throw new NotFoundError('Cloud account not found');
  }

  const resources = await db
    .select()
    .from(cloudResources)
    .where(eq(cloudResources.cloudAccountId, id));

  // Group by type
  const summary: Record<string, number> = {};
  let totalCost = 0;

  for (const resource of resources) {
    summary[resource.resourceType] = (summary[resource.resourceType] || 0) + 1;
    totalCost += parseFloat(resource.monthlyCostEstimate || '0');
  }

  return c.json({
    success: true,
    data: {
      totalResources: resources.length,
      byType: summary,
      estimatedMonthlyCost: totalCost,
    },
  });
});

// Get specific resource
resourcesRoutes.get('/:id/resources/:resourceId', async (c) => {
  const resourceId = c.req.param('resourceId');

  const resource = await db
    .select()
    .from(cloudResources)
    .where(eq(cloudResources.id, resourceId))
    .limit(1);

  if (resource.length === 0) {
    throw new NotFoundError('Resource not found');
  }

  return c.json({
    success: true,
    data: resource[0],
  });
});

// Sync resources
resourcesRoutes.post('/:id/resources/sync', async (c) => {
  const id = c.req.param('id');

  const account = await db
    .select()
    .from(cloudAccounts)
    .where(eq(cloudAccounts.id, id))
    .limit(1);

  if (account.length === 0) {
    throw new NotFoundError('Cloud account not found');
  }

  const provider = getProvider(account[0].provider);

  const providerAccountId =
    account[0].provider === 'aws' ? account[0].awsAccountId :
    account[0].provider === 'gcp' ? account[0].gcpProjectId :
    account[0].provider === 'azure' ? account[0].azureSubscriptionId : null;

  if (!providerAccountId) {
    throw new ValidationError('Account has no provider ID');
  }

  // Fetch resources from provider
  const providerResources = await provider.syncResources(providerAccountId);

  // Update database
  for (const resource of providerResources) {
    // Upsert resource
    await db
      .insert(cloudResources)
      .values({
        cloudAccountId: id,
        providerResourceId: resource.id,
        resourceType: resource.type,
        resourceName: resource.name,
        region: resource.region,
        status: resource.status,
        monthlyCostEstimate: resource.monthlyCostEstimate?.toFixed(2),
        lastSyncedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [cloudResources.providerResourceId],
        set: {
          status: resource.status,
          monthlyCostEstimate: resource.monthlyCostEstimate?.toFixed(2),
          lastSyncedAt: new Date(),
        },
      });
  }

  return c.json({
    success: true,
    message: `Synced ${providerResources.length} resources`,
    data: {
      count: providerResources.length,
    },
  });
});

export { resourcesRoutes };
