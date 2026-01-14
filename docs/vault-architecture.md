# HashiCorp Vault Architecture for TenxDev

## Overview

Multi-tenant secret management for hosted customers with clear separation between platform secrets and customer secrets.

## Secret Path Structure

```
secret/
├── platform/                          # TenxDev infrastructure (migrated from GCP SM)
│   ├── env/
│   │   ├── production/
│   │   │   ├── database-url
│   │   │   ├── jwt-secret
│   │   │   ├── brevo-smtp-key
│   │   │   └── anthropic-api-key
│   │   ├── staging/
│   │   └── development/
│   ├── cloudflare/
│   │   ├── account-id
│   │   ├── api-token
│   │   ├── r2-access-key-id
│   │   ├── r2-secret-access-key
│   │   └── turnstile-secret-key
│   ├── integrations/
│   │   ├── telegram-bot-token
│   │   ├── google-calendar-id
│   │   └── sendgrid-api-key
│   └── certificates/
│       ├── origin-ca-cert
│       └── origin-ca-key
│
├── customers/                         # Per-customer secrets
│   ├── {customer_id}/                 # e.g., "acme-corp", "globex-inc"
│   │   ├── config/
│   │   │   ├── settings              # { "feature_flags": {...}, "limits": {...} }
│   │   │   └── branding              # { "logo_url": "...", "primary_color": "..." }
│   │   ├── database/
│   │   │   ├── primary               # { "url": "postgres://...", "pool_size": 10 }
│   │   │   └── replica               # For read replicas if applicable
│   │   ├── sso/
│   │   │   ├── provider              # "okta" | "azure-ad" | "google" | "saml"
│   │   │   ├── client-id
│   │   │   ├── client-secret
│   │   │   ├── issuer-url
│   │   │   ├── saml-certificate      # For SAML providers
│   │   │   └── saml-private-key
│   │   ├── integrations/
│   │   │   ├── openai-api-key        # Customer's own API key (optional)
│   │   │   ├── anthropic-api-key
│   │   │   ├── webhook-secret        # For incoming webhooks
│   │   │   └── custom/               # Customer-defined integrations
│   │   │       ├── salesforce
│   │   │       ├── slack
│   │   │       └── {integration_name}
│   │   ├── encryption/
│   │   │   ├── data-key              # AES key for encrypting customer data at rest
│   │   │   └── signing-key           # For document signing
│   │   └── documents/
│   │       ├── storage-bucket        # R2/S3 bucket for this customer
│   │       └── signing-certificate   # For e-signatures
│   │
│   ├── acme-corp/                     # Example customer
│   │   └── ...
│   └── globex-inc/                    # Example customer
│       └── ...
│
└── shared/                            # Secrets shared across customers
    ├── signing/
    │   └── platform-certificate      # TenxDev's signing certificate
    └── encryption/
        └── master-key                # For envelope encryption
```

## Vault Policies

### Platform Admin Policy
```hcl
# policies/platform-admin.hcl
path "secret/data/platform/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

path "secret/data/customers/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

path "secret/metadata/*" {
  capabilities = ["list", "read", "delete"]
}
```

### Platform Service Policy (Backend API)
```hcl
# policies/platform-service.hcl
# Can read platform secrets
path "secret/data/platform/env/{{identity.entity.aliases.kubernetes.metadata.service_account_namespace}}/*" {
  capabilities = ["read"]
}

path "secret/data/platform/cloudflare/*" {
  capabilities = ["read"]
}

path "secret/data/platform/integrations/*" {
  capabilities = ["read"]
}

# Can read any customer's secrets (multi-tenant app)
path "secret/data/customers/*" {
  capabilities = ["read"]
}

# Can read shared secrets
path "secret/data/shared/*" {
  capabilities = ["read"]
}
```

### Customer Admin Policy (Template)
```hcl
# policies/customer-admin.hcl.tpl
# Customer can only manage their own secrets
path "secret/data/customers/{{identity.entity.metadata.customer_id}}/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

path "secret/metadata/customers/{{identity.entity.metadata.customer_id}}/*" {
  capabilities = ["list", "read"]
}

# Cannot access platform or other customer secrets
path "secret/data/platform/*" {
  capabilities = ["deny"]
}

path "secret/data/customers/*" {
  capabilities = ["deny"]
}
```

