import { Router, IRouter } from 'express';
import multer from 'multer';
import { careersController } from '../controllers/careersController.js';

const router: IRouter = Router();

// Configure multer for memory storage (file in buffer)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF and Word documents are allowed.'));
    }
  },
});

// POST /api/v1/careers/apply - Submit job application with resume
router.post('/apply', upload.single('resume'), careersController.apply);

export const careersRoutes: IRouter = router;
