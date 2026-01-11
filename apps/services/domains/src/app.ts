import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { requestLogger, errorHandler } from '@tenxdev/service-utils';
import { domainsRoutes } from './routes/domains';
import { dnsRoutes } from './routes/dns';

const app = new Hono();

// Middleware
app.use('*', cors());
app.use('*', requestLogger);

// Health check
app.get('/health', (c) => c.json({ status: 'ok', service: 'domains' }));

// Routes
app.route('/domains', domainsRoutes);
app.route('/domains', dnsRoutes);

// Error handler
app.onError(errorHandler);

export { app };
