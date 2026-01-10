import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { routes } from './routes/index.js';

export const app: Application = express();

// Trust proxy (needed for rate limiting behind nginx/load balancer)
app.set('trust proxy', true);

// Health checks - BEFORE any middleware to avoid rate limiting
app.get('/live', (_req, res) => res.status(200).send('OK'));
app.get('/ready', (_req, res) => res.status(200).send('OK'));

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: config.corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Logging
app.use(requestLogger);

// Routes
app.use('/api/v1', routes);

// Error handling
app.use(errorHandler);
