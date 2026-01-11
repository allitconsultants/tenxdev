import { Context, MiddlewareHandler } from 'hono';
import { verifyToken } from '@clerk/backend';
import { db, users, organizations, eq } from '@tenxdev/database';
import { UnauthorizedError } from '../errors.js';

export interface AuthContext {
  clerkUserId: string;
  clerkOrgId?: string;
  userId: string;
  organizationId?: string;
  email?: string;
}

declare module 'hono' {
  interface ContextVariableMap {
    auth: AuthContext;
  }
}

/**
 * Clerk JWT authentication middleware for Hono services.
 * Verifies the Bearer token and attaches auth context to the request.
 */
export const clerkAuth: MiddlewareHandler = async (c, next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or invalid authorization header');
  }

  const token = authHeader.slice(7);

  if (!token) {
    throw new UnauthorizedError('Missing token');
  }

  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    throw new Error('CLERK_SECRET_KEY is not configured');
  }

  try {
    // Verify the JWT token
    const payload = await verifyToken(token, {
      secretKey,
    });

    const clerkUserId = payload.sub;
    const clerkOrgId = payload.org_id as string | undefined;

    if (!clerkUserId) {
      throw new UnauthorizedError('Invalid token: missing user ID');
    }

    // Look up internal user by clerkUserId
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.clerkUserId, clerkUserId))
      .limit(1);

    let user = userResult[0];

    // If user doesn't exist, create them (first login)
    if (!user) {
      const email = payload.email as string | undefined;
      const firstName = payload.first_name as string | undefined;
      const lastName = payload.last_name as string | undefined;

      const newUserResult = await db
        .insert(users)
        .values({
          clerkUserId,
          email: email || `${clerkUserId}@placeholder.local`,
          firstName,
          lastName,
        })
        .returning();

      user = newUserResult[0];
    }

    // Look up organization if clerkOrgId is present
    let organizationId: string | undefined;
    if (clerkOrgId) {
      const orgResult = await db
        .select()
        .from(organizations)
        .where(eq(organizations.clerkOrgId, clerkOrgId))
        .limit(1);

      if (orgResult[0]) {
        organizationId = orgResult[0].id;

        // Update user's organization if different
        if (user.organizationId !== organizationId) {
          await db
            .update(users)
            .set({ organizationId, updatedAt: new Date() })
            .where(eq(users.id, user.id));
        }
      }
    } else {
      // Use user's existing organization
      organizationId = user.organizationId ?? undefined;
    }

    // Attach auth context
    const authContext: AuthContext = {
      clerkUserId,
      clerkOrgId,
      userId: user.id,
      organizationId,
      email: user.email,
    };

    c.set('auth', authContext);

    await next();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw error;
    }

    // Handle Clerk verification errors
    if (error instanceof Error && error.message.includes('Token')) {
      throw new UnauthorizedError('Invalid or expired token');
    }

    throw new UnauthorizedError('Authentication failed');
  }
};

/**
 * Require organization middleware - use after clerkAuth.
 * Throws ForbiddenError if user doesn't belong to an organization.
 */
export const requireOrganization: MiddlewareHandler = async (c, next) => {
  const auth = c.get('auth');

  if (!auth?.organizationId) {
    throw new UnauthorizedError('Organization membership required');
  }

  await next();
};
