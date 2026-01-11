import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { errorHandler, requestLogger, logger } from '@tenxdev/service-utils';
import { notificationsRoutes } from './routes/notifications.js';
import { preferencesRoutes } from './routes/preferences.js';
import { sendRoutes } from './routes/send.js';

const app = new Hono();

// Middleware
app.use('*', cors());
app.use('*', requestLogger);

// Health check
app.get('/health', (c) => c.json({ status: 'healthy', service: 'notifications' }));

// Routes
app.route('/api/v1/notifications', notificationsRoutes);
app.route('/api/v1/preferences', preferencesRoutes);
app.route('/api/v1/send', sendRoutes);

// Error handler
app.onError(errorHandler);

const port = parseInt(process.env.PORT || '3006', 10);

serve({ fetch: app.fetch, port }, () => {
  logger.info({ port }, 'Notifications service started');
});

export default app;
