import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { requestLogger, errorHandler, clerkAuth } from '@tenxdev/service-utils';
import { checkoutRoutes } from './routes/checkout';
import { invoicesRoutes } from './routes/invoices';
import { subscriptionsRoutes } from './routes/subscriptions';
import { webhooksRoutes } from './routes/webhooks';
import { paymentMethodsRoutes } from './routes/payment-methods';

const app = new Hono();

// Middleware
app.use('*', cors());
app.use('*', requestLogger);

// Health check (no auth required)
app.get('/health', (c) => c.json({ status: 'ok', service: 'billing' }));

// Webhooks route (no auth - Stripe signature verification instead)
app.route('/billing/webhooks', webhooksRoutes);

// Auth middleware for all other billing routes
app.use('/billing/*', clerkAuth);

// Routes
app.route('/billing/checkout-session', checkoutRoutes);
app.route('/billing/invoices', invoicesRoutes);
app.route('/billing/subscriptions', subscriptionsRoutes);
app.route('/billing/payment-methods', paymentMethodsRoutes);

// Error handler
app.onError(errorHandler);

export { app };
