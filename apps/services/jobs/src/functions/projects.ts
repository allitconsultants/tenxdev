import { inngest } from '../inngest.js';
import { db, projects, milestones, activityLogs, eq, and, lt } from '@tenxdev/database';
import { logger } from '@tenxdev/service-utils';

// Check for stale projects weekly
export const checkStaleProjects = inngest.createFunction(
  { id: 'check-stale-projects', name: 'Check Stale Projects' },
  { cron: '0 9 * * 1' }, // 9 AM Monday
  async ({ step }) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const staleProjects = await step.run('find-stale-projects', async () => {
      return db
        .select()
        .from(projects)
        .where(
          and(
            eq(projects.status, 'active'),
            lt(projects.updatedAt, thirtyDaysAgo)
          )
        );
    });

    logger.info({ count: staleProjects.length }, 'Found stale projects');

    for (const project of staleProjects) {
      await step.run(`notify-stale-${project.id}`, async () => {
        // Notify admin about stale project
        await fetch(`${process.env.NOTIFICATIONS_SERVICE_URL}/api/v1/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: project.accountManagerId || project.clientUserId,
            type: 'project_update',
            title: 'Project Needs Attention',
            message: `Project "${project.name}" has had no activity for 30+ days.`,
            link: `/projects/${project.id}`,
          }),
        });
      });
    }

    return { processed: staleProjects.length };
  }
);

// Check for overdue milestones daily
export const checkOverdueMilestones = inngest.createFunction(
  { id: 'check-overdue-milestones', name: 'Check Overdue Milestones' },
  { cron: '0 8 * * *' }, // 8 AM daily
  async ({ step }) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueMilestones = await step.run('find-overdue-milestones', async () => {
      return db
        .select()
        .from(milestones)
        .where(
          and(
            eq(milestones.status, 'in_progress'),
            lt(milestones.dueDate, today)
          )
        );
    });

    logger.info({ count: overdueMilestones.length }, 'Found overdue milestones');

    for (const milestone of overdueMilestones) {
      await step.run(`notify-overdue-${milestone.id}`, async () => {
        const project = await db
          .select()
          .from(projects)
          .where(eq(projects.id, milestone.projectId))
          .limit(1);

        if (project.length === 0) return;

        // Notify client
        await fetch(`${process.env.NOTIFICATIONS_SERVICE_URL}/api/v1/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: project[0].clientUserId,
            type: 'project_update',
            title: 'Milestone Overdue',
            message: `Milestone "${milestone.name}" for project "${project[0].name}" is overdue.`,
            link: `/projects/${project[0].id}/milestones`,
          }),
        });

        // Mark milestone as overdue
        await db
          .update(milestones)
          .set({ status: 'overdue', updatedAt: new Date() })
          .where(eq(milestones.id, milestone.id));
      });
    }

    return { processed: overdueMilestones.length };
  }
);

// Send milestone completion notification
export const notifyMilestoneCompleted = inngest.createFunction(
  { id: 'notify-milestone-completed', name: 'Notify Milestone Completed' },
  { event: 'project/milestone.completed' },
  async ({ event, step }) => {
    const { milestoneId, projectId } = event.data;

    const milestone = await step.run('get-milestone', async () => {
      const result = await db
        .select()
        .from(milestones)
        .where(eq(milestones.id, milestoneId))
        .limit(1);
      return result[0];
    });

    const project = await step.run('get-project', async () => {
      const result = await db
        .select()
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1);
      return result[0];
    });

    if (!milestone || !project) {
      logger.error({ milestoneId, projectId }, 'Milestone or project not found');
      return { success: false };
    }

    // Calculate overall progress
    const allMilestones = await step.run('get-all-milestones', async () => {
      return db
        .select()
        .from(milestones)
        .where(eq(milestones.projectId, projectId));
    });

    const completedCount = allMilestones.filter((m) => m.status === 'completed').length;
    const progress = Math.round((completedCount / allMilestones.length) * 100);

    // Update project progress
    await step.run('update-project-progress', async () => {
      await db
        .update(projects)
        .set({ progress, updatedAt: new Date() })
        .where(eq(projects.id, projectId));
    });

    // Send notification
    await step.run('send-notification', async () => {
      await fetch(`${process.env.NOTIFICATIONS_SERVICE_URL}/api/v1/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: project.clientUserId,
          type: 'milestone_completed',
          title: 'Milestone Completed',
          message: `Milestone "${milestone.name}" has been completed. Project progress: ${progress}%`,
          link: `/projects/${projectId}`,
          emailTemplate: 'milestone-completed',
          emailVariables: {
            userName: '', // Will be filled by notifications service
            milestoneName: milestone.name,
            projectName: project.name,
            progress: progress.toString(),
            dashboardUrl: `${process.env.PORTAL_URL}/projects/${projectId}`,
          },
        }),
      });
    });

    // Log activity
    await step.run('log-activity', async () => {
      await db.insert(activityLogs).values({
        projectId,
        type: 'milestone_completed',
        action: 'milestone_completed',
        title: 'Milestone completed',
        description: `${milestone.name} has been completed`,
        isPublic: true,
      });
    });

    return { success: true, milestoneId, progress };
  }
);
