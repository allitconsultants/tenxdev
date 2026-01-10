import { Router, IRouter } from 'express';
import { contactController } from '../controllers/contactController.js';
import { validate } from '../middleware/validation.js';
import { contactLimiter } from '../middleware/rateLimit.js';
import { contactSchema } from '../validators/contact.js';

const router: IRouter = Router();

router.post(
  '/',
  contactLimiter,
  validate(contactSchema),
  contactController.submit
);

export const contactRoutes: IRouter = router;
