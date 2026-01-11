import { Hono } from 'hono';
import { db, activityLogs, projects, eq, desc } from '@tenxdev/database';
import { NotFoundError } from '@tenxdev/service-utils';

const activityRoutes = new Hono();

// Get activity logs for a project
activityRoutes.get('/:projectId/activity', async (c) => {
  const auth = c.get('auth');
  const projectId = c.req.param('projectId');
  const limit = parseInt(c.req.query('limit') || '50', 10);
  const offset = parseInt(c.req.query('offset') || '0', 10);

  // Verify user has access to this project
  const project = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (project.length === 0) {
    throw new NotFoundError('Project not found');
  }

  if (auth.organizationId && project[0].organizationId !== auth.organizationId) {
    throw new NotFoundError('Project not found');
  }

  const result = await db
    .select()
    .from(activityLogs)
    .where(eq(activityLogs.projectId, projectId))
    .orderBy(desc(activityLogs.createdAt))
    .limit(limit)
    .offset(offset);

  return c.json({
    success: true,
    data: result,
  });
});

export { activityRoutes };
