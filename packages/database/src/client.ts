import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index';

// Re-export common drizzle operators
export { eq, ne, gt, gte, lt, lte, and, or, not, desc, asc, sql } from 'drizzle-orm';

// Lazy-initialized database client
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;
let queryClient: ReturnType<typeof postgres> | null = null;

function getConnectionString(): string {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  return connectionString;
}

function createDbClient() {
  if (!dbInstance) {
    const connectionString = getConnectionString();
    queryClient = postgres(connectionString, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });
    dbInstance = drizzle(queryClient, { schema });
  }
  return dbInstance;
}

// Proxy to lazy-load the database client
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop) {
    const client = createDbClient();
    return (client as unknown as Record<string | symbol, unknown>)[prop];
  },
});

// Export types
export type Database = ReturnType<typeof drizzle<typeof schema>>;

// Migration client (with single connection)
export function getMigrationClient() {
  return postgres(getConnectionString(), { max: 1 });
}