## Authentication Methods

### 1. Kubernetes Auth (for services)
```hcl
# Backend services authenticate via ServiceAccount
vault auth enable kubernetes

vault write auth/kubernetes/config \
    kubernetes_host="https://$KUBERNETES_HOST:443" \
    kubernetes_ca_cert=@/var/run/secrets/kubernetes.io/serviceaccount/ca.crt

vault write auth/kubernetes/role/tenxdev-backend \
    bound_service_account_names=tenxdev-backend \
    bound_service_account_namespaces=tenxdev \
    policies=platform-service \
    ttl=1h
```

### 2. OIDC Auth (for customer admins via portal)
```hcl
# Customers authenticate via WorkOS/Auth0
vault auth enable oidc

vault write auth/oidc/config \
    oidc_discovery_url="https://auth.tenxdev.ai/.well-known/openid-configuration" \
    oidc_client_id="vault-client" \
    oidc_client_secret="..." \
    default_role="customer-admin"

vault write auth/oidc/role/customer-admin \
    bound_audiences="vault-client" \
    allowed_redirect_uris="https://vault.tenxdev.ai/ui/vault/auth/oidc/callback" \
    user_claim="sub" \
    policies="customer-admin" \
    ttl=4h \
    bound_claims_type="glob" \
    bound_claims='{"customer_id": "*"}'
```

### 3. AppRole (for CI/CD)
```hcl
vault auth enable approle

vault write auth/approle/role/github-actions \
    token_policies="deploy-secrets" \
    token_ttl=20m \
    token_max_ttl=30m \
    secret_id_num_uses=1
```

## Dynamic Secrets (Future)

### Database Credentials
```hcl
# Each customer gets short-lived database credentials
vault secrets enable database

vault write database/config/customer-acme-corp \
    plugin_name=postgresql-database-plugin \
    connection_url="postgresql://{{username}}:{{password}}@db.acme-corp.tenxdev.ai:5432/main" \
    allowed_roles="acme-corp-readonly,acme-corp-readwrite" \
    username="vault-admin" \
    password="..."

vault write database/roles/acme-corp-readonly \
    db_name=customer-acme-corp \
    creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; GRANT SELECT ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
    default_ttl="1h" \
    max_ttl="24h"
```

## Application Integration

### Backend Service (Node.js)
```typescript
// packages/service-utils/src/vault.ts
import Vault from 'node-vault';

const vault = Vault({
  apiVersion: 'v1',
  endpoint: process.env.VAULT_ADDR,
});

// Authenticate using Kubernetes ServiceAccount
async function authenticate() {
  const jwt = await fs.readFile('/var/run/secrets/kubernetes.io/serviceaccount/token', 'utf8');
  const { auth } = await vault.kubernetesLogin({
    role: 'tenxdev-backend',
    jwt,
  });
  vault.token = auth.client_token;
}

// Get platform secret
export async function getPlatformSecret(path: string): Promise<string> {
  const { data } = await vault.read(`secret/data/platform/${path}`);
  return data.data;
}

// Get customer secret
export async function getCustomerSecret(customerId: string, path: string): Promise<string> {
  const { data } = await vault.read(`secret/data/customers/${customerId}/${path}`);
  return data.data;
}

// Cache with TTL
const secretCache = new Map<string, { value: any; expiry: number }>();

export async function getCachedSecret(path: string, ttlMs = 300000): Promise<any> {
  const cached = secretCache.get(path);
  if (cached && cached.expiry > Date.now()) {
    return cached.value;
  }

  const value = await vault.read(`secret/data/${path}`);
  secretCache.set(path, { value: value.data.data, expiry: Date.now() + ttlMs });
  return value.data.data;
}
```

