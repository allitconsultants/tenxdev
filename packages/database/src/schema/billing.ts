import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  jsonb,
  decimal,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { organizations } from './organizations';
import { projects, milestones } from './projects';
import { invoiceStatusEnum, subscriptionStatusEnum } from './enums';

export const invoices = pgTable('invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id)
    .notNull(),
  projectId: uuid('project_id').references(() => projects.id),
  milestoneId: uuid('milestone_id').references(() => milestones.id),

  stripeInvoiceId: varchar('stripe_invoice_id', { length: 255 }).unique(),
  stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 255 }),

  number: varchar('number', { length: 50 }),
  status: invoiceStatusEnum('status').default('draft').notNull(),

  // Amounts
  subtotal: decimal('subtotal', { precision: 12, scale: 2 }).notNull(),
  tax: decimal('tax', { precision: 12, scale: 2 }).default('0'),
  total: decimal('total', { precision: 12, scale: 2 }).notNull(),
  amountPaid: decimal('amount_paid', { precision: 12, scale: 2 }).default('0'),
  currency: varchar('currency', { length: 3 }).default('USD').notNull(),

  // Line items
  lineItems: jsonb('line_items').default([]),

  // Dates
  dueDate: timestamp('due_date', { withTimezone: true }),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  paidAt: timestamp('paid_at', { withTimezone: true }),

  // PDF
  pdfUrl: text('pdf_url'),
  hostedInvoiceUrl: text('hosted_invoice_url'),

  // Notes
  notes: text('notes'),
  metadata: jsonb('metadata').default({}),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const paymentMethods = pgTable('payment_methods', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id)
    .notNull(),

  stripePaymentMethodId: varchar('stripe_payment_method_id', { length: 255 })
    .unique()
    .notNull(),

  type: varchar('type', { length: 50 }).notNull(), // card, bank_account, etc.
  isDefault: boolean('is_default').default(false),

  // Card details (for display)
  cardBrand: varchar('card_brand', { length: 50 }),
  cardLast4: varchar('card_last4', { length: 4 }),
  cardExpMonth: varchar('card_exp_month', { length: 2 }),
  cardExpYear: varchar('card_exp_year', { length: 4 }),

  // Bank account details
  bankName: varchar('bank_name', { length: 255 }),
  bankLast4: varchar('bank_last4', { length: 4 }),

  billingAddress: jsonb('billing_address').default({}),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id)
    .notNull(),
  projectId: uuid('project_id').references(() => projects.id),

  stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }).unique(),
  stripePriceId: varchar('stripe_price_id', { length: 255 }),

  status: subscriptionStatusEnum('status').default('active').notNull(),
  plan: varchar('plan', { length: 50 }).notNull(), // starter, growth, enterprise

  // Billing
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('USD').notNull(),
  interval: varchar('interval', { length: 20 }).default('month'), // month, year

  // Dates
  currentPeriodStart: timestamp('current_period_start', { withTimezone: true }),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
  canceledAt: timestamp('canceled_at', { withTimezone: true }),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false),

  metadata: jsonb('metadata').default({}),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const invoicesRelations = relations(invoices, ({ one }) => ({
  organization: one(organizations, {
    fields: [invoices.organizationId],
    references: [organizations.id],
  }),
  project: one(projects, {
    fields: [invoices.projectId],
    references: [projects.id],
  }),
  milestone: one(milestones, {
    fields: [invoices.milestoneId],
    references: [milestones.id],
  }),
}));

export const paymentMethodsRelations = relations(paymentMethods, ({ one }) => ({
  organization: one(organizations, {
    fields: [paymentMethods.organizationId],
    references: [organizations.id],
  }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  organization: one(organizations, {
    fields: [subscriptions.organizationId],
    references: [organizations.id],
  }),
  project: one(projects, {
    fields: [subscriptions.projectId],
    references: [projects.id],
  }),
}));

export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;
export type PaymentMethod = typeof paymentMethods.$inferSelect;
export type NewPaymentMethod = typeof paymentMethods.$inferInsert;
export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
