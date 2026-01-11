import type { Request, Response, NextFunction } from 'express';
import { r2Service } from '../services/r2Service.js';
import { turnstileService } from '../services/turnstileService.js';
import { emailService } from '../services/emailService.js';
import { logger } from '../utils/logger.js';
import {
  jobApplicationSchema,
  VALID_POSITIONS,
  POSITION_TITLES,
  type JobApplicationInput,
} from '../validators/careers.js';

export const careersController = {
  async apply(req: Request, res: Response, next: NextFunction) {
    try {
      // Parse and validate form data
      const formData: Partial<JobApplicationInput> = {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        phone: req.body.phone,
        position: req.body.position,
        linkedIn: req.body.linkedIn || undefined,
        portfolio: req.body.portfolio || undefined,
        coverLetter: req.body.coverLetter || undefined,
        turnstileToken: req.body.turnstileToken,
      };

      // Validate with Zod
      const validationResult = jobApplicationSchema.safeParse(formData);
      if (!validationResult.success) {
        const firstError = validationResult.error.errors[0];
        return res.status(400).json({
          success: false,
          error: firstError?.message || 'Validation failed',
        });
      }

      const data = validationResult.data;

      // Validate position
      if (!VALID_POSITIONS.includes(data.position)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid position selected',
        });
      }

      // Verify Turnstile token
      const ip = req.ip || req.socket.remoteAddress;
      const isValid = await turnstileService.verify(data.turnstileToken, ip);
      if (!isValid) {
        return res.status(400).json({
          success: false,
          error: 'Verification failed. Please try again.',
        });
      }

      // Check for resume file
      const resumeFile = req.file;
      if (!resumeFile) {
        return res.status(400).json({
          success: false,
          error: 'Resume is required',
        });
      }

      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];
      if (!allowedTypes.includes(resumeFile.mimetype)) {
        return res.status(400).json({
          success: false,
          error: 'Resume must be a PDF or Word document',
        });
      }

      // Upload resume to R2
      const uploadResult = await r2Service.uploadResume(
        resumeFile.buffer,
        resumeFile.originalname,
        resumeFile.mimetype,
        data.email,
        data.position
      );

      if (!uploadResult.success) {
        logger.error({ error: uploadResult.error }, 'Failed to upload resume');
        return res.status(500).json({
          success: false,
          error: 'Failed to upload resume. Please try again.',
        });
      }

      // Send notification email to team
      const positionTitle = POSITION_TITLES[data.position] || data.position;
      await emailService.sendJobApplicationNotification({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        position: positionTitle,
        linkedIn: data.linkedIn,
        portfolio: data.portfolio,
        coverLetter: data.coverLetter,
        resumeKey: uploadResult.key!,
      });

      logger.info(
        { email: data.email, position: data.position, resumeKey: uploadResult.key },
        'Job application submitted'
      );

      return res.status(201).json({
        success: true,
        message: 'Application submitted successfully. We will review and get back to you within 5 business days.',
      });
    } catch (error) {
      next(error);
    }
  },
};
