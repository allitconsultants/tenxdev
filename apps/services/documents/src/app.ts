import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { requestLogger, errorHandler } from '@tenxdev/service-utils';
import { documentsRoutes } from './routes/documents.js';
import { signaturesRoutes } from './routes/signatures.js';
import { envelopesRoutes } from './routes/envelopes.js';

const app = new Hono();

// Middleware
app.use('*', cors());
app.use('*', requestLogger);

// Health check
app.get('/health', (c) => c.json({ status: 'ok', service: 'documents' }));

// API routes
app.route('/api/v1/documents', documentsRoutes);
app.route('/api/v1/documents', signaturesRoutes);
app.route('/api/v1/envelopes', envelopesRoutes);

// Public signing routes (no /api/v1 prefix)
app.route('/sign', signaturesRoutes);

// Error handler
app.onError(errorHandler);

export { app };
