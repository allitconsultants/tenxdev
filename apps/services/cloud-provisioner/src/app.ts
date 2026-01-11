import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { requestLogger, errorHandler } from '@tenxdev/service-utils';
import { accountsRoutes } from './routes/accounts.js';
import { provisionRoutes } from './routes/provision.js';
import { resourcesRoutes } from './routes/resources.js';
import { costsRoutes } from './routes/costs.js';
import { transfersRoutes } from './routes/transfers.js';

const app = new Hono();

// Middleware
app.use('*', cors());
app.use('*', requestLogger);

// Health check
app.get('/health', (c) => c.json({ status: 'ok', service: 'cloud-provisioner' }));

// Routes
app.route('/accounts', accountsRoutes);
app.route('/accounts', provisionRoutes);
app.route('/accounts', resourcesRoutes);
app.route('/accounts', costsRoutes);
app.route('/accounts', transfersRoutes);

// Error handler
app.onError(errorHandler);

export { app };
