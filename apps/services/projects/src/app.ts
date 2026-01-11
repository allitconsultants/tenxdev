import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { requestLogger, errorHandler, clerkAuth } from '@tenxdev/service-utils';
import { projectsRoutes } from './routes/projects';
import { milestonesRoutes } from './routes/milestones';
import { activityRoutes } from './routes/activity';

const app = new Hono();

// Middleware
app.use('*', cors());
app.use('*', requestLogger);

// Health check (no auth required)
app.get('/health', (c) => c.json({ status: 'ok', service: 'projects' }));

// Auth middleware for all /projects routes
app.use('/projects/*', clerkAuth);

// Routes
app.route('/projects', projectsRoutes);
app.route('/projects', milestonesRoutes);
app.route('/projects', activityRoutes);

// Error handler
app.onError(errorHandler);

export { app };
