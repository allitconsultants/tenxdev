import { Hono } from 'hono';
import { z } from 'zod';
import { db, cloudAccounts, cloudTransfers, transferAuditLog, eq, desc } from '@tenxdev/database';
import { getProvider } from '../providers/index.js';
import { NotFoundError, ValidationError, logger } from '@tenxdev/service-utils';

const transfersRoutes = new Hono();

const initiateTransferSchema = z.object({
  targetOrganizationId: z.string().optional(),
  targetAccountEmail: z.string().email(),
  targetBillingAccount: z.string().optional(),
});

const updateChecklistSchema = z.object({
  itemId: z.string(),
  completed: z.boolean(),
});

// Get transfer status
transfersRoutes.get('/:id/transfer', async (c) => {
  const id = c.req.param('id');

  const account = await db
    .select()
    .from(cloudAccounts)
    .where(eq(cloudAccounts.id, id))
    .limit(1);

  if (account.length === 0) {
    throw new NotFoundError('Cloud account not found');
  }

  // Get transfer record
  const transfer = await db
    .select()
    .from(cloudTransfers)
    .where(eq(cloudTransfers.cloudAccountId, id))
    .orderBy(desc(cloudTransfers.createdAt))
    .limit(1);

  if (transfer.length === 0) {
    // Return default checklist
    const provider = getProvider(account[0].provider);
    const checklist = provider.getTransferChecklist(id);

    return c.json({
      success: true,
      data: {
        status: 'not_started',
        checklist: checklist.items,
      },
    });
  }

  return c.json({
    success: true,
    data: transfer[0],
  });
});

// Initiate transfer
transfersRoutes.post('/:id/transfer/initiate', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = initiateTransferSchema.safeParse(body);

  if (!parsed.success) {
    throw new ValidationError('Invalid transfer data', parsed.error.flatten().fieldErrors);
  }

  const account = await db
    .select()
    .from(cloudAccounts)
    .where(eq(cloudAccounts.id, id))
    .limit(1);

  if (account.length === 0) {
    throw new NotFoundError('Cloud account not found');
  }

  // Get checklist
  const provider = getProvider(account[0].provider);
  const checklist = provider.getTransferChecklist(id);

  // Create transfer record
  const result = await db
    .insert(cloudTransfers)
    .values({
      cloudAccountId: id,
      status: 'checklist_in_progress',
      checklist: { items: checklist.items },
      targetOrganizationId: parsed.data.targetOrganizationId,
      targetAccountEmail: parsed.data.targetAccountEmail,
      targetBillingAccount: parsed.data.targetBillingAccount,
      initiatedAt: new Date(),
    })
    .returning();

  // Update account status
  await db
    .update(cloudAccounts)
    .set({
      status: 'transferring',
      updatedAt: new Date(),
    })
    .where(eq(cloudAccounts.id, id));

  // Log activity
  await db.insert(transferAuditLog).values({
    transferId: result[0].id,
    action: 'transfer_initiated',
    details: {
      targetEmail: parsed.data.targetAccountEmail,
    },
  });

  logger.info({ accountId: id, transferId: result[0].id }, 'Transfer initiated');

  return c.json({
    success: true,
    data: result[0],
  });
});

// Update checklist
transfersRoutes.patch('/:id/transfer/checklist', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = updateChecklistSchema.safeParse(body);

  if (!parsed.success) {
    throw new ValidationError('Invalid checklist data', parsed.error.flatten().fieldErrors);
  }

  const transfer = await db
    .select()
    .from(cloudTransfers)
    .where(eq(cloudTransfers.cloudAccountId, id))
    .orderBy(desc(cloudTransfers.createdAt))
    .limit(1);

  if (transfer.length === 0) {
    throw new NotFoundError('Transfer not found');
  }

  // Update checklist item
  const checklist = transfer[0].checklist as { items: Array<{ id: string; completed: boolean; completedAt?: string }> };
  const item = checklist.items.find((i) => i.id === parsed.data.itemId);

  if (!item) {
    throw new NotFoundError('Checklist item not found');
  }

  item.completed = parsed.data.completed;
  item.completedAt = parsed.data.completed ? new Date().toISOString() : undefined;

  // Check if all items complete
  const allComplete = checklist.items.every((i) => i.completed);

  await db
    .update(cloudTransfers)
    .set({
      checklist,
      status: allComplete ? 'ready' : 'checklist_in_progress',
      checklistCompletedAt: allComplete ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(cloudTransfers.id, transfer[0].id));

  // Log activity
  await db.insert(transferAuditLog).values({
    transferId: transfer[0].id,
    action: 'checklist_updated',
    details: {
      itemId: parsed.data.itemId,
      completed: parsed.data.completed,
    },
  });

  return c.json({
    success: true,
    message: 'Checklist updated',
  });
});

