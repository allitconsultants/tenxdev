import { Router, IRouter } from 'express';
import { newsletterController } from '../controllers/newsletterController.js';
import { validate } from '../middleware/validation.js';
import { contactLimiter } from '../middleware/rateLimit.js';
import { newsletterSchema } from '../validators/newsletter.js';

const router: IRouter = Router();

router.post(
  '/subscribe',
  contactLimiter,
  validate(newsletterSchema),
  newsletterController.subscribe
);

export const newsletterRoutes: IRouter = router;
