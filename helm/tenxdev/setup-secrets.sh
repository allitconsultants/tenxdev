#!/bin/bash
set -e

# Configuration
NAMESPACE="tenxdev"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== TenxDev Secrets Setup ===${NC}"
echo ""

# Ensure namespace exists
kubectl create namespace ${NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -

# =====================================
# R2 (Cloudflare) Storage Credentials
# =====================================
echo -e "${YELLOW}Setting up R2 storage credentials...${NC}"

# Check if we have R2 credentials in GCP Secret Manager
R2_ACCOUNT_ID=$(gcloud secrets versions access latest --secret=r2-account-id 2>/dev/null || echo "")
R2_ACCESS_KEY_ID=$(gcloud secrets versions access latest --secret=r2-access-key-id 2>/dev/null || echo "")
R2_SECRET_ACCESS_KEY=$(gcloud secrets versions access latest --secret=r2-secret-access-key 2>/dev/null || echo "")
R2_BUCKET_NAME=$(gcloud secrets versions access latest --secret=r2-bucket-name 2>/dev/null || echo "tenxdev-documents")

if [ -z "$R2_ACCOUNT_ID" ] || [ -z "$R2_ACCESS_KEY_ID" ] || [ -z "$R2_SECRET_ACCESS_KEY" ]; then
  echo -e "${YELLOW}R2 credentials not found in GCP Secret Manager.${NC}"
  echo -e "${YELLOW}Please provide R2 credentials:${NC}"

  read -p "R2 Account ID: " R2_ACCOUNT_ID
  read -p "R2 Access Key ID: " R2_ACCESS_KEY_ID
  read -sp "R2 Secret Access Key: " R2_SECRET_ACCESS_KEY
  echo ""
  read -p "R2 Bucket Name [tenxdev-documents]: " R2_BUCKET_INPUT
  R2_BUCKET_NAME=${R2_BUCKET_INPUT:-tenxdev-documents}

  # Store in GCP Secret Manager
  echo -n "$R2_ACCOUNT_ID" | gcloud secrets create r2-account-id --data-file=- 2>/dev/null || \
    echo -n "$R2_ACCOUNT_ID" | gcloud secrets versions add r2-account-id --data-file=-
  echo -n "$R2_ACCESS_KEY_ID" | gcloud secrets create r2-access-key-id --data-file=- 2>/dev/null || \
    echo -n "$R2_ACCESS_KEY_ID" | gcloud secrets versions add r2-access-key-id --data-file=-
  echo -n "$R2_SECRET_ACCESS_KEY" | gcloud secrets create r2-secret-access-key --data-file=- 2>/dev/null || \
    echo -n "$R2_SECRET_ACCESS_KEY" | gcloud secrets versions add r2-secret-access-key --data-file=-
  echo -n "$R2_BUCKET_NAME" | gcloud secrets create r2-bucket-name --data-file=- 2>/dev/null || \
    echo -n "$R2_BUCKET_NAME" | gcloud secrets versions add r2-bucket-name --data-file=-
fi

kubectl create secret generic tenxdev-r2-credentials \
  --namespace=${NAMESPACE} \
  --from-literal=account-id="${R2_ACCOUNT_ID}" \
  --from-literal=access-key-id="${R2_ACCESS_KEY_ID}" \
  --from-literal=secret-access-key="${R2_SECRET_ACCESS_KEY}" \
  --from-literal=bucket-name="${R2_BUCKET_NAME}" \
  --dry-run=client -o yaml | kubectl apply -f -

echo -e "${GREEN}✓ R2 credentials configured${NC}"

# =====================================
# Brevo SMTP Credentials
# =====================================
echo -e "${YELLOW}Setting up Brevo SMTP credentials...${NC}"

BREVO_SMTP_USER=$(gcloud secrets versions access latest --secret=brevo-smtp-user 2>/dev/null || echo "")
BREVO_SMTP_PASSWORD=$(gcloud secrets versions access latest --secret=brevo-smtp-password 2>/dev/null || echo "")

if [ -z "$BREVO_SMTP_USER" ] || [ -z "$BREVO_SMTP_PASSWORD" ]; then
  echo -e "${YELLOW}Brevo credentials not found in GCP Secret Manager.${NC}"
  echo -e "${YELLOW}Please provide Brevo SMTP credentials:${NC}"

  read -p "Brevo SMTP User (login): " BREVO_SMTP_USER
  read -sp "Brevo SMTP Password (master password): " BREVO_SMTP_PASSWORD
  echo ""

  # Store in GCP Secret Manager
  echo -n "$BREVO_SMTP_USER" | gcloud secrets create brevo-smtp-user --data-file=- 2>/dev/null || \
    echo -n "$BREVO_SMTP_USER" | gcloud secrets versions add brevo-smtp-user --data-file=-
  echo -n "$BREVO_SMTP_PASSWORD" | gcloud secrets create brevo-smtp-password --data-file=- 2>/dev/null || \
    echo -n "$BREVO_SMTP_PASSWORD" | gcloud secrets versions add brevo-smtp-password --data-file=-
fi

kubectl create secret generic tenxdev-brevo-credentials \
  --namespace=${NAMESPACE} \
  --from-literal=smtp-user="${BREVO_SMTP_USER}" \
  --from-literal=smtp-password="${BREVO_SMTP_PASSWORD}" \
  --dry-run=client -o yaml | kubectl apply -f -

echo -e "${GREEN}✓ Brevo credentials configured${NC}"

# =====================================
# Clerk Authentication Credentials
# =====================================
echo -e "${YELLOW}Setting up Clerk credentials...${NC}"

CLERK_SECRET_KEY=$(gcloud secrets versions access latest --secret=clerk-secret-key 2>/dev/null || echo "")
CLERK_PUBLISHABLE_KEY=$(gcloud secrets versions access latest --secret=clerk-publishable-key 2>/dev/null || echo "")

if [ -z "$CLERK_SECRET_KEY" ]; then
  echo -e "${YELLOW}Clerk credentials not found in GCP Secret Manager.${NC}"
  echo -e "${YELLOW}Please provide Clerk credentials:${NC}"

  read -sp "Clerk Secret Key: " CLERK_SECRET_KEY
  echo ""
  read -p "Clerk Publishable Key: " CLERK_PUBLISHABLE_KEY

  # Store in GCP Secret Manager
  echo -n "$CLERK_SECRET_KEY" | gcloud secrets create clerk-secret-key --data-file=- 2>/dev/null || \
    echo -n "$CLERK_SECRET_KEY" | gcloud secrets versions add clerk-secret-key --data-file=-
  echo -n "$CLERK_PUBLISHABLE_KEY" | gcloud secrets create clerk-publishable-key --data-file=- 2>/dev/null || \
    echo -n "$CLERK_PUBLISHABLE_KEY" | gcloud secrets versions add clerk-publishable-key --data-file=-
fi

kubectl create secret generic tenxdev-clerk-credentials \
  --namespace=${NAMESPACE} \
  --from-literal=secret-key="${CLERK_SECRET_KEY}" \
  --from-literal=publishable-key="${CLERK_PUBLISHABLE_KEY}" \
  --dry-run=client -o yaml | kubectl apply -f -

echo -e "${GREEN}✓ Clerk credentials configured${NC}"

# =====================================
# Summary
# =====================================
echo ""
echo -e "${GREEN}=== Secrets Setup Complete ===${NC}"
echo ""
echo -e "${YELLOW}Created secrets:${NC}"
echo "  - tenxdev-database-url (from YugabyteDB setup)"
echo "  - tenxdev-r2-credentials"
echo "  - tenxdev-brevo-credentials"
echo "  - tenxdev-clerk-credentials"
echo ""
echo -e "${YELLOW}Verify secrets:${NC}"
echo "  kubectl get secrets -n ${NAMESPACE}"