### Usage in Request Handler
```typescript
// apps/services/documents/src/routes/signatures.ts
import { getCustomerSecret } from '@tenxdev/service-utils/vault';

async function signDocument(req: Request) {
  const customerId = req.auth.customerId; // From JWT

  // Get customer's signing key from Vault
  const { privateKey, certificate } = await getCustomerSecret(
    customerId,
    'documents/signing-certificate'
  );

  // Get customer's SSO config for audit log
  const ssoConfig = await getCustomerSecret(customerId, 'sso/provider');

  // Sign the document...
}
```

## Customer Onboarding Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  1. Customer signs up                                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. Backend creates customer record in database                  │
│     customer_id = "acme-corp"                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. Backend provisions secrets in Vault                          │
│                                                                  │
│     vault.write('secret/data/customers/acme-corp/config/settings', {  │
│       data: { feature_flags: {}, limits: { users: 10 } }         │
│     });                                                          │
│                                                                  │
│     vault.write('secret/data/customers/acme-corp/encryption/data-key', { │
│       data: { key: generateAES256Key() }                         │
│     });                                                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. Customer configures SSO in portal                            │
│                                                                  │
│     POST /api/customers/acme-corp/sso                            │
│     {                                                            │
│       "provider": "okta",                                        │
│       "client_id": "...",                                        │
│       "client_secret": "...",                                    │
│       "issuer_url": "https://acme.okta.com"                      │
│     }                                                            │
│                                                                  │
│     → Backend stores in Vault:                                   │
│       secret/data/customers/acme-corp/sso/*                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. Customer's users authenticate                                │
│                                                                  │
│     → Backend reads SSO config from Vault                        │
│     → Redirects to customer's IdP                                │
│     → Validates tokens using customer's secrets                  │
└─────────────────────────────────────────────────────────────────┘
```

## Migration Plan from GCP Secret Manager

### Phase 1: Deploy Vault
1. Deploy Vault to Kubernetes (HA mode with Raft storage)
2. Configure Kubernetes auth
3. Set up backup/restore procedures

### Phase 2: Migrate Platform Secrets
```bash
# Script to migrate from GCP SM to Vault
for secret in brevo-tenxdev-smtp-key claude-tenx-api-key jwt-secret-tenxdev; do
  value=$(gcloud secrets versions access latest --secret=$secret)
  vault kv put secret/platform/env/production/$secret value="$value"
done
```

### Phase 3: Update Application
1. Add Vault client to `@tenxdev/service-utils`
2. Update config to read from Vault with GCP SM fallback
3. Gradually migrate services

### Phase 4: Customer Secrets
1. Build customer onboarding flow
2. Build SSO configuration UI
3. Implement per-customer secret management

## Vault Deployment (Kubernetes)

```yaml
# helm/vault/values.yaml
server:
  ha:
    enabled: true
    replicas: 3
    raft:
      enabled: true

  dataStorage:
    enabled: true
    size: 10Gi
    storageClass: premium-rwo

  auditStorage:
    enabled: true
    size: 10Gi

  ingress:
    enabled: true
    hosts:
      - host: vault.tenxdev.ai
        paths:
          - /
    tls:
      - secretName: vault-tls
        hosts:
          - vault.tenxdev.ai

ui:
  enabled: true

injector:
  enabled: true  # For sidecar injection
```

## Cost Comparison

| Aspect | GCP Secret Manager | HashiCorp Vault |
|--------|-------------------|-----------------|
| Pricing | $0.03/secret/month + $0.03/10k accesses | Self-hosted (compute cost) or HCP ~$0.03/secret |
| 100 customers × 10 secrets | ~$30/month | ~$150/month (3 node HA) |
| 1000 customers × 10 secrets | ~$300/month | ~$150/month (same) |
| Dynamic secrets | No | Yes |
| Multi-cloud | No | Yes |
| Customer self-service | Limited | Full UI/API |

## Recommendation

**Start with Vault when:**
- You have 10+ hosted customers
- Customers need to manage their own secrets (SSO config, API keys)
- You need dynamic database credentials
- You want customer audit logs

**Until then:**
- Keep using GCP Secret Manager for platform secrets
- Store customer configs in database (encrypted)
- Move to Vault when multi-tenant complexity increases
