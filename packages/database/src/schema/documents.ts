import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  jsonb,
  integer,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { organizations } from './organizations';
import { projects } from './projects';
import { users } from './users';
import { documentTypeEnum, signatureStatusEnum } from './enums';

export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id)
    .notNull(),
  projectId: uuid('project_id').references(() => projects.id),
  uploadedBy: uuid('uploaded_by').references(() => users.id),

  type: documentTypeEnum('type').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),

  // Storage
  storageKey: varchar('storage_key', { length: 500 }).notNull(),
  storageUrl: text('storage_url'),
  mimeType: varchar('mime_type', { length: 100 }),
  fileSize: integer('file_size'),

  // Versioning
  version: integer('version').default(1).notNull(),
  parentDocumentId: uuid('parent_document_id'),

  // Contract specific
  templateId: varchar('template_id', { length: 100 }),
  generatedFrom: jsonb('generated_from').default({}),

  // Visibility
  isPublic: boolean('is_public').default(false),
  isArchived: boolean('is_archived').default(false),

  metadata: jsonb('metadata').default({}),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const documentVersions = pgTable('document_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  documentId: uuid('document_id')
    .references(() => documents.id, { onDelete: 'cascade' })
    .notNull(),

  version: integer('version').notNull(),
  storageKey: varchar('storage_key', { length: 500 }).notNull(),
  fileSize: integer('file_size'),

  changedBy: uuid('changed_by').references(() => users.id),
  changeNotes: text('change_notes'),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const signatures = pgTable('signatures', {
  id: uuid('id').primaryKey().defaultRandom(),
  documentId: uuid('document_id')
    .references(() => documents.id, { onDelete: 'cascade' })
    .notNull(),

  // Envelope reference (for multi-signer support)
  envelopeId: uuid('envelope_id'),

  // Signer info
  signerEmail: varchar('signer_email', { length: 255 }).notNull(),
  signerName: varchar('signer_name', { length: 255 }),
  signerUserId: uuid('signer_user_id').references(() => users.id),

  // Signing order (for sequential signing)
  signingOrder: integer('signing_order').default(1),

  status: signatureStatusEnum('status').default('pending').notNull(),

  // E-signature provider
  provider: varchar('provider', { length: 50 }), // simple, docusign, hellosign
  externalEnvelopeId: varchar('external_envelope_id', { length: 255 }),
  externalSignerId: varchar('external_signer_id', { length: 255 }),

  // Signing events
  sentAt: timestamp('sent_at', { withTimezone: true }),
  viewedAt: timestamp('viewed_at', { withTimezone: true }),
  signedAt: timestamp('signed_at', { withTimezone: true }),
  declinedAt: timestamp('declined_at', { withTimezone: true }),
  declineReason: text('decline_reason'),

  // Signed document
  signedDocumentKey: varchar('signed_document_key', { length: 500 }),

  // IP and metadata
  signerIp: varchar('signer_ip', { length: 50 }),
  metadata: jsonb('metadata').default({}),

  // Reminder tracking
  reminderCount: integer('reminder_count').default(0),
  lastReminderAt: timestamp('last_reminder_at', { withTimezone: true }),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const documentsRelations = relations(documents, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [documents.organizationId],
    references: [organizations.id],
  }),
  project: one(projects, {
    fields: [documents.projectId],
    references: [projects.id],
  }),
  uploader: one(users, {
    fields: [documents.uploadedBy],
    references: [users.id],
  }),
  versions: many(documentVersions),
  signatures: many(signatures),
}));

export const documentVersionsRelations = relations(documentVersions, ({ one }) => ({
  document: one(documents, {
    fields: [documentVersions.documentId],
    references: [documents.id],
  }),
}));

export const signaturesRelations = relations(signatures, ({ one, many }) => ({
  document: one(documents, {
    fields: [signatures.documentId],
    references: [documents.id],
  }),
  signer: one(users, {
    fields: [signatures.signerUserId],
    references: [users.id],
  }),
  // Note: envelope relation is defined in signature-envelopes.ts
  // Note: fields relation is defined in signature-fields.ts
}));

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type DocumentVersion = typeof documentVersions.$inferSelect;
export type NewDocumentVersion = typeof documentVersions.$inferInsert;
export type Signature = typeof signatures.$inferSelect;
export type NewSignature = typeof signatures.$inferInsert;
