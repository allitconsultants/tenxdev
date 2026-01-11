import type { SignatureProvider } from './base.js';
import { SimpleSignatureProvider } from './simple.js';

// Re-export types
export * from './base.js';
export { SimpleSignatureProvider } from './simple.js';

// Provider instances (singletons)
const providers: Record<string, SignatureProvider> = {
  simple: new SimpleSignatureProvider(),
  // Future providers:
  // docusign: new DocuSignProvider(),
  // hellosign: new HelloSignProvider(),
};

/**
 * Get signature provider by name
 *
 * @param name Provider name (defaults to SIGNATURE_PROVIDER env var or 'simple')
 * @returns SignatureProvider instance
 */
export function getSignatureProvider(name?: string): SignatureProvider {
  const providerName = name || process.env.SIGNATURE_PROVIDER || 'simple';

  const provider = providers[providerName.toLowerCase()];

  if (!provider) {
    throw new Error(`Unknown signature provider: ${providerName}. Available: ${Object.keys(providers).join(', ')}`);
  }

  return provider;
}

/**
 * Get simple signature provider with extended methods
 * Use this when you need access to simple provider-specific methods
 * like markViewed(), completeSignature(), etc.
 */
export function getSimpleProvider(): SimpleSignatureProvider {
  return providers.simple as SimpleSignatureProvider;
}
