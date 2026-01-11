-- Migration: Add E-Signature Tables (DocuSign-like functionality)
-- Created: 2026-01-10
-- Depends on: 0000_initial_schema.sql

-- Create new enums for e-signature
DO $$ BEGIN
    CREATE TYPE "public"."envelope_status" AS ENUM('draft', 'sent', 'in_progress', 'completed', 'voided', 'expired');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "public"."signing_order" AS ENUM('sequential', 'parallel');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "public"."signature_field_type" AS ENUM('signature', 'initials', 'date', 'text');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create signature_envelopes table
CREATE TABLE IF NOT EXISTS "signature_envelopes" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "document_id" uuid NOT NULL REFERENCES "documents"("id") ON DELETE CASCADE,
    "status" "envelope_status" DEFAULT 'draft' NOT NULL,
    "signing_order" "signing_order" DEFAULT 'parallel' NOT NULL,
    "sender_user_id" uuid REFERENCES "users"("id"),
    "sender_name" varchar(255),
    "sender_email" varchar(255),
    "email_subject" varchar(500),
    "email_message" text,
    "sent_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "voided_at" timestamp with time zone,
    "expires_at" timestamp with time zone,
    "final_document_key" varchar(500),
    "metadata" jsonb DEFAULT '{}'::jsonb,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Add foreign key from signatures.envelope_id to signature_envelopes
DO $$ BEGIN
    ALTER TABLE "signatures" ADD CONSTRAINT "fk_signatures_envelope"
    FOREIGN KEY ("envelope_id") REFERENCES "signature_envelopes"("id") ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create signature_fields table
CREATE TABLE IF NOT EXISTS "signature_fields" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "signature_id" uuid NOT NULL REFERENCES "signatures"("id") ON DELETE CASCADE,
    "field_type" "signature_field_type" DEFAULT 'signature' NOT NULL,
    "page_number" integer DEFAULT 1 NOT NULL,
    "x_position" decimal(10, 2) NOT NULL,
    "y_position" decimal(10, 2) NOT NULL,
    "width" decimal(10, 2) DEFAULT 200,
    "height" decimal(10, 2) DEFAULT 50,
    "marker_text" varchar(100),
    "is_required" boolean DEFAULT true,
    "completed_at" timestamp with time zone,
    "field_value" text,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "idx_signature_envelopes_document_id" ON "signature_envelopes"("document_id");
CREATE INDEX IF NOT EXISTS "idx_signature_envelopes_status" ON "signature_envelopes"("status");
CREATE INDEX IF NOT EXISTS "idx_signature_envelopes_sender_user_id" ON "signature_envelopes"("sender_user_id");
CREATE INDEX IF NOT EXISTS "idx_signatures_envelope_id" ON "signatures"("envelope_id");
CREATE INDEX IF NOT EXISTS "idx_signature_fields_signature_id" ON "signature_fields"("signature_id");
