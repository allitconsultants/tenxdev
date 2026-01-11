import { apiClient } from './client';

// Types based on database schema
export interface Milestone {
  id: string;
  projectId: string;
  name: string;
  description?: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'approved';
  orderIndex: number;
  paymentAmount?: string | null;
  paymentPercentage?: number | null;
  paymentStatus: 'pending' | 'invoiced' | 'paid' | 'overdue' | 'cancelled';
  dueDate?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  approvedAt?: string | null;
  deliverables?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  description?: string | null;
  tier: 'tier1' | 'tier2' | 'tier3';
  status:
    | 'draft'
    | 'discovery'
    | 'development'
    | 'testing'
    | 'staging'
    | 'production'
    | 'transfer'
    | 'completed'
    | 'cancelled';
  cloudProvider?: 'aws' | 'gcp' | 'azure' | null;
  githubAppRepoUrl?: string | null;
  githubInfraRepoUrl?: string | null;
  stagingUrl?: string | null;
  productionUrl?: string | null;
  grafanaUrl?: string | null;
  progress: number;
  totalAmount?: string | null;
  amountPaid: string;
  currency: string;
  estimatedStartDate?: string | null;
  estimatedEndDate?: string | null;
  actualStartDate?: string | null;
  actualEndDate?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface ProjectWithMilestones extends Project {
  milestones: Milestone[];
}

export interface ActivityLog {
  id: string;
  projectId: string;
  userId?: string | null;
  action: string;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

/**
 * Get all projects for the authenticated user's organization
 */
export async function getProjects() {
  return apiClient<Project[]>('projects', '/projects');
}

/**
 * Get a single project by ID with its milestones
 */
export async function getProject(id: string) {
  return apiClient<ProjectWithMilestones>('projects', `/projects/${id}`);
}

/**
 * Get activity logs for a project
 */
export async function getProjectActivity(projectId: string, limit = 50, offset = 0) {
  return apiClient<ActivityLog[]>(
    'projects',
    `/projects/${projectId}/activity?limit=${limit}&offset=${offset}`
  );
}

/**
 * Create a new project
 */
export async function createProject(data: {
  name: string;
  description?: string;
  tier: 'tier1' | 'tier2' | 'tier3';
  cloudProvider?: 'aws' | 'gcp' | 'azure';
  totalAmount?: string;
}) {
  return apiClient<Project>('projects', '/projects', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Update a project
 */
export async function updateProject(
  id: string,
  data: Partial<
    Pick<
      Project,
      | 'name'
      | 'description'
      | 'status'
      | 'stagingUrl'
      | 'productionUrl'
      | 'githubAppRepoUrl'
      | 'githubInfraRepoUrl'
      | 'grafanaUrl'
    >
  >
) {
  return apiClient<Project>('projects', `/projects/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}
