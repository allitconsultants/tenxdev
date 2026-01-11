import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  jsonb,
  decimal,
  integer,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { organizations } from './organizations';
import {
  projectStatusEnum,
  projectTierEnum,
  milestoneStatusEnum,
  paymentStatusEnum,
  cloudProviderEnum,
} from './enums';

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id)
    .notNull(),

  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull(),
  description: text('description'),

  // Tier and status
  tier: projectTierEnum('tier').notNull(),
  status: projectStatusEnum('status').default('draft').notNull(),

  // Cloud provider preference
  cloudProvider: cloudProviderEnum('cloud_provider'),

  // GitHub
  githubAppRepoUrl: text('github_app_repo_url'),
  githubInfraRepoUrl: text('github_infra_repo_url'),

  // Environment URLs
  stagingUrl: text('staging_url'),
  productionUrl: text('production_url'),

  // External links
  grafanaUrl: text('grafana_url'),
  logsUrl: text('logs_url'),
  ciCdUrl: text('ci_cd_url'),

  // Progress
  progress: integer('progress').default(0),

  // User references
  clientUserId: uuid('client_user_id'),
  accountManagerId: uuid('account_manager_id'),

  // Pricing
  totalAmount: decimal('total_amount', { precision: 12, scale: 2 }),
  amountPaid: decimal('amount_paid', { precision: 12, scale: 2 }).default('0'),
  currency: varchar('currency', { length: 3 }).default('USD'),

  // Contract
  contractDocumentId: uuid('contract_document_id'),

  // Dates
  estimatedStartDate: timestamp('estimated_start_date', { withTimezone: true }),
  estimatedEndDate: timestamp('estimated_end_date', { withTimezone: true }),
  actualStartDate: timestamp('actual_start_date', { withTimezone: true }),
  actualEndDate: timestamp('actual_end_date', { withTimezone: true }),

  // Metadata
  tags: jsonb('tags').default([]),
  metadata: jsonb('metadata').default({}),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const milestones = pgTable('milestones', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .references(() => projects.id, { onDelete: 'cascade' })
    .notNull(),

  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  orderIndex: integer('order_index').notNull(),

  status: milestoneStatusEnum('status').default('pending').notNull(),

  // Payment
  paymentAmount: decimal('payment_amount', { precision: 12, scale: 2 }),
  paymentPercentage: integer('payment_percentage'),
  paymentStatus: paymentStatusEnum('payment_status').default('pending'),
  stripeInvoiceId: varchar('stripe_invoice_id', { length: 255 }),
  paidAt: timestamp('paid_at', { withTimezone: true }),

  // Dates
  dueDate: timestamp('due_date', { withTimezone: true }),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  approvedBy: uuid('approved_by'),

  // Deliverables
  deliverables: jsonb('deliverables').default([]),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const activityLogs = pgTable('activity_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .references(() => projects.id, { onDelete: 'cascade' })
    .notNull(),
  userId: uuid('user_id'),

  type: varchar('type', { length: 100 }).notNull(),
  title: varchar('title', { length: 255 }),
  action: varchar('action', { length: 100 }).notNull(),
  description: text('description'),
  isPublic: boolean('is_public').default(false),
  metadata: jsonb('metadata').default({}),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const statusUpdates = pgTable('status_updates', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .references(() => projects.id, { onDelete: 'cascade' })
    .notNull(),
  userId: uuid('user_id').notNull(),

  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(),
  attachments: jsonb('attachments').default([]),

  isPublished: boolean('is_published').default(true),
  publishedAt: timestamp('published_at', { withTimezone: true }),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const projectsRelations = relations(projects, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [projects.organizationId],
    references: [organizations.id],
  }),
  milestones: many(milestones),
  activityLogs: many(activityLogs),
  statusUpdates: many(statusUpdates),
}));

export const milestonesRelations = relations(milestones, ({ one }) => ({
  project: one(projects, {
    fields: [milestones.projectId],
    references: [projects.id],
  }),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  project: one(projects, {
    fields: [activityLogs.projectId],
    references: [projects.id],
  }),
}));

export const statusUpdatesRelations = relations(statusUpdates, ({ one }) => ({
  project: one(projects, {
    fields: [statusUpdates.projectId],
    references: [projects.id],
  }),
}));

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Milestone = typeof milestones.$inferSelect;
export type NewMilestone = typeof milestones.$inferInsert;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type NewActivityLog = typeof activityLogs.$inferInsert;
export type StatusUpdate = typeof statusUpdates.$inferSelect;
export type NewStatusUpdate = typeof statusUpdates.$inferInsert;
