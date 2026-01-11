import {
  pgTable,
  uuid,
  varchar,
  integer,
  decimal,
  text,
  timestamp,
  boolean,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { signatures } from './documents';
import { signatureFieldTypeEnum } from './enums';

export const signatureFields = pgTable('signature_fields', {
  id: uuid('id').primaryKey().defaultRandom(),
  signatureId: uuid('signature_id')
    .references(() => signatures.id, { onDelete: 'cascade' })
    .notNull(),

  // Field type
  fieldType: signatureFieldTypeEnum('field_type').default('signature').notNull(),

  // Position on PDF (in points, origin bottom-left)
  pageNumber: integer('page_number').default(1).notNull(),
  xPosition: decimal('x_position', { precision: 10, scale: 2 }).notNull(),
  yPosition: decimal('y_position', { precision: 10, scale: 2 }).notNull(),
  width: decimal('width', { precision: 10, scale: 2 }).default('200'),
  height: decimal('height', { precision: 10, scale: 2 }).default('50'),

  // Marker info (if detected from PDF)
  markerText: varchar('marker_text', { length: 100 }),
  isRequired: boolean('is_required').default(true),

  // Completion tracking
  completedAt: timestamp('completed_at', { withTimezone: true }),
  fieldValue: text('field_value'), // Stores signature data URL or text

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const signatureFieldsRelations = relations(signatureFields, ({ one }) => ({
  signature: one(signatures, {
    fields: [signatureFields.signatureId],
    references: [signatures.id],
  }),
}));

export type SignatureField = typeof signatureFields.$inferSelect;
export type NewSignatureField = typeof signatureFields.$inferInsert;
