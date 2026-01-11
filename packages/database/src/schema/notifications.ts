import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  jsonb,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { organizations } from './organizations';
import { users } from './users';
import { projects } from './projects';
import { notificationTypeEnum } from './enums';

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  organizationId: uuid('organization_id').references(() => organizations.id),
  projectId: uuid('project_id').references(() => projects.id),

  type: notificationTypeEnum('type').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),

  // Links
  link: text('link'),
  actionUrl: text('action_url'),
  actionLabel: varchar('action_label', { length: 100 }),

  // Status
  isRead: boolean('is_read').default(false).notNull(),
  readAt: timestamp('read_at', { withTimezone: true }),

  // Email tracking
  emailSent: boolean('email_sent').default(false),
  emailSentAt: timestamp('email_sent_at', { withTimezone: true }),

  metadata: jsonb('metadata').default({}),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const notificationPreferences = pgTable('notification_preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),

  // Channel preferences
  emailEnabled: boolean('email_enabled').default(true).notNull(),
  inAppEnabled: boolean('in_app_enabled').default(true).notNull(),
  webhookEnabled: boolean('webhook_enabled').default(false).notNull(),
  webhookUrl: text('webhook_url'),
  webhookSecret: varchar('webhook_secret', { length: 255 }),

  // Type preferences
  projectUpdates: boolean('project_updates').default(true).notNull(),
  milestoneAlerts: boolean('milestone_alerts').default(true).notNull(),
  milestoneUpdates: boolean('milestone_updates').default(true).notNull(),
  billingAlerts: boolean('billing_alerts').default(true).notNull(),
  paymentReminders: boolean('payment_reminders').default(true).notNull(),
  domainAlerts: boolean('domain_alerts').default(true).notNull(),
  documentUpdates: boolean('document_updates').default(true).notNull(),
  transferUpdates: boolean('transfer_updates').default(true).notNull(),
  marketingEmails: boolean('marketing_emails').default(false).notNull(),

  // Digest preferences
  digestFrequency: varchar('digest_frequency', { length: 20 }).default('daily'), // none, daily, weekly
  digestTime: varchar('digest_time', { length: 5 }).default('09:00'), // HH:MM

  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const webhooks = pgTable('webhooks', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),

  name: varchar('name', { length: 255 }).notNull(),
  url: text('url').notNull(),
  secret: varchar('secret', { length: 255 }),

  events: jsonb('events').default([]).notNull(), // ['project.updated', 'milestone.completed']
  isActive: boolean('is_active').default(true).notNull(),

  // Stats
  lastDeliveredAt: timestamp('last_delivered_at', { withTimezone: true }),
  lastStatusCode: varchar('last_status_code', { length: 3 }),
  failureCount: jsonb('failure_count').default(0),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const webhookDeliveries = pgTable('webhook_deliveries', {
  id: uuid('id').primaryKey().defaultRandom(),
  webhookId: uuid('webhook_id')
    .references(() => webhooks.id, { onDelete: 'cascade' })
    .notNull(),

  event: varchar('event', { length: 100 }).notNull(),
  payload: jsonb('payload').notNull(),

  // Response
  statusCode: varchar('status_code', { length: 3 }),
  responseBody: text('response_body'),
  responseTimeMs: jsonb('response_time_ms'),

  // Retry info
  attempts: jsonb('attempts').default(1),
  nextRetryAt: timestamp('next_retry_at', { withTimezone: true }),

  deliveredAt: timestamp('delivered_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [notifications.organizationId],
    references: [organizations.id],
  }),
  project: one(projects, {
    fields: [notifications.projectId],
    references: [projects.id],
  }),
}));

export const notificationPreferencesRelations = relations(
  notificationPreferences,
  ({ one }) => ({
    user: one(users, {
      fields: [notificationPreferences.userId],
      references: [users.id],
    }),
  })
);

export const webhooksRelations = relations(webhooks, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [webhooks.organizationId],
    references: [organizations.id],
  }),
  deliveries: many(webhookDeliveries),
}));

export const webhookDeliveriesRelations = relations(webhookDeliveries, ({ one }) => ({
  webhook: one(webhooks, {
    fields: [webhookDeliveries.webhookId],
    references: [webhooks.id],
  }),
}));

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
export type NotificationPreferences = typeof notificationPreferences.$inferSelect;
export type NewNotificationPreferences = typeof notificationPreferences.$inferInsert;
export type Webhook = typeof webhooks.$inferSelect;
export type NewWebhook = typeof webhooks.$inferInsert;
export type WebhookDelivery = typeof webhookDeliveries.$inferSelect;
export type NewWebhookDelivery = typeof webhookDeliveries.$inferInsert;