// Execute transfer
transfersRoutes.post('/:id/transfer/execute', async (c) => {
  const id = c.req.param('id');

  const transfer = await db
    .select()
    .from(cloudTransfers)
    .where(eq(cloudTransfers.cloudAccountId, id))
    .orderBy(desc(cloudTransfers.createdAt))
    .limit(1);

  if (transfer.length === 0) {
    throw new NotFoundError('Transfer not found');
  }

  if (transfer[0].status !== 'ready') {
    throw new ValidationError('Transfer not ready - complete checklist first');
  }

  // Update status
  await db
    .update(cloudTransfers)
    .set({
      status: 'executing',
      executedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(cloudTransfers.id, transfer[0].id));

  // Log activity
  await db.insert(transferAuditLog).values({
    transferId: transfer[0].id,
    action: 'transfer_executing',
  });

  logger.info({ transferId: transfer[0].id }, 'Transfer execution started');

  return c.json({
    success: true,
    message: 'Transfer execution started',
  });
});

// Verify transfer
transfersRoutes.post('/:id/transfer/verify', async (c) => {
  const id = c.req.param('id');

  const account = await db
    .select()
    .from(cloudAccounts)
    .where(eq(cloudAccounts.id, id))
    .limit(1);

  if (account.length === 0) {
    throw new NotFoundError('Cloud account not found');
  }

  const transfer = await db
    .select()
    .from(cloudTransfers)
    .where(eq(cloudTransfers.cloudAccountId, id))
    .orderBy(desc(cloudTransfers.createdAt))
    .limit(1);

  if (transfer.length === 0) {
    throw new NotFoundError('Transfer not found');
  }

  // Verify with provider
  const provider = getProvider(account[0].provider);

  const providerAccountId =
    account[0].provider === 'aws' ? account[0].awsAccountId :
    account[0].provider === 'gcp' ? account[0].gcpProjectId :
    account[0].provider === 'azure' ? account[0].azureSubscriptionId : null;

  if (!providerAccountId) {
    throw new ValidationError('Account has no provider ID');
  }

  const verified = await provider.verifyTransfer(providerAccountId);

  await db
    .update(cloudTransfers)
    .set({
      status: verified ? 'verifying' : 'executing',
      verifiedAt: verified ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(cloudTransfers.id, transfer[0].id));

  // Log activity
  await db.insert(transferAuditLog).values({
    transferId: transfer[0].id,
    action: 'transfer_verified',
    details: { verified },
  });

  return c.json({
    success: true,
    data: { verified },
  });
});

// Complete transfer
transfersRoutes.post('/:id/transfer/complete', async (c) => {
  const id = c.req.param('id');

  const transfer = await db
    .select()
    .from(cloudTransfers)
    .where(eq(cloudTransfers.cloudAccountId, id))
    .orderBy(desc(cloudTransfers.createdAt))
    .limit(1);

  if (transfer.length === 0) {
    throw new NotFoundError('Transfer not found');
  }

  // Update transfer
  await db
    .update(cloudTransfers)
    .set({
      status: 'completed',
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(cloudTransfers.id, transfer[0].id));

  // Update account
  await db
    .update(cloudAccounts)
    .set({
      status: 'transferred',
      updatedAt: new Date(),
    })
    .where(eq(cloudAccounts.id, id));

  // Log activity
  await db.insert(transferAuditLog).values({
    transferId: transfer[0].id,
    action: 'transfer_completed',
  });

  logger.info({ transferId: transfer[0].id }, 'Transfer completed');

  return c.json({
    success: true,
    message: 'Transfer completed',
  });
});

export { transfersRoutes };
