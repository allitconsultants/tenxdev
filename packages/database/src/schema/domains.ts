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
import { projects } from './projects';
import { domainStatusEnum } from './enums';

export const domains = pgTable('domains', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id)
    .notNull(),
  projectId: uuid('project_id').references(() => projects.id),

  domain: varchar('domain_name', { length: 255 }).unique().notNull(),
  tld: varchar('tld', { length: 50 }).notNull(),

  status: domainStatusEnum('status').default('pending').notNull(),

  // Cloudflare
  cloudflareZoneId: varchar('cloudflare_zone_id', { length: 255 }),
  cloudflareRegistrarId: varchar('cloudflare_registrar_id', { length: 255 }),

  // Registration
  registeredAt: timestamp('registered_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  autoRenew: boolean('auto_renew').default(true),

  // Pricing
  registrationPrice: decimal('registration_price', { precision: 10, scale: 2 }),
  renewalPrice: decimal('renewal_price', { precision: 10, scale: 2 }),
  currency: varchar('currency', { length: 3 }).default('USD'),

  // Privacy
  privacyEnabled: boolean('privacy_enabled').default(true),

  // Nameservers
  nameservers: jsonb('nameservers').default([]),
  useCloudflareNs: boolean('use_cloudflare_ns').default(true),

  // Contact info
  registrantContact: jsonb('registrant_contact').default({}),

  metadata: jsonb('metadata').default({}),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const dnsRecords = pgTable('dns_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  domainId: uuid('domain_id')
    .references(() => domains.id, { onDelete: 'cascade' })
    .notNull(),

  cloudflareRecordId: varchar('cloudflare_record_id', { length: 255 }),

  type: varchar('type', { length: 20 }).notNull(), // A, AAAA, CNAME, TXT, MX, etc.
  name: varchar('name', { length: 255 }).notNull(), // subdomain or @
  content: text('content').notNull(), // IP, target, value
  ttl: integer('ttl').default(1), // 1 = auto
  proxied: boolean('proxied').default(true),
  priority: integer('priority'), // for MX records

  // Auto-configured for project
  isAutoConfigured: boolean('is_auto_configured').default(false),
  configuredForProjectId: uuid('configured_for_project_id').references(() => projects.id),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const domainsRelations = relations(domains, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [domains.organizationId],
    references: [organizations.id],
  }),
  project: one(projects, {
    fields: [domains.projectId],
    references: [projects.id],
  }),
  dnsRecords: many(dnsRecords),
}));

export const dnsRecordsRelations = relations(dnsRecords, ({ one }) => ({
  domain: one(domains, {
    fields: [dnsRecords.domainId],
    references: [domains.id],
  }),
  configuredForProject: one(projects, {
    fields: [dnsRecords.configuredForProjectId],
    references: [projects.id],
  }),
}));

export type Domain = typeof domains.$inferSelect;
export type NewDomain = typeof domains.$inferInsert;
export type DnsRecord = typeof dnsRecords.$inferSelect;
export type NewDnsRecord = typeof dnsRecords.$inferInsert;
