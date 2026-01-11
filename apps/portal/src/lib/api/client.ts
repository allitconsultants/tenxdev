import { auth } from '@/lib/auth';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
  message?: string;
}

const SERVICE_URLS = {
  projects: process.env.PROJECTS_SERVICE_URL || 'http://localhost:3001',
  billing: process.env.BILLING_SERVICE_URL || 'http://localhost:3002',
  documents: process.env.DOCUMENTS_SERVICE_URL || 'http://localhost:3003',
  notifications: process.env.NOTIFICATIONS_SERVICE_URL || 'http://localhost:3004',
  domains: process.env.DOMAINS_SERVICE_URL || 'http://localhost:3005',
  cloudProvisioner: process.env.CLOUD_PROVISIONER_SERVICE_URL || 'http://localhost:3006',
} as const;

export type ServiceName = keyof typeof SERVICE_URLS;

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Make an authenticated API call to a backend service.
 * Gets the NextAuth session and adds user info to the request.
 */
export async function apiClient<T>(
  service: ServiceName,
  path: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  const session = await auth();

  if (!session?.user) {
    throw new ApiError('Not authenticated', 401, 'UNAUTHORIZED');
  }

  const baseUrl = SERVICE_URLS[service];
  const url = `${baseUrl}${path}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        // Pass user info in headers for backend services
        'X-User-Id': session.user.id,
        'X-User-Email': session.user.email,
        'X-User-Role': session.user.role,
        'X-Organization-Id': session.user.organizationId || '',
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      // Disable Next.js caching for authenticated requests
      cache: 'no-store',
    });

    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(
        data.error?.message || data.message || 'Request failed',
        response.status,
        data.error?.code
      );
    }

    return data as ApiResponse<T>;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    // Network or parsing error
    throw new ApiError(
      error instanceof Error ? error.message : 'Network error',
      500,
      'NETWORK_ERROR'
    );
  }
}
