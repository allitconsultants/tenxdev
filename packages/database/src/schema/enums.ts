import { pgEnum } from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', ['owner', 'admin', 'member', 'viewer']);

export const projectStatusEnum = pgEnum('project_status', [
  'draft',
  'active',
  'discovery',
  'development',
  'testing',
  'staging',
  'production',
  'transfer',
  'transferred',
  'completed',
  'cancelled',
]);

export const projectTierEnum = pgEnum('project_tier', ['tier1', 'tier2', 'tier3']);

export const milestoneStatusEnum = pgEnum('milestone_status', [
  'pending',
  'in_progress',
  'completed',
  'approved',
  'overdue',
]);

export const paymentStatusEnum = pgEnum('payment_status', [
  'pending',
  'invoiced',
  'paid',
  'overdue',
  'cancelled',
]);

export const cloudProviderEnum = pgEnum('cloud_provider', ['aws', 'gcp', 'azure']);

export const cloudAccountStatusEnum = pgEnum('cloud_account_status', [
  'pending',
  'provisioning',
  'active',
  'transferring',
  'transferred',
  'failed',
]);

export const transferStatusEnum = pgEnum('transfer_status', [
  'pending',
  'checklist_in_progress',
  'ready',
  'executing',
  'verifying',
  'completed',
  'failed',
]);

export const domainStatusEnum = pgEnum('domain_status', [
  'pending',
  'active',
  'expired',
  'transferring',
  'transferred',
]);

export const documentTypeEnum = pgEnum('document_type', [
  'contract',
  'sow',
  'invoice',
  'proposal',
  'deliverable',
  'other',
]);

export const signatureStatusEnum = pgEnum('signature_status', [
  'pending',
  'sent',
  'viewed',
  'signed',
  'declined',
  'expired',
]);

export const envelopeStatusEnum = pgEnum('envelope_status', [
  'draft',
  'sent',
  'in_progress',
  'completed',
  'voided',
  'expired',
]);

export const signingOrderEnum = pgEnum('signing_order', [
  'sequential',
  'parallel',
]);

export const signatureFieldTypeEnum = pgEnum('signature_field_type', [
  'signature',
  'initials',
  'date',
  'text',
]);

export const notificationTypeEnum = pgEnum('notification_type', [
  'project_update',
  'milestone_completed',
  'payment_received',
  'payment_due',
  'invoice_sent',
  'document_signed',
  'signature_requested',
  'signature_declined',
  'domain_expiring',
  'transfer_ready',
  'transfer_update',
  'terraform_plan_complete',
  'terraform_apply_complete',
  'terraform_destroy_complete',
  'system',
]);

export const invoiceStatusEnum = pgEnum('invoice_status', [
  'draft',
  'sent',
  'paid',
  'overdue',
  'cancelled',
  'refunded',
]);

export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'active',
  'past_due',
  'cancelled',
  'paused',
]);
