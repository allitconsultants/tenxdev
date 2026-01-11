import { Hono } from 'hono';
import { z } from 'zod';
import { db, projects, milestones, activityLogs, eq, and, desc } from '@tenxdev/database';
import { NotFoundError, ValidationError } from '@tenxdev/service-utils';

const projectsRoutes = new Hono();

// Validation schemas
const createProjectSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  tier: z.enum(['tier1', 'tier2', 'tier3']),
  cloudProvider: z.enum(['aws', 'gcp', 'azure']).optional(),
  totalAmount: z.string().optional(),
  estimatedStartDate: z.string().datetime().optional(),
  estimatedEndDate: z.string().datetime().optional(),
});

const updateProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  status: z
    .enum([
      'draft',
      'discovery',
      'development',
      'testing',
      'staging',
      'production',
      'transfer',
      'completed',
      'cancelled',
    ])
    .optional(),
  stagingUrl: z.string().url().optional().nullable(),
  productionUrl: z.string().url().optional().nullable(),
  githubAppRepoUrl: z.string().url().optional().nullable(),
  githubInfraRepoUrl: z.string().url().optional().nullable(),
  grafanaUrl: z.string().url().optional().nullable(),
});

// List projects
projectsRoutes.get('/', async (c) => {
  const auth = c.get('auth');
  const status = c.req.query('status');

  // Filter by authenticated user's organization
  const conditions = auth.organizationId
    ? [eq(projects.organizationId, auth.organizationId)]
    : [];

  const result = await db
    .select()
    .from(projects)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(projects.createdAt));

  return c.json({
    success: true,
    data: result,
  });
});

// Get project by ID
projectsRoutes.get('/:id', async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');

  const result = await db.select().from(projects).where(eq(projects.id, id)).limit(1);

  if (result.length === 0) {
    throw new NotFoundError('Project not found');
  }

  // Verify user has access to this project
  if (auth.organizationId && result[0].organizationId !== auth.organizationId) {
    throw new NotFoundError('Project not found');
  }

  // Get milestones
  const projectMilestones = await db
    .select()
    .from(milestones)
    .where(eq(milestones.projectId, id))
    .orderBy(milestones.orderIndex);

  return c.json({
    success: true,
    data: {
      ...result[0],
      milestones: projectMilestones,
    },
  });
});

// Create project
projectsRoutes.post('/', async (c) => {
  const auth = c.get('auth');
  const body = await c.req.json();
  const parsed = createProjectSchema.safeParse(body);

  if (!parsed.success) {
    throw new ValidationError('Invalid project data', parsed.error.flatten().fieldErrors);
  }

  if (!auth.organizationId) {
    throw new ValidationError('Organization membership required to create projects');
  }

  const { name, description, tier, cloudProvider, totalAmount } = parsed.data;
  const organizationId = auth.organizationId;

  // Generate slug
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const result = await db
    .insert(projects)
    .values({
      organizationId,
      name,
      slug,
      description,
      tier,
      cloudProvider,
      totalAmount,
      status: 'draft',
    })
    .returning();

  // Create default milestones based on tier
  const defaultMilestones = getDefaultMilestones(tier, totalAmount || '0');

  if (defaultMilestones.length > 0) {
    await db.insert(milestones).values(
      defaultMilestones.map((m, index) => ({
        projectId: result[0].id,
        name: m.name,
        description: m.description,
        orderIndex: index,
        paymentPercentage: m.percentage,
        paymentAmount: m.amount,
      }))
    );
  }

  // Log activity
  await db.insert(activityLogs).values({
    projectId: result[0].id,
    action: 'project_created',
    description: `Project "${name}" was created`,
  });

  return c.json(
    {
      success: true,
      data: result[0],
    },
    201
  );
});

// Update project
projectsRoutes.patch('/:id', async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = updateProjectSchema.safeParse(body);

  if (!parsed.success) {
    throw new ValidationError('Invalid project data', parsed.error.flatten().fieldErrors);
  }

  const existing = await db.select().from(projects).where(eq(projects.id, id)).limit(1);

  if (existing.length === 0) {
    throw new NotFoundError('Project not found');
  }

  // Verify user has access to this project
  if (auth.organizationId && existing[0].organizationId !== auth.organizationId) {
    throw new NotFoundError('Project not found');
  }

  const result = await db
    .update(projects)
    .set({
      ...parsed.data,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, id))
    .returning();

  // Log status change
  if (parsed.data.status && parsed.data.status !== existing[0].status) {
    await db.insert(activityLogs).values({
      projectId: id,
      action: 'status_changed',
      description: `Project status changed from "${existing[0].status}" to "${parsed.data.status}"`,
      metadata: {
        previousStatus: existing[0].status,
        newStatus: parsed.data.status,
      },
    });
  }

  return c.json({
    success: true,
    data: result[0],
  });
});

// Delete project (soft delete)
projectsRoutes.delete('/:id', async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');

  const existing = await db.select().from(projects).where(eq(projects.id, id)).limit(1);

  if (existing.length === 0) {
    throw new NotFoundError('Project not found');
  }

  // Verify user has access to this project
  if (auth.organizationId && existing[0].organizationId !== auth.organizationId) {
    throw new NotFoundError('Project not found');
  }

  await db
    .update(projects)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(projects.id, id));

  return c.json({
    success: true,
    message: 'Project deleted successfully',
  });
});

// Helper function to get default milestones
function getDefaultMilestones(tier: string, totalAmount: string) {
  const total = parseFloat(totalAmount) || 0;

  if (tier === 'tier1') {
    return [
      {
        name: 'Project Kickoff',
        description: 'Initial setup, requirements gathering, and contract signing',
        percentage: 30,
        amount: (total * 0.3).toFixed(2),
      },
      {
        name: 'MVP Feature Complete',
        description: 'Core features implemented and tested',
        percentage: 30,
        amount: (total * 0.3).toFixed(2),
      },
      {
        name: 'Final Delivery',
        description: 'Final testing, documentation, and handover',
        percentage: 40,
        amount: (total * 0.4).toFixed(2),
      },
    ];
  }

  if (tier === 'tier2') {
    return [
      {
        name: 'Project Kickoff',
        description: 'Initial setup, requirements gathering, and contract signing',
        percentage: 25,
        amount: (total * 0.25).toFixed(2),
      },
      {
        name: 'Application MVP',
        description: 'Core application features implemented',
        percentage: 25,
        amount: (total * 0.25).toFixed(2),
      },
      {
        name: 'Infrastructure Deployed',
        description: 'Cloud infrastructure provisioned and configured',
        percentage: 25,
        amount: (total * 0.25).toFixed(2),
      },
      {
        name: 'Production Go-Live',
        description: 'Final deployment, transfer, and handover',
        percentage: 25,
        amount: (total * 0.25).toFixed(2),
      },
    ];
  }

  return [];
}

export { projectsRoutes };
