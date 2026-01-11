import { Hono } from 'hono';
import { z } from 'zod';
import { db, milestones, activityLogs, projects, eq } from '@tenxdev/database';
import { NotFoundError, ValidationError } from '@tenxdev/service-utils';

const milestonesRoutes = new Hono();

const createMilestoneSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  orderIndex: z.number().int().min(0),
  paymentAmount: z.string().optional(),
  paymentPercentage: z.number().int().min(0).max(100).optional(),
  dueDate: z.string().datetime().optional(),
  deliverables: z.array(z.string()).optional(),
});

const updateMilestoneSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'approved']).optional(),
  paymentStatus: z.enum(['pending', 'invoiced', 'paid', 'overdue', 'cancelled']).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  completedAt: z.string().datetime().optional().nullable(),
  deliverables: z.array(z.string()).optional(),
});

// Get milestones for a project
milestonesRoutes.get('/:projectId/milestones', async (c) => {
  const projectId = c.req.param('projectId');

  const result = await db
    .select()
    .from(milestones)
    .where(eq(milestones.projectId, projectId))
    .orderBy(milestones.orderIndex);

  return c.json({
    success: true,
    data: result,
  });
});

// Get single milestone
milestonesRoutes.get('/:projectId/milestones/:milestoneId', async (c) => {
  const milestoneId = c.req.param('milestoneId');

  const result = await db
    .select()
    .from(milestones)
    .where(eq(milestones.id, milestoneId))
    .limit(1);

  if (result.length === 0) {
    throw new NotFoundError('Milestone not found');
  }

  return c.json({
    success: true,
    data: result[0],
  });
});

// Create milestone
milestonesRoutes.post('/:projectId/milestones', async (c) => {
  const projectId = c.req.param('projectId');
  const body = await c.req.json();
  const parsed = createMilestoneSchema.safeParse(body);

  if (!parsed.success) {
    throw new ValidationError('Invalid milestone data', parsed.error.flatten().fieldErrors);
  }

  // Verify project exists
  const project = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);

  if (project.length === 0) {
    throw new NotFoundError('Project not found');
  }

  const result = await db
    .insert(milestones)
    .values({
      projectId,
      name: parsed.data.name,
      description: parsed.data.description,
      orderIndex: parsed.data.orderIndex,
      paymentAmount: parsed.data.paymentAmount,
      paymentPercentage: parsed.data.paymentPercentage,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      deliverables: parsed.data.deliverables || [],
    })
    .returning();

  // Log activity
  await db.insert(activityLogs).values({
    projectId,
    action: 'milestone_created',
    description: `Milestone "${parsed.data.name}" was created`,
  });

  return c.json(
    {
      success: true,
      data: result[0],
    },
    201
  );
});

// Update milestone
milestonesRoutes.patch('/:projectId/milestones/:milestoneId', async (c) => {
  const projectId = c.req.param('projectId');
  const milestoneId = c.req.param('milestoneId');
  const body = await c.req.json();
  const parsed = updateMilestoneSchema.safeParse(body);

  if (!parsed.success) {
    throw new ValidationError('Invalid milestone data', parsed.error.flatten().fieldErrors);
  }

  const existing = await db
    .select()
    .from(milestones)
    .where(eq(milestones.id, milestoneId))
    .limit(1);

  if (existing.length === 0) {
    throw new NotFoundError('Milestone not found');
  }

  const updateData: Record<string, unknown> = {
    ...parsed.data,
    updatedAt: new Date(),
  };

  // Handle status transitions
  if (parsed.data.status === 'in_progress' && existing[0].status === 'pending') {
    updateData.startedAt = new Date();
  }

  if (parsed.data.status === 'completed' && existing[0].status !== 'completed') {
    updateData.completedAt = new Date();
  }

  if (parsed.data.dueDate) {
    updateData.dueDate = new Date(parsed.data.dueDate);
  }

  if (parsed.data.completedAt) {
    updateData.completedAt = new Date(parsed.data.completedAt);
  }

  const result = await db
    .update(milestones)
    .set(updateData)
    .where(eq(milestones.id, milestoneId))
    .returning();

  // Log status changes
  if (parsed.data.status && parsed.data.status !== existing[0].status) {
    await db.insert(activityLogs).values({
      projectId,
      action: 'milestone_status_changed',
      description: `Milestone "${existing[0].name}" status changed to "${parsed.data.status}"`,
      metadata: {
        milestoneId,
        previousStatus: existing[0].status,
        newStatus: parsed.data.status,
      },
    });
  }

  if (parsed.data.paymentStatus && parsed.data.paymentStatus !== existing[0].paymentStatus) {
    await db.insert(activityLogs).values({
      projectId,
      action: 'milestone_payment_updated',
      description: `Milestone "${existing[0].name}" payment status changed to "${parsed.data.paymentStatus}"`,
      metadata: {
        milestoneId,
        previousPaymentStatus: existing[0].paymentStatus,
        newPaymentStatus: parsed.data.paymentStatus,
      },
    });

    // Update project amount paid if payment received
    if (parsed.data.paymentStatus === 'paid' && existing[0].paymentAmount) {
      const project = await db
        .select()
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1);

      if (project.length > 0) {
        const currentPaid = parseFloat(project[0].amountPaid || '0');
        const milestoneAmount = parseFloat(existing[0].paymentAmount);

        await db
          .update(projects)
          .set({
            amountPaid: (currentPaid + milestoneAmount).toFixed(2),
            updatedAt: new Date(),
          })
          .where(eq(projects.id, projectId));
      }
    }
  }

  return c.json({
    success: true,
    data: result[0],
  });
});

// Delete milestone
milestonesRoutes.delete('/:projectId/milestones/:milestoneId', async (c) => {
  const projectId = c.req.param('projectId');
  const milestoneId = c.req.param('milestoneId');

  const existing = await db
    .select()
    .from(milestones)
    .where(eq(milestones.id, milestoneId))
    .limit(1);

  if (existing.length === 0) {
    throw new NotFoundError('Milestone not found');
  }

  await db.delete(milestones).where(eq(milestones.id, milestoneId));

  // Log activity
  await db.insert(activityLogs).values({
    projectId,
    action: 'milestone_deleted',
    description: `Milestone "${existing[0].name}" was deleted`,
  });

  return c.json({
    success: true,
    message: 'Milestone deleted successfully',
  });
});

export { milestonesRoutes };
