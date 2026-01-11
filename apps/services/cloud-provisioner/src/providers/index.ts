export type { CloudProvider, CloudAccountInfo, CloudResource, CloudCosts, TransferChecklist } from './base.js';

import { awsProvider } from './aws.js';
import { gcpProvider } from './gcp.js';
import { azureProvider } from './azure.js';
import type { CloudProvider } from './base.js';

export { awsProvider } from './aws.js';
export { gcpProvider } from './gcp.js';
export { azureProvider } from './azure.js';

const providers: Record<string, CloudProvider> = {
  aws: awsProvider,
  gcp: gcpProvider,
  azure: azureProvider,
};

export function getProvider(name: string): CloudProvider {
  const provider = providers[name.toLowerCase()];
  if (!provider) {
    throw new Error(`Unsupported cloud provider: ${name}. Supported providers: ${Object.keys(providers).join(', ')}`);
  }
  return provider;
}

export function getSupportedProviders(): string[] {
  return Object.keys(providers);
}
