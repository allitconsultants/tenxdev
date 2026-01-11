-- Initial Schema Migration for TenxDev
-- Creates all base tables required for the application

-- ===========================================
-- ENUMS
-- ===========================================

DO $$ BEGIN
    CREATE TYPE "public"."user_role" AS ENUM('owner', 'admin', 'member', 'viewer');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "public"."document_type" AS ENUM('contract', 'sow', 'invoice', 'proposal', 'deliverable', 'other');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "public"."signature_status" AS ENUM('pending', 'sent', 'viewed', 'signed', 'declined', 'expired');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ===========================================
-- ORGANIZATIONS
-- ===========================================

CREATE TABLE IF NOT EXISTS "organizations" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "clerk_org_id" varchar(255) UNIQUE,
    "name" varchar(255) NOT NULL,
    "slug" varchar(255) UNIQUE,
    "logo_url" text,
    "stripe_customer_id" varchar(255) UNIQUE,
    "settings" jsonb DEFAULT '{}'::jsonb,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    "deleted_at" timestamp with time zone
);

-- ===========================================
-- USERS
-- ===========================================

CREATE TABLE IF NOT EXISTS "users" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "clerk_user_id" varchar(255) UNIQUE NOT NULL,
    "organization_id" uuid REFERENCES "organizations"("id"),
    "email" varchar(255) NOT NULL,
    "first_name" varchar(255),
    "last_name" varchar(255),
    "avatar_url" text,
    "role" "user_role" DEFAULT 'member' NOT NULL,
    "is_admin" boolean DEFAULT false NOT NULL,
    "notification_preferences" jsonb DEFAULT '{"email": true, "inApp": true, "milestoneUpdates": true, "paymentReminders": true}'::jsonb,
    "last_login_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- ===========================================
-- DOCUMENTS
-- ===========================================

CREATE TABLE IF NOT EXISTS "documents" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "organization_id" uuid REFERENCES "organizations"("id") NOT NULL,
    "project_id" uuid,
    "uploaded_by" uuid REFERENCES "users"("id"),
    "type" "document_type" NOT NULL,
    "name" varchar(255) NOT NULL,
    "description" text,
    "storage_key" varchar(500) NOT NULL,
    "storage_url" text,
    "mime_type" varchar(100),
    "file_size" integer,
    "version" integer DEFAULT 1 NOT NULL,
    "parent_document_id" uuid,
    "template_id" varchar(100),
    "generated_from" jsonb DEFAULT '{}'::jsonb,
    "is_public" boolean DEFAULT false,
    "is_archived" boolean DEFAULT false,
    "metadata" jsonb DEFAULT '{}'::jsonb,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- ===========================================
-- SIGNATURES (base table - before envelopes)
-- ===========================================

CREATE TABLE IF NOT EXISTS "signatures" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "document_id" uuid REFERENCES "documents"("id") ON DELETE CASCADE NOT NULL,
    "envelope_id" uuid,  -- Will add FK after signature_envelopes is created
    "signer_email" varchar(255) NOT NULL,
    "signer_name" varchar(255),
    "signer_user_id" uuid REFERENCES "users"("id"),
    "signing_order" integer DEFAULT 1,
    "status" "signature_status" DEFAULT 'pending' NOT NULL,
    "provider" varchar(50),
    "external_envelope_id" varchar(255),
    "external_signer_id" varchar(255),
    "sent_at" timestamp with time zone,
    "viewed_at" timestamp with time zone,
    "signed_at" timestamp with time zone,
    "declined_at" timestamp with time zone,
    "decline_reason" text,
    "signed_document_key" varchar(500),
    "signer_ip" varchar(50),
    "metadata" jsonb DEFAULT '{}'::jsonb,
    "reminder_count" integer DEFAULT 0,
    "last_reminder_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- ===========================================
-- INDEXES
-- ===========================================

CREATE INDEX IF NOT EXISTS "idx_users_organization" ON "users"("organization_id");
CREATE INDEX IF NOT EXISTS "idx_users_email" ON "users"("email");
CREATE INDEX IF NOT EXISTS "idx_documents_organization" ON "documents"("organization_id");
CREATE INDEX IF NOT EXISTS "idx_documents_type" ON "documents"("type");
CREATE INDEX IF NOT EXISTS "idx_documents_archived" ON "documents"("is_archived");
CREATE INDEX IF NOT EXISTS "idx_signatures_document" ON "signatures"("document_id");
CREATE INDEX IF NOT EXISTS "idx_signatures_status" ON "signatures"("status");
CREATE INDEX IF NOT EXISTS "idx_signatures_signer_email" ON "signatures"("signer_email");

-- Create default organization for documents without org context
INSERT INTO "organizations" ("id", "name", "slug")
VALUES ('00000000-0000-0000-0000-000000000000', 'Default', 'default')
ON CONFLICT ("id") DO NOTHING;
