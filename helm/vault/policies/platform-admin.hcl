# Policy for TenxDev platform administrators
# Full access to all secrets

# Full access to platform secrets
path "secret/data/platform/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

path "secret/metadata/platform/*" {
  capabilities = ["list", "read", "delete"]
}

# Full access to customer secrets
path "secret/data/customers/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

path "secret/metadata/customers/*" {
  capabilities = ["list", "read", "delete"]
}

# Full access to shared secrets
path "secret/data/shared/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

path "secret/metadata/shared/*" {
  capabilities = ["list", "read", "delete"]
}

# Manage auth methods
path "auth/*" {
  capabilities = ["create", "read", "update", "delete", "list", "sudo"]
}

# Manage policies
path "sys/policies/acl/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

# View system health
path "sys/health" {
  capabilities = ["read"]
}
