import { Router, IRouter } from 'express';

const router: IRouter = Router();

router.get('/', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
  });
});

router.get('/ready', (_req, res) => {
  res.json({
    status: 'ready',
    timestamp: new Date().toISOString(),
  });
});

router.get('/live', (_req, res) => {
  res.json({
    status: 'live',
    timestamp: new Date().toISOString(),
  });
});

export const healthRoutes: IRouter = router;
