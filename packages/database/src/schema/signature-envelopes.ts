import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { documents } from './documents';
import { users } from './users';
import { envelopeStatusEnum, signingOrderEnum } from './enums';

export const signatureEnvelopes = pgTable('signature_envelopes', {
  id: uuid('id').primaryKey().defaultRandom(),
  documentId: uuid('document_id')
    .references(() => documents.id, { onDelete: 'cascade' })
    .notNull(),

  // Envelope status
  status: envelopeStatusEnum('status').default('draft').notNull(),
  signingOrder: signingOrderEnum('signing_order').default('parallel').notNull(),

  // Sender info
  senderUserId: uuid('sender_user_id').references(() => users.id),
  senderName: varchar('sender_name', { length: 255 }),
  senderEmail: varchar('sender_email', { length: 255 }),

  // Email content
  emailSubject: varchar('email_subject', { length: 500 }),
  emailMessage: text('email_message'),

  // Timestamps
  sentAt: timestamp('sent_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  voidedAt: timestamp('voided_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),

  // Final signed document
  finalDocumentKey: varchar('final_document_key', { length: 500 }),

  // Flexible metadata
  metadata: jsonb('metadata').default({}),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const signatureEnvelopesRelations = relations(signatureEnvelopes, ({ one, many }) => ({
  document: one(documents, {
    fields: [signatureEnvelopes.documentId],
    references: [documents.id],
  }),
  sender: one(users, {
    fields: [signatureEnvelopes.senderUserId],
    references: [users.id],
  }),
}));

export type SignatureEnvelope = typeof signatureEnvelopes.$inferSelect;
export type NewSignatureEnvelope = typeof signatureEnvelopes.$inferInsert;
