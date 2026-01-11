import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  decimal,
  date,
  unique,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { projects } from './projects';
import { users } from './users';
import { cloudProviderEnum, cloudAccountStatusEnum, transferStatusEnum } from './enums';

export const cloudAccounts = pgTable('cloud_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .references(() => projects.id, { onDelete: 'cascade' })
    .notNull(),

  provider: cloudProviderEnum('provider').notNull(),

  // AWS specific
  awsAccountId: varchar('aws_account_id', { length: 12 }),
  awsOuId: varchar('aws_ou_id', { length: 68 }),

  // GCP specific
  gcpProjectId: varchar('gcp_project_id', { length: 30 }),
  gcpProjectNumber: varchar('gcp_project_number', { length: 20 }),

  // Azure specific
  azureSubscriptionId: uuid('azure_subscription_id'),
  azureTenantId: uuid('azure_tenant_id'),

  status: cloudAccountStatusEnum('status').default('pending').notNull(),

  // Terraform
  terraformWorkspace: varchar('terraform_workspace', { length: 100 }),
  terraformStateKey: varchar('terraform_state_key', { length: 255 }),
  lastTerraformRun: timestamp('last_terraform_run', { withTimezone: true }),

  // Configuration
  region: varchar('region', { length: 50 }).notNull(),
  environment: varchar('environment', { length: 20 }).default('production').notNull(),
  tags: jsonb('tags').default({}),

  // Credentials (encrypted reference)
  credentialsSecretId: varchar('credentials_secret_id', { length: 255 }),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const cloudResources = pgTable('cloud_resources', {
  id: uuid('id').primaryKey().defaultRandom(),
  cloudAccountId: uuid('cloud_account_id')
    .references(() => cloudAccounts.id, { onDelete: 'cascade' })
    .notNull(),

  providerResourceId: varchar('provider_resource_id', { length: 500 }).notNull(),
  resourceType: varchar('resource_type', { length: 100 }).notNull(),
  resourceName: varchar('resource_name', { length: 255 }),

  region: varchar('region', { length: 50 }),
  status: varchar('status', { length: 50 }),
  configuration: jsonb('configuration').default({}),
  tags: jsonb('tags').default({}),

  monthlyCostEstimate: decimal('monthly_cost_estimate', { precision: 10, scale: 2 }),

  lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }).defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const cloudCosts = pgTable(
  'cloud_costs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    cloudAccountId: uuid('cloud_account_id')
      .references(() => cloudAccounts.id, { onDelete: 'cascade' })
      .notNull(),

    periodStart: date('period_start').notNull(),
    periodEnd: date('period_end').notNull(),

    totalCost: decimal('total_cost', { precision: 12, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).default('USD').notNull(),
    costBreakdown: jsonb('cost_breakdown').default({}).notNull(),

    fetchedAt: timestamp('fetched_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [unique().on(table.cloudAccountId, table.periodStart, table.periodEnd)]
);

export const cloudTransfers = pgTable('cloud_transfers', {
  id: uuid('id').primaryKey().defaultRandom(),
  cloudAccountId: uuid('cloud_account_id')
    .references(() => cloudAccounts.id, { onDelete: 'cascade' })
    .notNull(),

  status: transferStatusEnum('status').default('pending').notNull(),

  checklist: jsonb('checklist').default({}).notNull(),
  checklistCompletedAt: timestamp('checklist_completed_at', { withTimezone: true }),

  // Target info
  targetOrganizationId: varchar('target_organization_id', { length: 255 }),
  targetAccountEmail: varchar('target_account_email', { length: 255 }),
  targetBillingAccount: varchar('target_billing_account', { length: 255 }),

  // Workflow timestamps
  initiatedAt: timestamp('initiated_at', { withTimezone: true }),
  initiatedBy: uuid('initiated_by').references(() => users.id),
  executedAt: timestamp('executed_at', { withTimezone: true }),
  executedBy: uuid('executed_by').references(() => users.id),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  verifiedBy: uuid('verified_by').references(() => users.id),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  completedBy: uuid('completed_by').references(() => users.id),

  handoverDocumentId: uuid('handover_document_id'),
  credentialsDeliveredAt: timestamp('credentials_delivered_at', { withTimezone: true }),

  notes: text('notes'),
  issues: jsonb('issues').default([]),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const transferAuditLog = pgTable('transfer_audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  transferId: uuid('transfer_id')
    .references(() => cloudTransfers.id, { onDelete: 'cascade' })
    .notNull(),

  action: varchar('action', { length: 100 }).notNull(),
  actorId: uuid('actor_id').references(() => users.id),
  details: jsonb('details'),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const cloudAccountsRelations = relations(cloudAccounts, ({ one, many }) => ({
  project: one(projects, {
    fields: [cloudAccounts.projectId],
    references: [projects.id],
  }),
  resources: many(cloudResources),
  costs: many(cloudCosts),
  transfers: many(cloudTransfers),
}));

export const cloudResourcesRelations = relations(cloudResources, ({ one }) => ({
  cloudAccount: one(cloudAccounts, {
    fields: [cloudResources.cloudAccountId],
    references: [cloudAccounts.id],
  }),
}));

export const cloudCostsRelations = relations(cloudCosts, ({ one }) => ({
  cloudAccount: one(cloudAccounts, {
    fields: [cloudCosts.cloudAccountId],
    references: [cloudAccounts.id],
  }),
}));

export const cloudTransfersRelations = relations(cloudTransfers, ({ one, many }) => ({
  cloudAccount: one(cloudAccounts, {
    fields: [cloudTransfers.cloudAccountId],
    references: [cloudAccounts.id],
  }),
  initiator: one(users, {
    fields: [cloudTransfers.initiatedBy],
    references: [users.id],
  }),
  auditLogs: many(transferAuditLog),
}));

export const transferAuditLogRelations = relations(transferAuditLog, ({ one }) => ({
  transfer: one(cloudTransfers, {
    fields: [transferAuditLog.transferId],
    references: [cloudTransfers.id],
  }),
}));

export type CloudAccount = typeof cloudAccounts.$inferSelect;
export type NewCloudAccount = typeof cloudAccounts.$inferInsert;
export type CloudResource = typeof cloudResources.$inferSelect;
export type NewCloudResource = typeof cloudResources.$inferInsert;
export type CloudCost = typeof cloudCosts.$inferSelect;
export type NewCloudCost = typeof cloudCosts.$inferInsert;
export type CloudTransfer = typeof cloudTransfers.$inferSelect;
export type NewCloudTransfer = typeof cloudTransfers.$inferInsert;
export type TransferAuditLog = typeof transferAuditLog.$inferSelect;
export type NewTransferAuditLog = typeof transferAuditLog.$inferInsert;
