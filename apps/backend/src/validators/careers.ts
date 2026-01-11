import { z } from 'zod';

export const jobApplicationSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(1, 'Phone number is required').max(30),
  position: z.string().min(1, 'Position is required'),
  linkedIn: z.string().url().optional().or(z.literal('')),
  portfolio: z.string().url().optional().or(z.literal('')),
  coverLetter: z.string().max(5000).optional(),
  turnstileToken: z.string().min(1, 'Verification required'),
});

export type JobApplicationInput = z.infer<typeof jobApplicationSchema>;

export const VALID_POSITIONS = [
  'senior-fullstack-engineer',
  'frontend-engineer',
  'backend-engineer',
  'senior-qa-automation-engineer',
  'qa-automation-engineer',
  'qa-engineer-api',
  'senior-devops-engineer',
  'devops-engineer',
  'platform-engineer',
];

export const POSITION_TITLES: Record<string, string> = {
  'senior-fullstack-engineer': 'Senior Full-Stack Engineer',
  'frontend-engineer': 'Frontend Engineer',
  'backend-engineer': 'Backend Engineer',
  'senior-qa-automation-engineer': 'Senior QA Automation Engineer',
  'qa-automation-engineer': 'QA Automation Engineer',
  'qa-engineer-api': 'QA Engineer - API Testing',
  'senior-devops-engineer': 'Senior DevOps Engineer',
  'devops-engineer': 'DevOps Engineer',
  'platform-engineer': 'Platform Engineer',
};
