import { app } from './app.js';
import { logger } from './utils/logger.js';
import { config } from './config/index.js';
import { loadSecrets } from './config/secrets.js';

async function startServer() {
  // Load secrets from GCP Secret Manager (if GCP_PROJECT_ID is set)
  await loadSecrets();

  const server = app.listen(config.port, () => {
    logger.info(`Server running on port ${config.port}`);
    logger.info(`Environment: ${config.nodeEnv}`);
  });

  return server;
}

const serverPromise = startServer();

let server: ReturnType<typeof app.listen> | null = null;
serverPromise.then((s) => {
  server = s;
});

// Graceful shutdown
const shutdown = () => {
  logger.info('Shutting down gracefully...');
  if (server) {
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }

  // Force close after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
