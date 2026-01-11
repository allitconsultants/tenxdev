# tenxdev.ai Platform Specification

## Executive Summary

Build a comprehensive SaaS platform that enables tenxdev.ai to offer end-to-end software development services with integrated billing, project tracking, domain management, and cloud account provisioning. Clients can select packages, track progress, manage domains, and receive fully transferable cloud infrastructure upon project completion.

---

## Table of Contents

1. [Platform Architecture](#platform-architecture)
2. [Microservices Architecture](#microservices-architecture)
3. [Cloud Provisioner Service](#cloud-provisioner-service)
4. [Terraform State & IaC Ownership](#terraform-state--iac-ownership)
5. [Service Packages](#service-packages)
6. [Contract Templates](#contract-templates)
7. [Technical Specification](#technical-specification)
8. [Database Schema](#database-schema)
9. [Implementation Phases](#implementation-phases)
10. [Pricing Model](#pricing-model)

---

## Platform Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CUSTOMER PORTAL                                  │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐           │
│  │ Dashboard  │ │  Packages  │ │  Projects  │ │  Domains   │           │
│  │            │ │  & Pricing │ │  Tracking  │ │  Manager   │           │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘           │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐                          │
│  │  Billing   │ │  Documents │ │  Support   │                          │
│  │  & Invoices│ │  & Contracts│ │  Chat     │                          │
│  └────────────┘ └────────────┘ └────────────┘                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            BACKEND API                                   │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐           │
│  │    Auth    │ │  Billing   │ │  Projects  │ │  Domains   │           │
│  │   (Clerk)  │ │  (Stripe)  │ │  Service   │ │  Service   │           │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘           │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐           │
│  │ Documents  │ │   Cloud    │ │   Email    │ │ Background │           │
│  │  Service   │ │ Provisioner│ │  (Resend)  │ │   Jobs     │           │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘           │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       CLOUD PROVISIONING LAYER                           │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐              │
│  │      AWS       │ │      GCP       │ │     Azure      │              │
│  │  Organizations │ │   Projects     │ │  Subscriptions │              │
│  │  - Member Accts│ │   - Folders    │ │  - Resource Grp│              │
│  │  - IAM Roles   │ │   - IAM        │ │  - RBAC        │              │
│  └────────────────┘ └────────────────┘ └────────────────┘              │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        EXTERNAL INTEGRATIONS                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     │
│  │  Stripe  │ │Cloudflare│ │  GitHub  │ │  Linear  │ │  Resend  │     │
│  │ Payments │ │ Domains  │ │   Repos  │ │ Projects │ │  Email   │     │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘     │
└─────────────────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | Next.js 14 (App Router) | Customer portal UI |
| UI Components | shadcn/ui + Tailwind CSS | Consistent design system |
| Authentication | Clerk | User auth, organizations, RBAC |
| Database | YugabyteDB (single-node, scale as needed) | Primary data store, PostgreSQL-compatible, cross-region ready |
| ORM | Drizzle | Type-safe database queries (PostgreSQL dialect) |
| Payments | Stripe | Subscriptions, invoices, checkout |
| File Storage | Cloudflare R2 | Documents, contracts, assets |
| Email | Resend | Transactional emails |
| Domain Registration | Cloudflare Registrar API | Domain purchases |
| Background Jobs | Inngest | Async workflows, cron jobs |
| Hosting | Vercel / Kubernetes | Frontend and microservices |
| IaC | Terraform | Cloud account provisioning |

**Database Scaling Path:**
- **Day 1:** Single-node YugabyteDB in existing Kubernetes cluster (~3GB RAM)
- **Growth:** Scale to 3 tservers/masters for HA (same cluster)
- **Multi-region:** Add clusters in other regions with async replication

---

## Microservices Architecture

### Overview

The platform is built as a distributed system of 8 microservices, each handling a specific domain.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API GATEWAY                                     │
│                         (Next.js API Routes)                                 │
│                    api.platform.tenxdev.ai                                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌───────────────┐         ┌───────────────┐         ┌───────────────┐
│   PROJECTS    │         │    BILLING    │         │    DOMAINS    │
│   SERVICE     │         │    SERVICE    │         │    SERVICE    │
├───────────────┤         ├───────────────┤         ├───────────────┤
│ - CRUD        │         │ - Stripe      │         │ - Cloudflare  │
│ - Milestones  │         │ - Invoices    │         │ - DNS mgmt    │
│ - Status      │         │ - Subs        │         │ - Registration│
│ - Activity    │         │ - Webhooks    │         │ - Renewals    │
└───────────────┘         └───────────────┘         └───────────────┘
        │                           │                           │
        └───────────────────────────┼───────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌───────────────┐         ┌───────────────┐         ┌───────────────┐
│    CLOUD      │         │   DOCUMENTS   │         │ NOTIFICATIONS │
│  PROVISIONER  │         │    SERVICE    │         │    SERVICE    │
├───────────────┤         ├───────────────┤         ├───────────────┤
│ - AWS Orgs    │         │ - R2 Storage  │         │ - Email       │
│ - GCP Projects│         │ - Contracts   │         │ - In-app      │
│ - Azure Subs  │         │ - E-signatures│         │ - Webhooks    │
│ - Transfers   │         │ - Versioning  │         │ - SMS (future)│
└───────────────┘         └───────────────┘         └───────────────┘
        │                           │                           │
        └───────────────────────────┼───────────────────────────┘
                                    │
                                    ▼
                        ┌───────────────────┐
                        │   BACKGROUND      │
                        │   JOBS SERVICE    │
                        ├───────────────────┤
                        │ - Cron jobs       │
                        │ - Async workflows │
                        │ - Retries         │
                        │ - Scheduled tasks │
                        └───────────────────┘
```

### Service Summary

| # | Service | Tech | Port | Purpose |
|---|---------|------|------|---------|
| 1 | **API Gateway** | Next.js | 3000 | Request routing, auth middleware, rate limiting |
| 2 | **Projects** | Hono | 3001 | Project CRUD, milestones, activity logging |
| 3 | **Billing** | Hono | 3002 | Stripe integration, invoices, subscriptions |
| 4 | **Domains** | Hono | 3003 | Cloudflare integration, DNS management |
| 5 | **Cloud Provisioner** | Hono + Terraform | 3004 | Cloud accounts, infrastructure, transfers |
| 6 | **Documents** | Hono | 3005 | File storage, contracts, e-signatures |
| 7 | **Notifications** | Hono | 3006 | Email, in-app notifications, webhooks |
| 8 | **Background Jobs** | Inngest | 3007 | Cron jobs, async workflows |

---

### Service 1: API Gateway

**Purpose:** Central entry point for all API requests.

| Responsibility | Details |
|----------------|---------|
| Authentication | Clerk middleware, JWT validation |
| Rate Limiting | Per-user and per-org limits |
| Request Routing | Route to appropriate service |
| Response Caching | Cache common queries |
| Logging | Request/response logging |

```
Port: 3000
Tech: Next.js API Routes
```

---

### Service 2: Projects Service

**Purpose:** Manage client projects, milestones, and activity tracking.

| Responsibility | Details |
|----------------|---------|
| Project CRUD | Create, read, update projects |
| Milestone Management | Milestone lifecycle |
| Status Machine | Project state transitions |
| Activity Logging | Track all project events |
| GitHub Sync | Repo status, commits |

**API Endpoints:**
```
POST   /projects
GET    /projects
GET    /projects/:id
PATCH  /projects/:id
DELETE /projects/:id
GET    /projects/:id/milestones
POST   /projects/:id/milestones
PATCH  /projects/:id/milestones/:mid
GET    /projects/:id/activity
```

**Database Tables:** `projects`, `milestones`, `activity_logs`

---

### Service 3: Billing Service

**Purpose:** Handle all payment processing via Stripe.

| Responsibility | Details |
|----------------|---------|
| Stripe Integration | Customer, products, prices |
| Checkout Sessions | One-time and subscription |
| Invoice Management | Create, send, track invoices |
| Webhook Processing | Stripe event handling |
| Payment Methods | Card management |
| Subscription Lifecycle | Create, update, cancel |

**API Endpoints:**
```
POST   /billing/checkout-session
GET    /billing/invoices
GET    /billing/invoices/:id
POST   /billing/invoices/:id/pay
GET    /billing/payment-methods
POST   /billing/payment-methods
DELETE /billing/payment-methods/:id
GET    /billing/subscriptions
POST   /billing/subscriptions
DELETE /billing/subscriptions/:id
POST   /billing/webhooks/stripe
```

**Database Tables:** `invoices`, `payment_methods`, `subscriptions`

---

### Service 4: Domains Service

**Purpose:** Domain registration and DNS management via Cloudflare.

| Responsibility | Details |
|----------------|---------|
| Domain Search | Check availability via Cloudflare |
| Registration | Purchase domains |
| DNS Management | A, CNAME, TXT records |
| Auto-Configuration | Set up DNS for projects |
| Renewals | Handle domain renewals |
| Transfers | Transfer domains out |

**API Endpoints:**
```
GET    /domains/search?query=example
GET    /domains
POST   /domains/register
GET    /domains/:id
DELETE /domains/:id
GET    /domains/:id/dns
POST   /domains/:id/dns
DELETE /domains/:id/dns/:recordId
POST   /domains/:id/configure/:projectId
POST   /domains/:id/renew
```

**Database Tables:** `domains`, `dns_records`

---

### Service 5: Cloud Provisioner Service

See [Cloud Provisioner Service](#cloud-provisioner-service) section for detailed documentation.

---

### Service 6: Documents Service

**Purpose:** File storage, contracts, and e-signatures.

| Responsibility | Details |
|----------------|---------|
| File Upload | Upload to Cloudflare R2 |
| File Download | Signed URL generation |
| Contract Templates | Generate from templates |
| E-Signatures | DocuSign/HelloSign integration |
| Versioning | Track document versions |

**API Endpoints:**
```
POST   /documents/upload
GET    /documents/:id
GET    /documents/:id/download
DELETE /documents/:id
GET    /documents/project/:projectId
POST   /documents/contract/generate
POST   /documents/:id/sign/request
POST   /documents/:id/sign/complete
GET    /documents/:id/versions
```

**Database Tables:** `documents`, `document_versions`, `signatures`

---

### Service 7: Notifications Service

**Purpose:** All outbound communications.

| Responsibility | Details |
|----------------|---------|
| Email Sending | Resend integration |
| Email Templates | React Email templates |
| In-App Notifications | Real-time + stored |
| Notification Preferences | User settings |
| Webhook Delivery | External integrations |

**API Endpoints:**
```
POST   /notifications/email
POST   /notifications/in-app
GET    /notifications
PATCH  /notifications/:id/read
POST   /notifications/mark-all-read
GET    /notifications/preferences
PATCH  /notifications/preferences
POST   /notifications/webhook
```

**Database Tables:** `notifications`, `notification_preferences`

---

### Service 8: Background Jobs Service

**Purpose:** Scheduled and async job processing.

| Responsibility | Details |
|----------------|---------|
| Scheduled Jobs | Cron-based tasks |
| Async Workflows | Multi-step processes |
| Retries | Failed job retry logic |
| Event Processing | React to system events |

**Jobs:**
```
domain.check-expiring      (daily)
domain.auto-renew          (daily)
billing.send-reminders     (daily)
billing.retry-failed       (hourly)
cloud.sync-costs           (daily)
cloud.check-health         (every 5 min)
projects.cleanup-drafts    (weekly)
notifications.digest       (daily)
transfers.execute-step     (on-demand)
transfers.verify           (on-demand)
```

---

### Service Communication

**Synchronous (HTTP/REST):**
```
Gateway → Services: REST API calls
Services → Services: Internal REST (rare)
```

**Asynchronous (Events via Inngest):**
```
Events:
  - project.created
  - project.status.changed
  - milestone.completed
  - payment.received
  - payment.failed
  - domain.registered
  - domain.expiring
  - transfer.initiated
  - transfer.completed
```

---

### Deployment Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                         KUBERNETES                              │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   Gateway   │  │  Projects   │  │   Billing   │            │
│  │   (2 pods)  │  │  (2 pods)   │  │  (2 pods)   │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   Domains   │  │    Cloud    │  │  Documents  │            │
│  │   (2 pods)  │  │  (2 pods)   │  │  (2 pods)   │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐                              │
│  │   Notifs    │  │    Jobs     │                              │
│  │   (2 pods)  │  │  (2 pods)   │                              │
│  └─────────────┘  └─────────────┘                              │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│                        DATA LAYER                               │
├────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │ YugabyteDB  │  │    Redis    │  │ Cloudflare  │            │
│  │(single-node)│  │   (Cache)   │  │     R2      │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
└────────────────────────────────────────────────────────────────┘
```

---

## Cloud Provisioner Service

### Overview

The Cloud Provisioner Service is the most complex microservice, handling cloud account creation, infrastructure provisioning via Terraform, resource tracking, cost management, and account transfers.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CLOUD PROVISIONER SERVICE                             │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                           API LAYER                                   │  │
│  │                         (Hono/Express)                                │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                    │                                        │
│          ┌─────────────────────────┼─────────────────────────┐             │
│          │                         │                         │             │
│          ▼                         ▼                         ▼             │
│  ┌──────────────┐         ┌──────────────┐         ┌──────────────┐       │
│  │   AWS        │         │   GCP        │         │   Azure      │       │
│  │   Provider   │         │   Provider   │         │   Provider   │       │
│  ├──────────────┤         ├──────────────┤         ├──────────────┤       │
│  │ Organizations│         │ Resource Mgr │         │ ARM API      │       │
│  │ IAM          │         │ IAM          │         │ RBAC         │       │
│  │ Cost Explorer│         │ Billing      │         │ Cost Mgmt    │       │
│  │ Secrets Mgr  │         │ Secret Mgr   │         │ Key Vault    │       │
│  └──────────────┘         └──────────────┘         └──────────────┘       │
│          │                         │                         │             │
│          └─────────────────────────┼─────────────────────────┘             │
│                                    │                                        │
│                                    ▼                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                      TERRAFORM EXECUTOR                               │  │
│  │                                                                       │  │
│  │   ┌────────────┐    ┌────────────┐    ┌────────────┐                │  │
│  │   │  Modules   │    │   State    │    │  Workspaces│                │  │
│  │   │  Library   │    │  Backend   │    │  Per-Client│                │  │
│  │   └────────────┘    └────────────┘    └────────────┘                │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                    │                                        │
│                                    ▼                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                      TRANSFER ENGINE                                  │  │
│  │                                                                       │  │
│  │   ┌────────────┐    ┌────────────┐    ┌────────────┐                │  │
│  │   │  Checklist │    │  Executor  │    │  Verifier  │                │  │
│  │   │  Manager   │    │  Workflows │    │            │                │  │
│  │   └────────────┘    └────────────┘    └────────────┘                │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Service Responsibilities by Phase

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CLOUD PROVISIONER SERVICE ROLES                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PHASE 1: PROJECT SETUP                                                      │
│  ─────────────────────                                                       │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ • Create cloud account/project                                          │ │
│  │ • Set up management IAM roles                                           │ │
│  │ • Create GitHub repos (app + infra)                                     │ │
│  │ • Initialize Terraform state backend                                    │ │
│  │ • Set up CI/CD secrets in GitHub                                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  PHASE 2: INITIAL PROVISIONING                                               │
│  ─────────────────────────────                                               │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ • Run Terraform to create base infrastructure                           │ │
│  │ • Set up Kubernetes cluster                                             │ │
│  │ • Deploy observability stack                                            │ │
│  │ • Configure networking & security                                       │ │
│  │ • Set up databases                                                      │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  PHASE 3: ONGOING (MANAGED SERVICE ONLY)                                     │
│  ───────────────────────────────────────                                     │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ • Infrastructure updates via Terraform                                  │ │
│  │ • Scaling adjustments                                                   │ │
│  │ • Security patching                                                     │ │
│  │ • Cost optimization                                                     │ │
│  │ • Incident response                                                     │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  PHASE 4: TRANSFER (TIER 1 & 2)                                              │
│  ──────────────────────────────                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ • Migrate Terraform state to customer's bucket                          │ │
│  │ • Transfer GitHub repos to customer's org                               │ │
│  │ • Rotate all credentials                                                │ │
│  │ • Remove tenxdev access                                                 │ │
│  │ • Transfer cloud account ownership                                      │ │
│  │ • Generate handover documentation                                       │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
apps/cloud-provisioner/
├── src/
│   ├── index.ts                 # Service entry point
│   ├── app.ts                   # Hono app setup
│   ├── config/
│   │   └── index.ts             # Environment config
│   ├── routes/
│   │   ├── index.ts             # Route aggregator
│   │   ├── accounts.ts          # Account CRUD
│   │   ├── provision.ts         # Provisioning endpoints
│   │   ├── resources.ts         # Resource inventory
│   │   ├── costs.ts             # Cost tracking
│   │   └── transfers.ts         # Transfer workflow
│   ├── providers/
│   │   ├── base.ts              # Abstract provider interface
│   │   ├── aws/
│   │   │   ├── index.ts         # AWS provider
│   │   │   ├── organizations.ts # AWS Organizations API
│   │   │   ├── iam.ts           # IAM management
│   │   │   ├── secrets.ts       # Secrets Manager
│   │   │   ├── costs.ts         # Cost Explorer
│   │   │   └── transfer.ts      # Account transfer
│   │   ├── gcp/
│   │   │   ├── index.ts         # GCP provider
│   │   │   ├── projects.ts      # Resource Manager
│   │   │   ├── iam.ts           # IAM management
│   │   │   ├── secrets.ts       # Secret Manager
│   │   │   ├── billing.ts       # Billing API
│   │   │   └── transfer.ts      # Project transfer
│   │   └── azure/
│   │       ├── index.ts         # Azure provider
│   │       ├── subscriptions.ts # Subscription management
│   │       ├── rbac.ts          # RBAC management
│   │       ├── keyvault.ts      # Key Vault
│   │       ├── costs.ts         # Cost Management
│   │       └── transfer.ts      # Subscription transfer
│   ├── terraform/
│   │   ├── executor.ts          # Terraform CLI wrapper
│   │   ├── workspace.ts         # Workspace management
│   │   ├── state.ts             # State backend config
│   │   └── modules/
│   │       ├── aws-base/        # AWS base infrastructure
│   │       ├── gcp-base/        # GCP base infrastructure
│   │       ├── azure-base/      # Azure base infrastructure
│   │       ├── kubernetes/      # K8s cluster module
│   │       ├── database/        # Managed DB module
│   │       └── observability/   # Monitoring stack
│   ├── transfers/
│   │   ├── checklist.ts         # Checklist management
│   │   ├── executor.ts          # Transfer execution
│   │   ├── verifier.ts          # Post-transfer verification
│   │   └── credentials.ts       # Credential rotation
│   ├── services/
│   │   ├── inventory.ts         # Resource inventory
│   │   ├── costs.ts             # Cost aggregation
│   │   └── health.ts            # Health checks
│   ├── db/
│   │   ├── schema.ts            # Drizzle schema
│   │   └── queries.ts           # Database queries
│   └── utils/
│       ├── logger.ts
│       ├── errors.ts
│       └── crypto.ts            # Credential encryption
├── terraform/                   # Terraform modules
│   ├── modules/
│   │   ├── aws/
│   │   │   ├── account/
│   │   │   ├── eks/
│   │   │   ├── rds/
│   │   │   ├── s3/
│   │   │   └── observability/
│   │   ├── gcp/
│   │   │   ├── project/
│   │   │   ├── gke/
│   │   │   ├── cloudsql/
│   │   │   ├── storage/
│   │   │   └── observability/
│   │   └── azure/
│   │       ├── subscription/
│   │       ├── aks/
│   │       ├── database/
│   │       ├── storage/
│   │       └── observability/
│   └── templates/
│       ├── aws-full-stack.tf
│       ├── gcp-full-stack.tf
│       └── azure-full-stack.tf
├── Dockerfile
├── package.json
└── tsconfig.json
```

### API Endpoints

**Account Management:**
```
POST   /api/v1/accounts                    Create new cloud account/project
GET    /api/v1/accounts                    List all managed accounts
GET    /api/v1/accounts/:id                Get account details
DELETE /api/v1/accounts/:id                Delete/cleanup account (admin only)
```

**Provisioning:**
```
POST   /api/v1/accounts/:id/provision           Trigger infrastructure provisioning
GET    /api/v1/accounts/:id/provision/status    Get provisioning status
POST   /api/v1/accounts/:id/provision/plan      Generate Terraform plan (dry run)
POST   /api/v1/accounts/:id/provision/apply     Apply Terraform changes
POST   /api/v1/accounts/:id/provision/destroy   Destroy infrastructure (admin only)
```

**Resources:**
```
GET    /api/v1/accounts/:id/resources           List all resources in account
GET    /api/v1/accounts/:id/resources/summary   Resource count by type
GET    /api/v1/accounts/:id/resources/:rid      Get specific resource details
POST   /api/v1/accounts/:id/resources/sync      Force sync resource inventory
```

**Costs:**
```
GET    /api/v1/accounts/:id/costs               Get current month costs
GET    /api/v1/accounts/:id/costs/history       Get historical costs (12 months)
GET    /api/v1/accounts/:id/costs/forecast      Get cost forecast
GET    /api/v1/accounts/:id/costs/breakdown     Cost breakdown by service
```

**Transfers:**
```
GET    /api/v1/accounts/:id/transfer            Get transfer status and checklist
POST   /api/v1/accounts/:id/transfer/initiate   Start transfer process
PATCH  /api/v1/accounts/:id/transfer/checklist  Update checklist items
POST   /api/v1/accounts/:id/transfer/execute    Execute transfer
POST   /api/v1/accounts/:id/transfer/verify     Verify client has access
POST   /api/v1/accounts/:id/transfer/complete   Mark transfer as complete
```

### Database Schema

```sql
-- Cloud accounts table
CREATE TABLE cloud_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    provider cloud_provider NOT NULL,

    -- Provider-specific identifiers
    aws_account_id VARCHAR(12),
    aws_ou_id VARCHAR(68),
    gcp_project_id VARCHAR(30),
    gcp_project_number VARCHAR(20),
    azure_subscription_id UUID,
    azure_tenant_id UUID,

    -- Status: pending, provisioning, active, transferring, transferred, failed
    status VARCHAR(50) NOT NULL DEFAULT 'pending',

    -- Terraform state
    terraform_workspace VARCHAR(100),
    terraform_state_key VARCHAR(255),
    last_terraform_run TIMESTAMP WITH TIME ZONE,

    -- Metadata
    region VARCHAR(50) NOT NULL,
    environment VARCHAR(20) NOT NULL DEFAULT 'production',
    tags JSONB DEFAULT '{}',

    -- Credentials (encrypted reference)
    credentials_secret_id VARCHAR(255),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cloud resources inventory
CREATE TABLE cloud_resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cloud_account_id UUID NOT NULL REFERENCES cloud_accounts(id) ON DELETE CASCADE,

    provider_resource_id VARCHAR(500) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_name VARCHAR(255),

    region VARCHAR(50),
    status VARCHAR(50),
    configuration JSONB,
    tags JSONB DEFAULT '{}',

    monthly_cost_estimate DECIMAL(10, 2),

    last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cloud costs table
CREATE TABLE cloud_costs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cloud_account_id UUID NOT NULL REFERENCES cloud_accounts(id) ON DELETE CASCADE,

    period_start DATE NOT NULL,
    period_end DATE NOT NULL,

    total_cost DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    cost_breakdown JSONB NOT NULL DEFAULT '{}',

    fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(cloud_account_id, period_start, period_end)
);

-- Transfer tracking
CREATE TABLE cloud_transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cloud_account_id UUID NOT NULL REFERENCES cloud_accounts(id) ON DELETE CASCADE,

    -- Status: pending, checklist_in_progress, ready, executing, verifying, completed, failed
    status transfer_status NOT NULL DEFAULT 'pending',

    checklist JSONB NOT NULL DEFAULT '{}',
    checklist_completed_at TIMESTAMP WITH TIME ZONE,

    target_organization_id VARCHAR(255),
    target_account_email VARCHAR(255),
    target_billing_account VARCHAR(255),

    initiated_at TIMESTAMP WITH TIME ZONE,
    initiated_by UUID REFERENCES users(id),
    executed_at TIMESTAMP WITH TIME ZONE,
    executed_by UUID REFERENCES users(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by UUID REFERENCES users(id),
    completed_at TIMESTAMP WITH TIME ZONE,
    completed_by UUID REFERENCES users(id),

    handover_document_id UUID REFERENCES documents(id),
    credentials_delivered_at TIMESTAMP WITH TIME ZONE,

    notes TEXT,
    issues JSONB DEFAULT '[]',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transfer audit log
CREATE TABLE transfer_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transfer_id UUID NOT NULL REFERENCES cloud_transfers(id) ON DELETE CASCADE,

    action VARCHAR(100) NOT NULL,
    actor_id UUID REFERENCES users(id),
    details JSONB,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## Terraform State & IaC Ownership

### Two Ownership Models

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        TWO OWNERSHIP MODELS                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────────┐  │
│  │      MANAGED SERVICE            │  │      CUSTOMER OWNERSHIP          │  │
│  │      (Tier 3)                   │  │      (Tier 1 & 2)                │  │
│  ├─────────────────────────────────┤  ├─────────────────────────────────┤  │
│  │                                 │  │                                  │  │
│  │  tenxdev owns & operates:       │  │  Customer owns & operates:       │  │
│  │  ✓ Cloud account/project        │  │  ✓ Cloud account/project         │  │
│  │  ✓ Terraform state              │  │  ✓ Terraform state               │  │
│  │  ✓ IaC GitHub repo              │  │  ✓ IaC GitHub repo               │  │
│  │  ✓ Application repo             │  │  ✓ Application repo              │  │
│  │  ✓ CI/CD pipelines              │  │  ✓ CI/CD pipelines               │  │
│  │  ✓ Monitoring & alerts          │  │  ✓ Monitoring & alerts           │  │
│  │                                 │  │                                  │  │
│  │  Customer gets:                 │  │  tenxdev provides:               │  │
│  │  • Read-only dashboards         │  │  • 14-day transition support     │  │
│  │  • Support SLA                  │  │  • Documentation                 │  │
│  │  • Monthly reports              │  │  • Handover call                 │  │
│  │                                 │  │  • Optional: maintenance retainer│  │
│  └─────────────────────────────────┘  └─────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Repository Structure Per Project

Each client project gets **two repositories**:

```
tenxdev-org/
├── client-abc-app/           # Application code
│   ├── apps/
│   │   ├── frontend/
│   │   └── backend/
│   ├── packages/
│   ├── .github/
│   │   └── workflows/
│   │       ├── ci.yml
│   │       └── deploy.yml
│   ├── Dockerfile
│   └── README.md
│
└── client-abc-infra/         # Infrastructure code
    ├── terraform/
    │   ├── environments/
    │   │   ├── staging/
    │   │   │   ├── main.tf
    │   │   │   ├── variables.tf
    │   │   │   └── terraform.tfvars
    │   │   └── production/
    │   │       ├── main.tf
    │   │       ├── variables.tf
    │   │       └── terraform.tfvars
    │   └── modules/
    │       ├── networking/
    │       ├── kubernetes/
    │       ├── database/
    │       └── observability/
    ├── kubernetes/
    │   ├── base/
    │   └── overlays/
    │       ├── staging/
    │       └── production/
    ├── .github/
    │   └── workflows/
    │       ├── terraform-plan.yml
    │       └── terraform-apply.yml
    ├── docs/
    │   ├── architecture.md
    │   ├── runbook.md
    │   └── disaster-recovery.md
    └── README.md
```

### State Management During Development

```
┌─────────────────────────────────────────────────────────────────┐
│                    DEVELOPMENT PHASE                             │
│                                                                  │
│  ┌──────────────────┐      ┌──────────────────┐                │
│  │   tenxdev        │      │   tenxdev        │                │
│  │   GitHub Org     │      │   Cloud Account  │                │
│  ├──────────────────┤      ├──────────────────┤                │
│  │                  │      │                  │                │
│  │  client-abc/     │      │  S3 Bucket:      │                │
│  │  ├── app/        │      │  tenxdev-tf-state│                │
│  │  │   └── ...     │      │  │               │                │
│  │  └── infra/      │      │  └── client-abc/ │                │
│  │      ├── main.tf │ ───▶ │      └── prod/   │                │
│  │      ├── eks.tf  │      │          state   │                │
│  │      └── ...     │      │                  │                │
│  │                  │      │  DynamoDB:       │                │
│  │                  │      │  tf-state-locks  │                │
│  └──────────────────┘      └──────────────────┘                │
│                                                                  │
│  State stored in tenxdev's central state bucket                 │
│  All projects isolated by path prefix                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### State After Transfer (Tier 1 & 2)

```
┌─────────────────────────────────────────────────────────────────┐
│                    POST-TRANSFER                                 │
│                                                                  │
│  ┌──────────────────┐      ┌──────────────────┐                │
│  │   Customer       │      │   Customer       │                │
│  │   GitHub Org     │      │   Cloud Account  │                │
│  ├──────────────────┤      ├──────────────────┤                │
│  │                  │      │                  │                │
│  │  my-project/     │      │  S3 Bucket:      │                │
│  │  ├── app/        │      │  my-tf-state     │                │
│  │  │   └── ...     │      │  │               │                │
│  │  └── infra/      │      │  └── prod/       │                │
│  │      ├── main.tf │ ───▶ │      state       │                │
│  │      ├── eks.tf  │      │                  │                │
│  │      └── ...     │      │  DynamoDB:       │                │
│  │                  │      │  my-tf-locks     │                │
│  │  .github/        │      │                  │                │
│  │  └── workflows/  │      │                  │                │
│  │      └── infra.yml      │                  │                │
│  └──────────────────┘      └──────────────────┘                │
│                                                                  │
│  State migrated to customer's own bucket                        │
│  Customer runs their own Terraform via GitHub Actions           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### What Gets Transferred

| Asset | Tier 1 (App Only) | Tier 2 (App + Infra) | Tier 3 (Managed) |
|-------|:-----------------:|:--------------------:|:----------------:|
| **Application Source Code** | ✓ Transferred | ✓ Transferred | Retained by tenxdev |
| **Infrastructure Code (Terraform)** | N/A | ✓ Transferred | Retained by tenxdev |
| **Kubernetes Manifests** | N/A | ✓ Transferred | Retained by tenxdev |
| **CI/CD Workflows** | ✓ Transferred | ✓ Transferred | Retained by tenxdev |
| **Terraform State** | N/A | ✓ Migrated to customer | Retained by tenxdev |
| **Cloud Account/Project** | N/A | ✓ Transferred | Customer-owned, tenxdev-managed |
| **GitHub Repositories** | ✓ Transferred | ✓ Transferred | Retained by tenxdev |
| **Documentation** | ✓ Included | ✓ Included | ✓ Included |
| **Secrets/Credentials** | Rotated & delivered | Rotated & delivered | Managed by tenxdev |

### Complete Transfer Workflow

```
TRIGGER: Final payment received & client accepts transfer

┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 1: PRE-TRANSFER PREPARATION                                        │
├─────────────────────────────────────────────────────────────────────────┤
│  □ Verify all milestones completed                                      │
│  □ Verify final payment cleared                                         │
│  □ Collect customer information:                                        │
│    • GitHub organization name                                           │
│    • Cloud organization/tenant ID (optional)                            │
│    • Target email for cloud account                                     │
│    • Technical contact for handover                                     │
│  □ Generate resource inventory                                          │
│  □ Calculate monthly cost estimate                                      │
│  □ Prepare handover documentation                                       │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 2: CREATE CUSTOMER STATE BACKEND                                   │
├─────────────────────────────────────────────────────────────────────────┤
│  AWS:                                                                    │
│  □ Create S3 bucket: {customer}-terraform-state                         │
│  □ Enable versioning and encryption                                     │
│  □ Create DynamoDB table: terraform-state-locks                         │
│  □ Create IAM policy for state access                                   │
│                                                                          │
│  GCP:                                                                    │
│  □ Create GCS bucket: {customer}-terraform-state                        │
│  □ Enable versioning                                                    │
│  □ Set up IAM for state access                                          │
│                                                                          │
│  Azure:                                                                  │
│  □ Create storage account                                               │
│  □ Create container: tfstate                                            │
│  □ Set up RBAC for state access                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 3: MIGRATE TERRAFORM STATE                                         │
├─────────────────────────────────────────────────────────────────────────┤
│  □ terraform state pull > state.json (from tenxdev backend)             │
│  □ Update backend.tf in infra repo with new backend config              │
│  □ terraform init -migrate-state (to customer backend)                  │
│  □ Verify: terraform plan shows no changes                              │
│  □ Delete state from tenxdev backend                                    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 4: PREPARE GITHUB REPOSITORIES                                     │
├─────────────────────────────────────────────────────────────────────────┤
│  □ Update all hardcoded tenxdev references                              │
│  □ Update CI/CD workflows for customer's cloud credentials              │
│  □ Remove any tenxdev-specific configurations                           │
│  □ Add customer as collaborator (before transfer)                       │
│  □ Create final documentation commit                                    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 5: ROTATE CREDENTIALS                                              │
├─────────────────────────────────────────────────────────────────────────┤
│  □ Rotate all secrets in cloud secret manager                           │
│  □ Rotate database passwords                                            │
│  □ Rotate API keys for third-party services                             │
│  □ Generate new service account keys                                    │
│  □ Store new credentials in secure delivery system                      │
│                                                                          │
│  Credential Delivery:                                                   │
│  • Generate one-time secure link (24hr expiry)                          │
│  • Include: database passwords, API keys, service accounts              │
│  • Send link to customer's technical contact                            │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 6: REMOVE TENXDEV ACCESS                                           │
├─────────────────────────────────────────────────────────────────────────┤
│  AWS:                                                                    │
│  □ Delete TenxdevManagementRole                                         │
│  □ Remove from AWS Organization                                         │
│  □ Delete any tenxdev IAM users                                         │
│                                                                          │
│  GCP:                                                                    │
│  □ Remove tenxdev service account IAM bindings                          │
│  □ Remove from organization (if moving to customer org)                 │
│  □ Unlink billing account                                               │
│                                                                          │
│  Azure:                                                                  │
│  □ Remove tenxdev RBAC assignments                                      │
│  □ Remove service principal access                                      │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 7: TRANSFER CLOUD ACCOUNT                                          │
├─────────────────────────────────────────────────────────────────────────┤
│  Option A: Customer has organization                                    │
│  □ Move account/project/subscription to customer's org                  │
│  □ Customer sets up billing                                             │
│                                                                          │
│  Option B: Standalone account                                           │
│  □ Remove from tenxdev organization                                     │
│  □ Customer becomes root/owner                                          │
│  □ Customer adds payment method                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 8: TRANSFER GITHUB REPOSITORIES                                    │
├─────────────────────────────────────────────────────────────────────────┤
│  □ Transfer app repo: tenxdev/{project}-app → customer/{project}        │
│  □ Transfer infra repo: tenxdev/{project}-infra → customer/{project}-infra│
│  □ Customer updates GitHub Actions secrets with new credentials         │
│  □ Verify CI/CD pipelines work                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 9: VERIFICATION                                                    │
├─────────────────────────────────────────────────────────────────────────┤
│  □ Customer confirms cloud console access                               │
│  □ Customer confirms GitHub repo access                                 │
│  □ Customer tests new credentials                                       │
│  □ Customer runs terraform plan (shows no changes)                      │
│  □ Customer triggers CI/CD pipeline successfully                        │
│  □ Application is accessible                                            │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 10: HANDOVER & TRANSITION SUPPORT                                  │
├─────────────────────────────────────────────────────────────────────────┤
│  □ Conduct handover call with customer's technical team                 │
│  □ Walk through:                                                        │
│    • Architecture overview                                              │
│    • Common operations                                                  │
│    • Troubleshooting guide                                              │
│    • Scaling procedures                                                 │
│    • Backup/restore procedures                                          │
│  □ Deliver final documentation package                                  │
│  □ Begin 14-day transition support period                               │
│  □ Mark transfer as complete in platform                                │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Service Packages

### Tier 1: Application Only

**Target Client:** Startups with existing DevOps capabilities or technical co-founders.

| Component | Included | Details |
|-----------|:--------:|---------|
| Custom MVP Development | ✓ | Full-stack application per SOW |
| Source Code Repository | ✓ | Private GitHub repo, transferred on completion |
| Technical Documentation | ✓ | Architecture docs, API specs, README |
| Automated Test Suite | ✓ | Unit and integration tests (>80% coverage) |
| 30-Day Bug Fix Warranty | ✓ | Critical and major bugs only |
| Deployment Guide | ✓ | Step-by-step deployment instructions |
| Cloud Infrastructure | ✗ | Client handles deployment |
| Managed Hosting | ✗ | Client handles hosting |
| Domain Registration | ✗ | Client handles domains |

**Delivery Process:**
1. Development in tenxdev-controlled private repo
2. Client has read-only access during development
3. Upon final payment, repo transferred to client's GitHub org
4. All branches, history, and CI configs included

---

### Tier 2: Application + Infrastructure

**Target Client:** Startups wanting turnkey solution without ongoing management.

| Component | Included | Details |
|-----------|:--------:|---------|
| Everything in Tier 1 | ✓ | All application deliverables |
| Cloud Account | ✓ | Dedicated AWS/GCP/Azure account |
| Kubernetes Cluster | ✓ | Production-ready K8s setup |
| CI/CD Pipeline | ✓ | GitHub Actions → Cloud deployment |
| Infrastructure as Code | ✓ | Terraform/Pulumi repository |
| Observability Stack | ✓ | Prometheus, Grafana, Loki |
| Security Baseline | ✓ | WAF, secrets management, scanning |
| SSL Certificates | ✓ | Auto-provisioned via cert-manager |
| Staging Environment | ✓ | Separate namespace/project |
| Production Environment | ✓ | HA configuration |
| Domain Registration | Add-on | Optional, billed separately |
| Account Transfer | ✓ | Full ownership transfer on completion |

**Cloud Account Structure:**

```
AWS:
└── tenxdev Organization (root)
    └── Client Project OU
        └── client-project-prod (Member Account)
            ├── EKS Cluster
            ├── RDS Database
            ├── S3 Buckets
            └── CloudWatch Logs

GCP:
└── tenxdev.ai (Organization)
    └── clients (Folder)
        └── client-project (Project)
            ├── GKE Cluster
            ├── Cloud SQL
            ├── Cloud Storage
            └── Cloud Logging

Azure:
└── tenxdev Tenant
    └── Client Subscription
        └── client-project-rg (Resource Group)
            ├── AKS Cluster
            ├── Azure Database
            ├── Blob Storage
            └── Log Analytics
```

**Transfer Process:**
1. Final payment confirmed in Stripe
2. Automated transfer workflow initiated
3. All tenxdev.ai access removed
4. Secrets rotated, new values provided securely
5. Account ownership transferred to client
6. Handover documentation delivered
7. 14-day transition support period begins

---

### Tier 3: Managed Service

**Target Client:** Startups wanting fully managed, ongoing service.

| Component | Included | Details |
|-----------|:--------:|---------|
| Everything in Tier 2 | ✓ | Full infrastructure included |
| Ongoing Hosting | ✓ | We manage the infrastructure |
| 24/7 Monitoring | ✓ | Alerting and incident response |
| Security Updates | ✓ | OS patches, dependency updates |
| Monthly Maintenance | ✓ | Performance optimization |
| Backup Management | ✓ | Automated backups, tested restores |
| Support SLA | ✓ | Response times per severity |
| Quarterly Reviews | ✓ | Infrastructure health reports |

**Account Ownership:**
- tenxdev.ai retains account ownership
- Client can request transfer at any time (exits managed service)
- 90-day notice for managed service cancellation
- Transfer follows Tier 2 process

**SLA Levels:**

| Severity | Description | Response Time | Resolution Target |
|----------|-------------|---------------|-------------------|
| P1 - Critical | Production down | 15 minutes | 4 hours |
| P2 - High | Major feature broken | 1 hour | 8 hours |
| P3 - Medium | Minor feature issue | 4 hours | 48 hours |
| P4 - Low | Questions, enhancements | 24 hours | Best effort |

---

## Contract Templates

### Contract A: Application Only Agreement

```
MASTER SERVICE AGREEMENT - APPLICATION DEVELOPMENT
tenxdev.ai

Effective Date: [DATE]
Client: [CLIENT NAME]
Project: [PROJECT NAME]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. SCOPE OF WORK

1.1 tenxdev.ai ("Provider") agrees to develop custom software
    application(s) for [CLIENT NAME] ("Client") as described in
    Statement of Work (SOW) attached as Exhibit A.

1.2 The SOW defines:
    - Feature specifications
    - Technical requirements
    - Acceptance criteria
    - Timeline and milestones
    - Out-of-scope items

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

2. DELIVERABLES

Upon project completion, Client will receive:

2.1 Source Code
    - Complete application source code
    - All custom components and modules
    - Database schema and migrations
    - Configuration files (sanitized)

2.2 Documentation
    - Technical architecture documentation
    - API documentation (if applicable)
    - Database entity relationship diagrams
    - Deployment instructions
    - Environment variable reference

2.3 Quality Artifacts
    - Automated test suite
    - Test coverage report
    - Security scan results
    - Performance baseline metrics

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

3. PAYMENT TERMS

3.1 Total Project Fee: $[AMOUNT]

3.2 Payment Schedule:

    Milestone 1 - Project Kickoff
    Amount: 30% ($[AMOUNT])
    Due: Upon contract signing

    Milestone 2 - MVP Feature Complete
    Amount: 30% ($[AMOUNT])
    Due: Upon milestone acceptance

    Milestone 3 - Final Delivery
    Amount: 40% ($[AMOUNT])
    Due: Upon final acceptance

3.3 Payment Method: Credit card or ACH via Stripe

3.4 Late Payment: Invoices unpaid after 14 days accrue 1.5%
    monthly interest. Work may be paused after 30 days.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

4. INTELLECTUAL PROPERTY

4.1 Work Product Ownership
    Upon receipt of final payment, all intellectual property rights
    in the custom-developed Work Product transfer to Client.

4.2 Pre-Existing Materials
    Provider retains ownership of pre-existing tools, libraries,
    and frameworks. Client receives perpetual license to use.

4.3 Open Source Components
    Deliverables may include open-source software. Complete list
    of dependencies and licenses will be provided.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

5. SOURCE CODE MANAGEMENT

5.1 During Development
    - Code maintained in private GitHub repository
    - Repository owned by tenxdev.ai organization
    - Client granted read-only access

5.2 Upon Final Payment
    - Repository transferred to Client's GitHub organization
    - Complete git history preserved
    - All branches and CI/CD configurations included
    - Provider access revoked within 24 hours

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

6. WARRANTY

6.1 Bug Fix Warranty: 30 days following final delivery

6.2 Coverage: Critical bugs, major bugs, security vulnerabilities

6.3 Exclusions: New features, specification changes, client
    modifications, third-party issues

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Sections 7-11: Acceptance, Confidentiality, Liability,
Termination, General Provisions - abbreviated]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SIGNATURES

[Signature blocks]

EXHIBIT A: STATEMENT OF WORK
[Attached separately]
```

---

### Contract B: Application + Infrastructure (Transferable Account)

Includes all sections from Contract A, plus:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

12. INFRASTRUCTURE DELIVERABLES

12.1 Cloud Account
     Dedicated account: AWS Organization member / GCP Project /
     Azure Subscription

12.2 Infrastructure Components
     - Kubernetes cluster (EKS/GKE/AKS)
     - Managed database with backups
     - Object storage
     - VPC with private subnets
     - Load balancer, SSL/TLS certificates
     - WAF, secrets management, network policies

12.3 Observability Stack
     - Prometheus, Grafana dashboards, alerting
     - Centralized logging
     - Distributed tracing (if applicable)

12.4 CI/CD Pipeline
     - GitHub Actions workflows
     - Staging/production deployments
     - Rollback capability

12.5 Infrastructure as Code
     - Complete Terraform codebase
     - State stored in cloud backend
     - Documentation

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

13. PAYMENT TERMS (INFRASTRUCTURE)

    Milestone 1 - Project Kickoff: 25%
    Milestone 2 - Application MVP: 25%
    Milestone 3 - Infrastructure Deployed: 25%
    Milestone 4 - Production Go-Live & Transfer: 25%

    Cloud costs during development: Provider pays
    Cloud costs post-transfer: Client assumes

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

14. CLOUD ACCOUNT TRANSFER

14.1 Transfer Trigger: Final payment + production acceptance

14.2 Pre-Transfer Checklist:
     - Remove all Provider admin access
     - Rotate all credentials
     - Generate handover documentation
     - Verify backups

14.3 Transfer Process: Per cloud provider procedures

14.4 Post-Transfer: Provider retains NO access

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

15. POST-TRANSFER SUPPORT

     14 days included transition support
     Extended support available separately

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

16. INFRASTRUCTURE WARRANTY

     30 days post-transfer
     Coverage: Deployment, monitoring, K8s, Terraform issues
     Exclusions: Cloud provider outages, client modifications

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EXHIBIT A: STATEMENT OF WORK
EXHIBIT B: INFRASTRUCTURE SPECIFICATIONS
EXHIBIT C: COST ESTIMATE
```

---

## Technical Specification

### Frontend Pages

| Route | Purpose | Auth Required |
|-------|---------|:-------------:|
| `/` | Marketing homepage | No |
| `/pricing` | Package comparison, tier details | No |
| `/login` | Clerk sign-in | No |
| `/signup` | Clerk sign-up | No |
| `/dashboard` | Overview, active projects | Yes |
| `/projects` | Project list | Yes |
| `/projects/[id]` | Project detail, milestones | Yes |
| `/projects/[id]/documents` | Contracts, invoices, docs | Yes |
| `/projects/[id]/environments` | Staging/prod URLs, status | Yes |
| `/domains` | Domain management | Yes |
| `/domains/search` | Domain availability search | Yes |
| `/billing` | Invoices, payment methods | Yes |
| `/settings` | Organization settings | Yes |
| `/settings/team` | Team member management | Yes |
| `/admin` | Internal admin panel | Admin |

---

## Database Schema

### Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐
│  organizations  │       │     users       │
├─────────────────┤       ├─────────────────┤
│ id              │───┐   │ id              │
│ name            │   │   │ organization_id │──┐
│ stripe_customer │   │   │ clerk_id        │  │
│ created_at      │   │   │ email           │  │
└─────────────────┘   │   │ role            │  │
                      │   └─────────────────┘  │
                      │                        │
                      ▼                        │
┌─────────────────────────────────────────┐   │
│               projects                   │   │
├─────────────────────────────────────────┤   │
│ id                                       │   │
│ organization_id ─────────────────────────┼───┘
│ name, tier, status                       │
│ cloud_provider, cloud_account_id         │
│ github_repo_url                          │
│ staging_url, production_url              │
│ total_amount, amount_paid                │
└─────────────────────────────────────────┘
         │
         │ 1:many
         ▼
┌─────────────────────────────────────────┐
│              milestones                  │
├─────────────────────────────────────────┤
│ id, project_id                           │
│ name, description, order                 │
│ status, payment_amount, payment_status   │
│ stripe_invoice_id, due_date              │
└─────────────────────────────────────────┘

┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│     domains     │  │    documents    │  │ activity_logs   │
├─────────────────┤  ├─────────────────┤  ├─────────────────┤
│ organization_id │  │ project_id      │  │ project_id      │
│ project_id      │  │ type, name      │  │ user_id         │
│ domain_name     │  │ storage_key     │  │ action          │
│ status          │  │ signed_at       │  │ metadata        │
└─────────────────┘  └─────────────────┘  └─────────────────┘

┌─────────────────────────────────────────┐
│          cloud_accounts                  │
├─────────────────────────────────────────┤
│ project_id, provider                     │
│ aws_account_id / gcp_project_id / azure_ │
│ status, terraform_workspace              │
│ region, tags                             │
└─────────────────────────────────────────┘
         │
         │ 1:many
         ▼
┌─────────────────────────────────────────┐
│          cloud_transfers                 │
├─────────────────────────────────────────┤
│ cloud_account_id, status                 │
│ checklist (jsonb)                        │
│ target_organization_id                   │
│ initiated_at, completed_at               │
└─────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase Overview

| Phase | Duration | Focus | Services Built |
|-------|----------|-------|----------------|
| **Phase 1** | 4 weeks | Core Portal Foundation | API Gateway, Projects Service |
| **Phase 2** | 3 weeks | Project Tracking & Communication | Projects Service (extended) |
| **Phase 3** | 2 weeks | Billing & Payments | Billing Service |
| **Phase 4** | 2 weeks | Domain Management | Domains Service |
| **Phase 5** | 3 weeks | Cloud Account Management | Cloud Provisioner Service |
| **Phase 6** | 1 week | Document Management | Documents Service |
| **Phase 7** | 2 weeks | Polish & Launch | All services, Notifications |

**Total: 17 weeks**

---

### Phase 1: Core Portal Foundation

**Duration:** 4 weeks
**Services:** API Gateway, Projects Service

#### Week 1: Project Setup & Authentication

| Task | Details |
|------|---------|
| Initialize Next.js Application | App Router, TypeScript, Tailwind, shadcn/ui |
| Database Setup | YugabyteDB (single-node), Drizzle ORM, migrations |
| Authentication | Clerk setup, organizations, middleware |

**Deliverables:**
- [ ] Running Next.js application
- [ ] PostgreSQL database with schema
- [ ] Working authentication flow
- [ ] Protected dashboard route

#### Week 2: Organization & User Management

| Task | Details |
|------|---------|
| Organization CRUD | Creation, settings, profile |
| Team Management | Invites, RBAC (Owner/Admin/Member/Viewer) |
| User Profile | Settings, notification preferences |

**Deliverables:**
- [ ] Organization settings UI
- [ ] Team invitation flow
- [ ] Role management
- [ ] User profile page

#### Week 3: Project Data Model & Basic CRUD

| Task | Details |
|------|---------|
| Project Management Backend | CRUD APIs, milestone APIs, activity logging |
| Project List UI | Dashboard cards, status badges, stats |
| Project Detail Page | Overview, milestones, metadata |

**Deliverables:**
- [ ] Project API endpoints
- [ ] Dashboard with project list
- [ ] Project detail page
- [ ] Milestone display component

#### Week 4: Admin Panel Foundation

| Task | Details |
|------|---------|
| Admin Authentication | Role check middleware, admin routes |
| Admin Project Management | Create projects, assign to org, manage milestones |
| Admin Dashboard | Metrics, activity feed, pending actions |

**Deliverables:**
- [ ] Admin-protected routes
- [ ] Project creation for clients
- [ ] Admin dashboard
- [ ] Project management interface

---

### Phase 2: Project Tracking & Communication

**Duration:** 3 weeks
**Services:** Projects Service (extended), Notifications Service (basic)

#### Week 5: Milestone Management

| Task | Details |
|------|---------|
| Milestone CRUD | Create/edit, ordering, status transitions |
| Milestone UI | Timeline view, Kanban board, progress calculator |
| Milestone Notifications | Email on completion/start, in-app notifications |

**Deliverables:**
- [ ] Complete milestone CRUD
- [ ] Timeline visualization
- [ ] Kanban board view
- [ ] Email notifications

#### Week 6: Progress Tracking & Updates

| Task | Details |
|------|---------|
| Status Updates System | Weekly updates, rich text, attachments |
| Activity Feed | Project timeline, filters, pagination |
| Progress Visualization | Progress bars, charts, burn-down |

**Deliverables:**
- [ ] Status update system
- [ ] Activity feed component
- [ ] Progress visualizations
- [ ] Update notifications

#### Week 7: Environment URLs & GitHub Integration

| Task | Details |
|------|---------|
| Environment Management | Staging/prod URLs, health status |
| GitHub Integration | OAuth, repo display, commit feed |
| External Links | Grafana, logs, CI/CD, custom links |

**Deliverables:**
- [ ] Environment URL management
- [ ] GitHub repo integration
- [ ] External services links
- [ ] Health status indicators

---

### Phase 3: Billing & Payments

**Duration:** 2 weeks
**Services:** Billing Service

#### Week 8: Stripe Integration & Checkout

| Task | Details |
|------|---------|
| Stripe Setup | Products, prices, webhooks |
| Checkout Flow | Package selection, checkout session, success/cancel |
| Customer Portal | Payment methods, invoice history, subscriptions |

**Deliverables:**
- [ ] Stripe integration
- [ ] Checkout flow
- [ ] Customer billing portal
- [ ] Webhook handlers

#### Week 9: Milestone Payments & Invoicing

| Task | Details |
|------|---------|
| Milestone Invoicing | Generate on completion, email, pay via Stripe |
| Payment Tracking | Schedule view, balance, history, receipts |
| Subscription Billing | Monthly setup, lifecycle webhooks, cancellation |

**Deliverables:**
- [ ] Milestone invoice generation
- [ ] Payment tracking UI
- [ ] Subscription management
- [ ] Payment notifications

---

### Phase 4: Domain Management

**Duration:** 2 weeks
**Services:** Domains Service

#### Week 10: Domain Search & Registration

| Task | Details |
|------|---------|
| Cloudflare Integration | API auth, availability check, pricing |
| Domain Search UI | Search input, TLD selection, results |
| Domain Purchase | Cart, Stripe checkout, confirmation |

**Deliverables:**
- [ ] Cloudflare API integration
- [ ] Domain search interface
- [ ] Purchase checkout flow
- [ ] Registration confirmation

#### Week 11: Domain Management & DNS

| Task | Details |
|------|---------|
| Domain Dashboard | List, status, expiration, auto-renew |
| DNS Configuration | Link to project, auto-configure, record management |
| Domain Lifecycle | Expiration reminders, renewal, transfer out |

**Deliverables:**
- [ ] Domain management dashboard
- [ ] DNS configuration UI
- [ ] Auto-configure for projects
- [ ] Renewal notifications

---

### Phase 5: Cloud Account Management

**Duration:** 3 weeks
**Services:** Cloud Provisioner Service

#### Week 12: Cloud Account Provisioning

| Task | Details |
|------|---------|
| AWS Integration | Organizations API, member accounts, IAM |
| GCP Integration | Resource Manager, project creation, IAM |
| Azure Integration | ARM API, subscriptions, RBAC |

**Deliverables:**
- [ ] AWS account provisioning
- [ ] GCP project provisioning
- [ ] Azure subscription provisioning
- [ ] Provisioning automation

#### Week 13: Resource Visibility & Monitoring

| Task | Details |
|------|---------|
| Resource Inventory | List resources, categorization, tagging |
| Cost Tracking | Monthly display, trends, breakdown |
| Health Monitoring | Status checks, uptime, incidents |

**Deliverables:**
- [ ] Resource inventory view
- [ ] Cost tracking dashboard
- [ ] Health status display
- [ ] Alert integration

#### Week 14: Account Transfer Workflow

| Task | Details |
|------|---------|
| Pre-Transfer Checklist | Auto-generation, completion UI, blocker detection |
| Transfer Execution | AWS/GCP/Azure scripts, credential rotation |
| Post-Transfer Verification | Access verification, confirmation, handover docs |

**Deliverables:**
- [ ] Transfer checklist system
- [ ] Automated transfer scripts
- [ ] Verification workflow
- [ ] Handover documentation

---

### Phase 6: Document Management

**Duration:** 1 week
**Services:** Documents Service

#### Week 15: Documents & Contracts

| Task | Details |
|------|---------|
| Document Storage | R2 integration, upload, signed URL download |
| Document Management UI | List, upload, preview, categorization |
| Contract Workflow | Templates, e-signature (DocuSign/HelloSign), tracking |

**Deliverables:**
- [ ] Document upload/download
- [ ] Document management UI
- [ ] E-signature integration
- [ ] Contract workflow

---

### Phase 7: Polish & Launch

**Duration:** 2 weeks
**Services:** All services, Notifications Service (complete)

#### Week 16: UX Refinement

| Task | Details |
|------|---------|
| UI/UX Polish | Responsive audit, loading states, error handling |
| Email Templates | React Email, transactional design, preview |
| Onboarding Flow | Welcome, tour, guidance, documentation |

**Deliverables:**
- [ ] Polished UI across all pages
- [ ] Complete email templates
- [ ] Onboarding experience
- [ ] Help documentation

#### Week 17: Testing & Launch

| Task | Details |
|------|---------|
| Testing | E2E (Playwright), API testing, payment testing, security audit |
| Performance | Optimization, query tuning, caching, CDN |
| Launch | Production deploy, DNS, monitoring, backups |

**Deliverables:**
- [ ] Test suite passing
- [ ] Performance benchmarks met
- [ ] Production deployment
- [ ] Monitoring active

---

## Pricing Model

### One-Time Project Pricing

| Package | Price Range | Payment Structure |
|---------|-------------|-------------------|
| **Application Only** | $15,000 - $50,000 | 30% / 30% / 40% milestones |
| **App + Infrastructure** | $25,000 - $80,000 | 25% / 25% / 25% / 25% milestones |

### Managed Service Pricing (Monthly)

| Plan | Monthly Price | Included |
|------|---------------|----------|
| **Starter** | $2,000/month | Up to $500 cloud spend, basic support |
| **Growth** | $5,000/month | Up to $2,000 cloud spend, priority support |
| **Enterprise** | $10,000+/month | Custom cloud spend, 24/7 support, dedicated engineer |

### Add-Ons

| Add-On | Price |
|--------|-------|
| Domain Registration | $15-50/year (pass-through + margin) |
| Extra Environment | $500 one-time |
| Priority Support | $500/month |
| Extended Warranty (90 days) | $1,000 |
| Training Session (2 hours) | $500 |
| Quarterly Architecture Review | $2,000 |

### Cloud Cost Guidelines

| Workload Size | AWS | GCP | Azure |
|---------------|-----|-----|-------|
| Small (1-1K users) | $150-300 | $100-250 | $150-300 |
| Medium (1K-10K users) | $500-1,500 | $400-1,200 | $500-1,500 |
| Large (10K-100K users) | $2,000-5,000 | $1,500-4,000 | $2,000-5,000 |

---

## Appendix

### A. Project Status Definitions

| Status | Description |
|--------|-------------|
| `draft` | Project created but not started |
| `discovery` | Requirements gathering and planning |
| `development` | Active development in progress |
| `testing` | QA and testing phase |
| `staging` | Deployed to staging environment |
| `production` | Deployed to production |
| `transfer` | Cloud account transfer in progress |
| `completed` | Project fully delivered |
| `cancelled` | Project cancelled |

### B. Milestone Templates

**Application Only:**
1. Project Kickoff (30%)
2. MVP Feature Complete (30%)
3. Final Delivery (40%)

**App + Infrastructure:**
1. Project Kickoff (25%)
2. Application MVP (25%)
3. Infrastructure Deployed (25%)
4. Production Go-Live (25%)

### C. Transfer Checklist Items

**AWS:**
- [ ] Remove all tenxdev IAM users
- [ ] Remove organization SCPs
- [ ] Rotate root account password
- [ ] Rotate all IAM access keys
- [ ] Rotate all secrets in Secrets Manager
- [ ] Update billing to client
- [ ] Remove from organization
- [ ] Verify client root access
- [ ] Document all resources
- [ ] Provide cost estimate

**GCP:**
- [ ] Remove all tenxdev IAM members
- [ ] Remove organization policies
- [ ] Rotate all service account keys
- [ ] Rotate all Secret Manager secrets
- [ ] Update billing account
- [ ] Migrate project to client org
- [ ] Verify client owner access
- [ ] Document all resources
- [ ] Provide cost estimate

**Azure:**
- [ ] Remove all tenxdev RBAC assignments
- [ ] Rotate all service principal secrets
- [ ] Rotate all Key Vault secrets
- [ ] Update subscription billing
- [ ] Transfer subscription to client tenant
- [ ] Verify client owner access
- [ ] Document all resources
- [ ] Provide cost estimate

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-10 | tenxdev.ai | Initial specification |
| 1.1 | 2026-01-10 | tenxdev.ai | Added microservices architecture, Cloud Provisioner details, Terraform state management |
