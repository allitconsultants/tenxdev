import * as VaultModule from 'node-vault';
const Vault = VaultModule.default || VaultModule;
import { promises as fs } from 'fs';
import { logger } from './logger.js';

interface VaultConfig {
  address: string;
  role: string;
  tokenPath?: string;
}

interface VaultClient {
  read: (path: string) => Promise<{ data: { data: Record<string, unknown> } }>;
  write: (path: string, data: Record<string, unknown>) => Promise<void>;
}

let vaultClient: VaultClient | null = null;
let tokenRefreshTimer: NodeJS.Timeout | null = null;

// In-memory cache with TTL
const secretCache = new Map<string, { value: Record<string, unknown>; expiry: number }>();
const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get Vault configuration from environment
 */
function getVaultConfig(): VaultConfig {
  return {
    address: process.env.VAULT_ADDR || 'http://vault.vault.svc.cluster.local:8200',
    role: process.env.VAULT_ROLE || 'tenxdev-backend',
    tokenPath: process.env.VAULT_TOKEN_PATH || '/var/run/secrets/kubernetes.io/serviceaccount/token',
  };
}

/**
 * Authenticate with Vault using Kubernetes ServiceAccount
 */
async function authenticateKubernetes(client: VaultClient, config: VaultConfig): Promise<string> {
  try {
    const jwt = await fs.readFile(config.tokenPath!, 'utf8');

    const result = await (client as unknown as Vault.client).kubernetesLogin({
      role: config.role,
      jwt: jwt.trim(),
    });

    logger.info({ role: config.role }, 'Authenticated with Vault via Kubernetes');

    // Schedule token refresh before expiry (refresh at 75% of TTL)
    const ttlSeconds = result.auth.lease_duration || 3600;
    const refreshMs = ttlSeconds * 0.75 * 1000;

    if (tokenRefreshTimer) {
      clearTimeout(tokenRefreshTimer);
    }

    tokenRefreshTimer = setTimeout(async () => {
      try {
        await authenticateKubernetes(client, config);
      } catch (error) {
        logger.error({ error }, 'Failed to refresh Vault token');
      }
    }, refreshMs);

    return result.auth.client_token;
  } catch (error) {
    logger.error({ error }, 'Failed to authenticate with Vault');
    throw error;
  }
}

/**
 * Initialize Vault client with Kubernetes authentication
 */
export async function initVaultClient(): Promise<VaultClient> {
  if (vaultClient) {
    return vaultClient;
  }

  const config = getVaultConfig();

  // Check if we should skip Vault (local development)
  if (process.env.VAULT_SKIP === 'true') {
    logger.info('Vault disabled, using mock client');
    vaultClient = createMockClient();
    return vaultClient;
  }

  const client = Vault({
    apiVersion: 'v1',
    endpoint: config.address,
  });

  // Authenticate
  const token = await authenticateKubernetes(client as unknown as VaultClient, config);
  client.token = token;

  vaultClient = client as unknown as VaultClient;
  logger.info({ address: config.address }, 'Vault client initialized');

  return vaultClient;
}

/**
 * Create a mock client for local development
 */
function createMockClient(): VaultClient {
  const mockSecrets: Record<string, Record<string, unknown>> = {
    'secret/data/platform/env/production': {
      database_url: 'mock-db-url',
      jwt_secret: 'mock-jwt-secret',
    },
    'secret/data/customers/test-customer/config/settings': {
      feature_flags: '{}',
      limits: '{"users": 10}',
    },
  };

  return {
    read: async (path: string) => {
      const secretData = mockSecrets[path] || {};
      return { data: { data: secretData } };
    },
    write: async () => {
      // No-op for mock
    },
  };
}

/**
 * Get a platform secret
 */
export async function getPlatformSecret(path: string): Promise<Record<string, unknown>> {
  const fullPath = `secret/data/platform/${path}`;
  return getCachedSecret(fullPath);
}

/**
 * Get a customer secret
 */
export async function getCustomerSecret(
  customerId: string,
  path: string
): Promise<Record<string, unknown>> {
  const fullPath = `secret/data/customers/${customerId}/${path}`;
  return getCachedSecret(fullPath);
}

/**
 * Get a secret with caching
 */
export async function getCachedSecret(
  path: string,
  ttlMs: number = DEFAULT_CACHE_TTL_MS
): Promise<Record<string, unknown>> {
  // Check cache
  const cached = secretCache.get(path);
  if (cached && cached.expiry > Date.now()) {
    return cached.value;
  }

  // Fetch from Vault
  const client = await initVaultClient();

  try {
    const result = await client.read(path);
    const value = result.data.data;

    // Cache the result
    secretCache.set(path, {
      value: value as Record<string, unknown>,
      expiry: Date.now() + ttlMs,
    });

    return value as Record<string, unknown>;
  } catch (error) {
    // If cached value exists but expired, return stale data on error
    if (cached) {
      logger.warn({ path, error }, 'Vault read failed, returning stale cached value');
      return cached.value;
    }
    throw error;
  }
}

/**
 * Write a customer secret (for onboarding)
 */
export async function setCustomerSecret(
  customerId: string,
  path: string,
  data: Record<string, unknown>
): Promise<void> {
  const client = await initVaultClient();
  const fullPath = `secret/data/customers/${customerId}/${path}`;

  await client.write(fullPath, { data });

  // Invalidate cache
  secretCache.delete(fullPath);

  logger.info({ customerId, path }, 'Customer secret written to Vault');
}

/**
 * Clear secret cache (useful for testing)
 */
export function clearSecretCache(): void {
  secretCache.clear();
}

/**
 * Check Vault health
 */
export async function checkVaultHealth(): Promise<boolean> {
  try {
    const config = getVaultConfig();
    const response = await fetch(`${config.address}/v1/sys/health`);
    return response.ok;
  } catch {
    return false;
  }
}
