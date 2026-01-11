#!/bin/bash
set -e

# Configuration
NAMESPACE="tenxdev"
DB_NAME="tenxdev"
TSERVER_POD="yb-tserver-0"
MIGRATIONS_DIR="../../packages/database/drizzle"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== YugabyteDB Database Initialization ===${NC}"

# Get password from secret
DB_PASSWORD=$(kubectl get secret yugabytedb-tenxdev-credentials -n ${NAMESPACE} -o jsonpath='{.data.ysql-password}' | base64 -d)

if [ -z "$DB_PASSWORD" ]; then
  echo -e "${RED}Error: Could not retrieve database password from secret${NC}"
  exit 1
fi

# Wait for YugabyteDB to be ready
echo -e "${YELLOW}Waiting for YugabyteDB to be ready...${NC}"
kubectl wait --for=condition=ready pod -l app=yb-tserver -n ${NAMESPACE} --timeout=300s

# Create database
echo -e "${GREEN}Creating database '${DB_NAME}'...${NC}"
kubectl exec -n ${NAMESPACE} ${TSERVER_POD} -- bash -c "PGPASSWORD='${DB_PASSWORD}' /home/yugabyte/bin/ysqlsh -U yugabyte -c 'CREATE DATABASE ${DB_NAME};'" 2>/dev/null || echo "Database may already exist"

# Run migrations
if [ -d "$MIGRATIONS_DIR" ]; then
  echo -e "${GREEN}Running migrations...${NC}"

  # Get all SQL files sorted by name
  for MIGRATION_FILE in $(ls ${MIGRATIONS_DIR}/*.sql 2>/dev/null | sort); do
    FILENAME=$(basename ${MIGRATION_FILE})
    echo -e "${YELLOW}  Applying: ${FILENAME}${NC}"

    # Copy migration file to pod
    kubectl cp ${MIGRATION_FILE} ${NAMESPACE}/${TSERVER_POD}:/tmp/migration.sql

    # Execute migration
    kubectl exec -n ${NAMESPACE} ${TSERVER_POD} -- bash -c "PGPASSWORD='${DB_PASSWORD}' /home/yugabyte/bin/ysqlsh -U yugabyte -d ${DB_NAME} -f /tmp/migration.sql"

    echo -e "${GREEN}  ✓ ${FILENAME} applied${NC}"
  done

  echo -e "${GREEN}All migrations applied successfully!${NC}"
else
  echo -e "${YELLOW}Migrations directory not found at: ${MIGRATIONS_DIR}${NC}"
  echo -e "${YELLOW}You can run migrations manually later.${NC}"
fi

# Create DATABASE_URL secret for applications
echo -e "${GREEN}Creating DATABASE_URL secret for applications...${NC}"
DATABASE_URL="postgresql://yugabyte:${DB_PASSWORD}@yb-tservers.${NAMESPACE}.svc.cluster.local:5433/${DB_NAME}?sslmode=require"

kubectl create secret generic tenxdev-database-url \
  --namespace=${NAMESPACE} \
  --from-literal=DATABASE_URL="${DATABASE_URL}" \
  --dry-run=client -o yaml | kubectl apply -f -

# Store in GCP Secret Manager
if command -v gcloud &> /dev/null; then
  echo -e "${GREEN}Storing DATABASE_URL in GCP Secret Manager...${NC}"
  echo -n "${DATABASE_URL}" | gcloud secrets create tenxdev-database-url --data-file=- 2>/dev/null || \
  echo -n "${DATABASE_URL}" | gcloud secrets versions add tenxdev-database-url --data-file=-
fi

echo ""
echo -e "${GREEN}=== Database Initialization Complete ===${NC}"
echo ""
echo -e "${YELLOW}Database Details:${NC}"
echo "  Database: ${DB_NAME}"
echo "  Host: yb-tservers.${NAMESPACE}.svc.cluster.local"
echo "  Port: 5433"
echo "  User: yugabyte"
echo ""
echo -e "${YELLOW}DATABASE_URL stored in:${NC}"
echo "  - Kubernetes Secret: tenxdev-database-url"
echo "  - GCP Secret Manager: tenxdev-database-url (if gcloud available)"
echo ""
echo -e "${YELLOW}To connect:${NC}"
echo "  kubectl exec -it -n ${NAMESPACE} ${TSERVER_POD} -- /home/yugabyte/bin/ysqlsh -U yugabyte -d ${DB_NAME}"
