import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { compare, hash } from 'bcryptjs';
import { db, eq } from '@tenxdev/database';
import { users, organizations } from '@tenxdev/database/schema';
import { z } from 'zod';
import { authConfig } from './auth.config';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  organizationName: z.string().min(1).optional(),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      id: 'credentials',
      name: 'Email & Password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        action: { label: 'Action', type: 'text' },
        firstName: { label: 'First Name', type: 'text' },
        lastName: { label: 'Last Name', type: 'text' },
        organizationName: { label: 'Organization', type: 'text' },
      },
      async authorize(credentials) {
        const action = credentials?.action as string;

        if (action === 'register') {
          // Registration flow
          const parsed = registerSchema.safeParse({
            email: credentials?.email,
            password: credentials?.password,
            firstName: credentials?.firstName,
            lastName: credentials?.lastName,
            organizationName: credentials?.organizationName,
          });

          if (!parsed.success) {
            throw new Error('Invalid registration data');
          }

          const { email, password, firstName, lastName, organizationName } = parsed.data;

          // Check if user exists
          const existingUser = await db
            .select()
            .from(users)
            .where(eq(users.email, email.toLowerCase()))
            .limit(1);

          if (existingUser.length > 0) {
            throw new Error('Email already registered');
          }

          // Hash password
          const passwordHash = await hash(password, 12);

          // Create organization if provided
          let organizationId: string | undefined;
          if (organizationName) {
            const [org] = await db
              .insert(organizations)
              .values({
                name: organizationName,
              })
              .returning();
            organizationId = org.id;
          }

          // Create user
          const [newUser] = await db
            .insert(users)
            .values({
              email: email.toLowerCase(),
              passwordHash,
              firstName,
              lastName,
              organizationId,
              emailVerified: new Date(), // Auto-verify for now
            })
            .returning();

          return {
            id: newUser.id,
            email: newUser.email,
            firstName: newUser.firstName,
            lastName: newUser.lastName,
            organizationId: newUser.organizationId,
            role: newUser.role,
            isAdmin: newUser.isAdmin,
          };
        }

        // Login flow
        const parsed = loginSchema.safeParse({
          email: credentials?.email,
          password: credentials?.password,
        });

        if (!parsed.success) {
          throw new Error('Invalid credentials');
        }

        const { email, password } = parsed.data;

        // Find user
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email.toLowerCase()))
          .limit(1);

        if (!user || !user.passwordHash) {
          throw new Error('Invalid credentials');
        }

        // Verify password
        const isValid = await compare(password, user.passwordHash);
        if (!isValid) {
          throw new Error('Invalid credentials');
        }

        // Update last login
        await db
          .update(users)
          .set({ lastLoginAt: new Date() })
          .where(eq(users.id, user.id));

        return {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          organizationId: user.organizationId,
          role: user.role,
          isAdmin: user.isAdmin,
        };
      },
    }),
  ],
});

// Extend NextAuth types
declare module 'next-auth' {
  interface User {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    organizationId: string | null;
    role: string;
    isAdmin: boolean;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
      organizationId: string | null;
      role: string;
      isAdmin: boolean;
    };
  }
}

