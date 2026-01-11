#!/bin/bash
set -e

# Configuration
NAMESPACE="tenxdev"
RELEASE_NAME="yugabytedb-tenxdev"
CERT_DIR="/tmp/yugabytedb-tenxdev-certs"
SECRET_NAME="yugabytedb-tenxdev-tls"
PASSWORD_SECRET_NAME="yugabytedb-tenxdev-credentials"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== YugabyteDB Deployment for TenxDev ===${NC}"

# Parse arguments
ENV="dev"
while [[ $# -gt 0 ]]; do
  case $1 in
    --env)
      ENV="$2"
      shift 2
      ;;
    --skip-certs)
      SKIP_CERTS=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

echo -e "${YELLOW}Environment: ${ENV}${NC}"

# Ensure namespace exists
echo -e "${GREEN}Creating namespace if not exists...${NC}"
kubectl create namespace ${NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -

# Generate TLS certificates if not skipping
if [ "$SKIP_CERTS" != "true" ]; then
  echo -e "${GREEN}Generating TLS certificates...${NC}"

  # Clean up old certs
  rm -rf ${CERT_DIR}
  mkdir -p ${CERT_DIR}

  # Generate CA key and certificate
  openssl genrsa -out ${CERT_DIR}/ca.key 4096
  openssl req -new -x509 -days 3650 -key ${CERT_DIR}/ca.key \
    -out ${CERT_DIR}/ca.crt \
    -subj "/CN=YugabyteDB CA/O=TenxDev"

  # Generate server key and CSR
  openssl genrsa -out ${CERT_DIR}/node.key 4096
  openssl req -new -key ${CERT_DIR}/node.key \
    -out ${CERT_DIR}/node.csr \
    -subj "/CN=yugabytedb-tenxdev/O=TenxDev"

  # Create extensions file for SAN
  cat > ${CERT_DIR}/node.ext << EOF
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth, clientAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = *.yb-masters.${NAMESPACE}.svc.cluster.local
DNS.2 = *.yb-tservers.${NAMESPACE}.svc.cluster.local
DNS.3 = yb-master-tenxdev
DNS.4 = yb-tserver-tenxdev
DNS.5 = *.yb-master-tenxdev.${NAMESPACE}.svc.cluster.local
DNS.6 = *.yb-tserver-tenxdev.${NAMESPACE}.svc.cluster.local
DNS.7 = localhost
IP.1 = 127.0.0.1
EOF

  # Sign server certificate
  openssl x509 -req -in ${CERT_DIR}/node.csr \
    -CA ${CERT_DIR}/ca.crt -CAkey ${CERT_DIR}/ca.key \
    -CAcreateserial -out ${CERT_DIR}/node.crt \
    -days 365 -extfile ${CERT_DIR}/node.ext

  # Create Kubernetes secret for TLS
  echo -e "${GREEN}Creating TLS secret...${NC}"
  kubectl create secret generic ${SECRET_NAME} \
    --namespace=${NAMESPACE} \
    --from-file=ca.crt=${CERT_DIR}/ca.crt \
    --from-file=ca.key=${CERT_DIR}/ca.key \
    --from-file=node.crt=${CERT_DIR}/node.crt \
    --from-file=node.key=${CERT_DIR}/node.key \
    --dry-run=client -o yaml | kubectl apply -f -

  echo -e "${GREEN}TLS certificates created successfully${NC}"
fi

# Generate database password
DB_PASSWORD=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 24)

# Create credentials secret
echo -e "${GREEN}Creating credentials secret...${NC}"
kubectl create secret generic ${PASSWORD_SECRET_NAME} \
  --namespace=${NAMESPACE} \
  --from-literal=ysql-password=${DB_PASSWORD} \
  --dry-run=client -o yaml | kubectl apply -f -

# Store password in GCP Secret Manager (optional)
if command -v gcloud &> /dev/null; then
  echo -e "${GREEN}Storing password in GCP Secret Manager...${NC}"
  echo -n "${DB_PASSWORD}" | gcloud secrets create yugabytedb-tenxdev-password --data-file=- 2>/dev/null || \
  echo -n "${DB_PASSWORD}" | gcloud secrets versions add yugabytedb-tenxdev-password --data-file=-
fi

# Add YugabyteDB helm repo
echo -e "${GREEN}Adding YugabyteDB helm repo...${NC}"
helm repo add yugabytedb https://charts.yugabyte.com
helm repo update

# Deploy YugabyteDB
echo -e "${GREEN}Deploying YugabyteDB...${NC}"
VALUES_FILE="values.yaml"
if [ "$ENV" == "dev" ]; then
  VALUES_FILE="values.yaml,values-dev.yaml"
fi

helm upgrade --install ${RELEASE_NAME} yugabytedb/yugabyte \
  --namespace ${NAMESPACE} \
  --values values.yaml \
  $([ "$ENV" == "dev" ] && echo "--values values-dev.yaml") \
  --set authCredentials.ysql.password=${DB_PASSWORD} \
  --set tls.enabled=true \
  --set tls.certManager.enabled=false \
  --set "tls.rootCA.cert=$(cat ${CERT_DIR}/ca.crt | base64 | tr -d '\n')" \
  --set "tls.rootCA.key=$(cat ${CERT_DIR}/ca.key | base64 | tr -d '\n')" \
  --wait --timeout 10m

echo -e "${GREEN}=== Deployment Complete ===${NC}"
echo ""
echo -e "${YELLOW}Connection Details:${NC}"
echo "  Host: yb-tserver-tenxdev.${NAMESPACE}.svc.cluster.local"
echo "  Port: 5433"
echo "  User: yugabyte"
echo "  Password: (stored in secret ${PASSWORD_SECRET_NAME})"
echo ""
echo -e "${YELLOW}Connection String:${NC}"
echo "  postgresql://yugabyte:${DB_PASSWORD}@yb-tserver-tenxdev.${NAMESPACE}.svc.cluster.local:5433/yugabyte?sslmode=require"
echo ""
echo -e "${YELLOW}To connect via kubectl:${NC}"
echo "  kubectl exec -it -n ${NAMESPACE} yb-tserver-tenxdev-0 -- /home/yugabyte/bin/ysqlsh -U yugabyte"
echo ""
echo -e "${GREEN}Don't forget to create the 'tenxdev' database and run migrations!${NC}"
