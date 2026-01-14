# Policy for TenxDev backend services
# Allows reading platform secrets and all customer secrets

# Read platform secrets
path "secret/data/platform/*" {
  capabilities = ["read"]
}

path "secret/metadata/platform/*" {
  capabilities = ["list", "read"]
}

# Read all customer secrets (multi-tenant app identifies customer from JWT)
path "secret/data/customers/*" {
  capabilities = ["read"]
}

path "secret/metadata/customers/*" {
  capabilities = ["list", "read"]
}

# Read shared secrets
path "secret/data/shared/*" {
  capabilities = ["read"]
}

# Create/update customer secrets (for onboarding flow)
path "secret/data/customers/+/config/*" {
  capabilities = ["create", "update", "read"]
}

path "secret/data/customers/+/encryption/*" {
  capabilities = ["create", "update", "read"]
}
