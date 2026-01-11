# YugabyteDB for TenxDev

This directory contains Helm configuration for deploying YugabyteDB in the `tenxdev` namespace.

## Prerequisites

- kubectl configured with cluster access
- Helm 3.x installed
- OpenSSL for certificate generation

## Quick Start

### 1. Deploy YugabyteDB

```bash
cd helm/yugabytedb

# For development (single replica, smaller resources)
./deploy.sh --env dev

# For production (3 replicas, full resources)
./deploy.sh --env prod
```

### 2. Initialize Database & Run Migrations

```bash
./init-db.sh
```

This will:
- Create the `tenxdev` database
- Run all migrations from `packages/database/drizzle/`
- Create Kubernetes secret `tenxdev-database-url` with connection string
- Store DATABASE_URL in GCP Secret Manager

## Configuration

### values.yaml
Production configuration with:
- 3 master nodes
- 3 tserver nodes
- TLS enabled
- 50GB storage per tserver

### values-dev.yaml
Development overrides:
- 1 master node
- 1 tserver node
- Smaller resources
- 20GB storage

## Connection Details

| Setting | Value |
|---------|-------|
| Host | `yb-tserver-tenxdev.tenxdev.svc.cluster.local` |
| Port | `5433` |
| Database | `tenxdev` |
| User | `yugabyte` |
| SSL Mode | `require` |

## Manual Connection

```bash
# Via kubectl exec
kubectl exec -it -n tenxdev yb-tserver-tenxdev-0 -- \
  /home/yugabyte/bin/ysqlsh -U yugabyte -d tenxdev

# Via port-forward
kubectl port-forward -n tenxdev svc/yb-tserver-tenxdev 5433:5433
psql "postgresql://yugabyte:PASSWORD@localhost:5433/tenxdev?sslmode=require"
```

## Secrets

| Secret Name | Contents |
|-------------|----------|
| `yugabytedb-tenxdev-tls` | TLS certificates (ca.crt, ca.key, node.crt, node.key) |
| `yugabytedb-tenxdev-credentials` | Database password (ysql-password) |
| `tenxdev-database-url` | Full DATABASE_URL connection string |

## GCP Secret Manager

The following secrets are also stored in GCP Secret Manager:
- `yugabytedb-tenxdev-password` - Database password
- `tenxdev-database-url` - Full connection string

## Running Migrations Manually

```bash
# Copy migration to pod
kubectl cp packages/database/drizzle/0001_add_esignature_tables.sql \
  tenxdev/yb-tserver-tenxdev-0:/tmp/migration.sql

# Execute
kubectl exec -n tenxdev yb-tserver-tenxdev-0 -- \
  /home/yugabyte/bin/ysqlsh -U yugabyte -d tenxdev -f /tmp/migration.sql
```

## Monitoring

Access YugabyteDB UI:
```bash
kubectl port-forward -n tenxdev svc/yb-master-tenxdev 7000:7000
# Open http://localhost:7000
```

## Troubleshooting

### Check pod status
```bash
kubectl get pods -n tenxdev -l app.kubernetes.io/name=yugabyte
```

### View logs
```bash
kubectl logs -n tenxdev yb-tserver-tenxdev-0 -c yb-tserver
kubectl logs -n tenxdev yb-master-tenxdev-0 -c yb-master
```

### Restart pods
```bash
kubectl rollout restart statefulset -n tenxdev yb-tserver-tenxdev
kubectl rollout restart statefulset -n tenxdev yb-master-tenxdev
```
