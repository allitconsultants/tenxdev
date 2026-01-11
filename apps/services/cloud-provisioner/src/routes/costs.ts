import { Hono } from 'hono';
import { db, cloudAccounts, cloudCosts, eq, desc } from '@tenxdev/database';
import { getProvider } from '../providers/index.js';
import { NotFoundError, ValidationError } from '@tenxdev/service-utils';

const costsRoutes = new Hono();

// Get current month costs
costsRoutes.get('/:id/costs', async (c) => {
  const id = c.req.param('id');

  const account = await db
    .select()
    .from(cloudAccounts)
    .where(eq(cloudAccounts.id, id))
    .limit(1);

  if (account.length === 0) {
    throw new NotFoundError('Cloud account not found');
  }

  // Get latest costs from database
  const costs = await db
    .select()
    .from(cloudCosts)
    .where(eq(cloudCosts.cloudAccountId, id))
    .orderBy(desc(cloudCosts.periodEnd))
    .limit(1);

  if (costs.length === 0) {
    return c.json({
      success: true,
      data: {
        totalCost: 0,
        currency: 'USD',
        breakdown: {},
        periodStart: null,
        periodEnd: null,
      },
    });
  }

  return c.json({
    success: true,
    data: costs[0],
  });
});

// Get cost history
costsRoutes.get('/:id/costs/history', async (c) => {
  const id = c.req.param('id');

  const account = await db
    .select()
    .from(cloudAccounts)
    .where(eq(cloudAccounts.id, id))
    .limit(1);

  if (account.length === 0) {
    throw new NotFoundError('Cloud account not found');
  }

  // Get last 12 months
  const costs = await db
    .select()
    .from(cloudCosts)
    .where(eq(cloudCosts.cloudAccountId, id))
    .orderBy(desc(cloudCosts.periodEnd))
    .limit(12);

  return c.json({
    success: true,
    data: costs,
  });
});

// Get cost forecast
costsRoutes.get('/:id/costs/forecast', async (c) => {
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

  const forecast = await provider.getCostForecast(providerAccountId);

  return c.json({
    success: true,
    data: {
      estimatedCost: forecast.totalCost,
      currency: forecast.currency,
      periodStart: forecast.periodStart,
      periodEnd: forecast.periodEnd,
    },
  });
});

// Get cost breakdown
costsRoutes.get('/:id/costs/breakdown', async (c) => {
  const id = c.req.param('id');

  const account = await db
    .select()
    .from(cloudAccounts)
    .where(eq(cloudAccounts.id, id))
    .limit(1);

  if (account.length === 0) {
    throw new NotFoundError('Cloud account not found');
  }

  // Get latest costs
  const costs = await db
    .select()
    .from(cloudCosts)
    .where(eq(cloudCosts.cloudAccountId, id))
    .orderBy(desc(cloudCosts.periodEnd))
    .limit(1);

  if (costs.length === 0) {
    return c.json({
      success: true,
      data: {
        breakdown: {},
        totalCost: 0,
      },
    });
  }

  return c.json({
    success: true,
    data: {
      breakdown: costs[0].costBreakdown,
      totalCost: costs[0].totalCost,
      periodStart: costs[0].periodStart,
      periodEnd: costs[0].periodEnd,
    },
  });
});

export { costsRoutes };
