import { Hono } from 'hono';
import { z } from 'zod';
import { db, documents, signatures, signatureFields, eq, and } from '@tenxdev/database';
import { NotFoundError, ValidationError, logger } from '@tenxdev/service-utils';
import { getSignatureProvider, getSimpleProvider } from '../providers/index.js';
import { storage } from '../lib/storage.js';
import { addSignaturePage } from '../lib/pdf-signer.js';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { checkEnvelopeCompletion } from './envelopes.js';

const signaturesRoutes = new Hono();

const NOTIFICATIONS_URL = process.env.NOTIFICATIONS_SERVICE_URL || 'http://localhost:3004';

// S3 client for downloading documents
const R2_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || '';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '';
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'tenxdev-documents';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

const requestSignatureSchema = z.object({
  signerEmail: z.string().email(),
  signerName: z.string().min(1),
  message: z.string().optional(),
  redirectUrl: z.string().url().optional(),
  expiresInDays: z.number().min(1).max(30).optional(),
});

const fieldValueSchema = z.object({
  fieldId: z.string().uuid(),
  type: z.enum(['signature', 'initials', 'date', 'text']),
  value: z.string(),
});

const completeSignatureSchema = z.object({
  signatureImage: z.string(), // Base64 PNG data (legacy support)
  fields: z.array(fieldValueSchema).optional(), // New field-based signing
});

const declineSignatureSchema = z.object({
  reason: z.string().optional(),
});

// ========================================
// Document Owner Endpoints (Authenticated)
// ========================================

/**
 * Request signature on a document
 * Creates signature record and returns signing URL
 */
signaturesRoutes.post('/:documentId/sign/request', async (c) => {
  const documentId = c.req.param('documentId');
  const body = await c.req.json();
  const parsed = requestSignatureSchema.safeParse(body);

  if (!parsed.success) {
    throw new ValidationError('Invalid signature request', parsed.error.flatten().fieldErrors);
  }

  // Get document
  const document = await db
    .select()
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1);

  if (document.length === 0) {
    throw new NotFoundError('Document not found');
  }

  const doc = document[0];

  // Check document is signable (PDF)
  if (doc.mimeType !== 'application/pdf') {
    throw new ValidationError('Only PDF documents can be signed');
  }

  // Get provider and request signature
  const provider = getSignatureProvider();
  const downloadUrl = await storage.getSignedDownloadUrl(doc.storageKey);

  const result = await provider.requestSignature({
    documentId,
    documentUrl: downloadUrl,
    signerEmail: parsed.data.signerEmail,
    signerName: parsed.data.signerName,
    message: parsed.data.message,
    redirectUrl: parsed.data.redirectUrl,
    expiresInDays: parsed.data.expiresInDays,
  });

  // Create signature record
  const signatureRecord = await db
    .insert(signatures)
    .values({
      documentId,
      signerEmail: parsed.data.signerEmail,
      signerName: parsed.data.signerName,
      status: 'sent',
      provider: provider.name,
      externalEnvelopeId: result.externalEnvelopeId,
      externalSignerId: result.externalSignerId,
      sentAt: new Date(),
      metadata: {
        message: parsed.data.message,
        redirectUrl: parsed.data.redirectUrl,
        expiresAt: result.expiresAt?.toISOString(),
      },
    })
    .returning();

  logger.info(
    {
      documentId,
      signatureId: signatureRecord[0].id,
      signerEmail: parsed.data.signerEmail,
      provider: provider.name,
    },
    'Signature request created'
  );

  // Send notification email to signer
  try {
    await fetch(`${NOTIFICATIONS_URL}/api/v1/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: parsed.data.signerEmail,
        type: 'signature_requested',
        title: 'Document Signature Requested',
        message: `You have been requested to sign "${doc.name}"`,
        emailTemplate: 'signature-request',
        emailVariables: {
          signerName: parsed.data.signerName,
          documentName: doc.name,
          signingUrl: result.signingUrl,
          message: parsed.data.message || '',
          expiresAt: result.expiresAt?.toISOString() || '',
        },
      }),
    });
  } catch (error) {
    logger.warn({ error }, 'Failed to send signature request email');
  }

  return c.json({
    success: true,
    data: {
      signatureId: signatureRecord[0].id,
      signingUrl: result.signingUrl,
      expiresAt: result.expiresAt,
    },
  });
});

/**
 * Get all signatures for a document
 */
signaturesRoutes.get('/:documentId/signatures', async (c) => {
  const documentId = c.req.param('documentId');

  const result = await db
    .select()
    .from(signatures)
    .where(eq(signatures.documentId, documentId));

  return c.json({
    success: true,
    data: result,
  });
});

/**
 * Resend signature request
 */
signaturesRoutes.post('/:documentId/signatures/:signatureId/resend', async (c) => {
  const documentId = c.req.param('documentId');
  const signatureId = c.req.param('signatureId');

  const signature = await db
    .select()
    .from(signatures)
    .where(and(eq(signatures.id, signatureId), eq(signatures.documentId, documentId)))
    .limit(1);

  if (signature.length === 0) {
    throw new NotFoundError('Signature not found');
  }

  const sig = signature[0];

  if (sig.status === 'signed') {
    throw new ValidationError('Document already signed');
  }

  // Get document for email
  const document = await db
    .select()
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1);

  const doc = document[0];
  const metadata = sig.metadata as { message?: string; expiresAt?: string } || {};

  // Get provider and create new signing URL
  const provider = getSignatureProvider();
  const downloadUrl = await storage.getSignedDownloadUrl(doc.storageKey);

  const result = await provider.requestSignature({
    documentId,
    documentUrl: downloadUrl,
    signerEmail: sig.signerEmail,
    signerName: sig.signerName || '',
    message: metadata.message,
  });

  // Update signature record with new token
  await db
    .update(signatures)
    .set({
      externalEnvelopeId: result.externalEnvelopeId,
      status: 'sent',
      sentAt: new Date(),
      viewedAt: null,
      metadata: {
        ...metadata,
        expiresAt: result.expiresAt?.toISOString(),
      },
      updatedAt: new Date(),
    })
    .where(eq(signatures.id, signatureId));

  // Send email
  try {
    await fetch(`${NOTIFICATIONS_URL}/api/v1/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: sig.signerEmail,
        type: 'signature_requested',
        title: 'Reminder: Document Signature Requested',
        message: `Reminder: You have been requested to sign "${doc.name}"`,
        emailTemplate: 'signature-reminder',
        emailVariables: {
          signerName: sig.signerName || '',
          documentName: doc.name,
          signingUrl: result.signingUrl,
          message: metadata.message || '',
        },
      }),
    });
  } catch (error) {
    logger.warn({ error }, 'Failed to send signature reminder email');
  }

  logger.info({ signatureId }, 'Signature request resent');

  return c.json({
    success: true,
    data: {
      signingUrl: result.signingUrl,
    },
  });
});

// ========================================
// Public Signing Endpoints (No Auth Required)
// ========================================

/**
 * Get signing info by token (public endpoint for signing page)
 */
signaturesRoutes.get('/sign/:token', async (c) => {
  const token = c.req.param('token');

  const simpleProvider = getSimpleProvider();
  const signature = await simpleProvider.getSignatureByToken(token);

  if (!signature) {
    throw new NotFoundError('Invalid or expired signing link');
  }

  // Check if expired
  const metadata = (signature.metadata || {}) as { expiresAt?: string; message?: string };
  if (metadata.expiresAt && new Date(metadata.expiresAt) < new Date()) {
    throw new ValidationError('This signing link has expired');
  }

  // Check if already signed
  if (signature.status === 'signed') {
    throw new ValidationError('This document has already been signed');
  }

  if (signature.status === 'declined') {
    throw new ValidationError('This signature request was declined');
  }

  // Get document
  const document = await db
    .select()
    .from(documents)
    .where(eq(documents.id, signature.documentId))
    .limit(1);

  if (document.length === 0) {
    throw new NotFoundError('Document not found');
  }

  const doc = document[0];

  // Mark as viewed if first time
  if (signature.status === 'sent') {
    await simpleProvider.markViewed(token);
  }

  // Get download URL for PDF viewer
  const documentUrl = await storage.getSignedDownloadUrl(doc.storageKey);

  // Get signature fields for this signature
  const fields = await db
    .select()
    .from(signatureFields)
    .where(eq(signatureFields.signatureId, signature.id));

  return c.json({
    success: true,
    data: {
      signatureId: signature.id,
      documentId: doc.id,
      documentName: doc.name,
      documentUrl,
      signerName: signature.signerName,
      signerEmail: signature.signerEmail,
      message: metadata.message || null,
      status: signature.status,
      fields: fields.map((f) => ({
        id: f.id,
        type: f.fieldType,
        pageNumber: f.pageNumber,
        x: parseFloat(f.xPosition),
        y: parseFloat(f.yPosition),
        width: parseFloat(f.width || '200'),
        height: parseFloat(f.height || '50'),
        markerText: f.markerText,
        isRequired: f.isRequired,
        completed: !!f.completedAt,
      })),
    },
  });
});

/**
 * Submit signature (public endpoint)
 */
signaturesRoutes.post('/sign/:token/complete', async (c) => {
  const token = c.req.param('token');
  const body = await c.req.json();
  const parsed = completeSignatureSchema.safeParse(body);

  if (!parsed.success) {
    throw new ValidationError('Invalid signature data', parsed.error.flatten().fieldErrors);
  }

  const simpleProvider = getSimpleProvider();
  const signature = await simpleProvider.getSignatureByToken(token);

  if (!signature) {
    throw new NotFoundError('Invalid or expired signing link');
  }

  // Validate signature status
  if (signature.status === 'signed') {
    throw new ValidationError('This document has already been signed');
  }

  if (signature.status === 'declined') {
    throw new ValidationError('This signature request was declined');
  }

  // Get document
  const document = await db
    .select()
    .from(documents)
    .where(eq(documents.id, signature.documentId))
    .limit(1);

  if (document.length === 0) {
    throw new NotFoundError('Document not found');
  }

  const doc = document[0];

  // Get signer IP
  const signerIp = c.req.header('x-forwarded-for')?.split(',')[0] ||
    c.req.header('x-real-ip') ||
    'unknown';

  // Decode signature image
  const signatureImageBase64 = parsed.data.signatureImage.replace(/^data:image\/png;base64,/, '');
  const signatureImageBuffer = Buffer.from(signatureImageBase64, 'base64');

  // Download original PDF
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: doc.storageKey,
  });

  const response = await s3Client.send(command);
  const pdfBuffer = Buffer.from(await response.Body!.transformToByteArray());

  // Embed signature into PDF
  const signedAt = new Date();
  const signedPdfBuffer = await addSignaturePage(pdfBuffer, signatureImageBuffer, {
    signerName: signature.signerName || '',
    signerEmail: signature.signerEmail,
    signedAt,
    signerIp,
    documentName: doc.name,
    message: (signature.metadata as { message?: string })?.message,
  });

  // Generate signed document storage key
  const signedStorageKey = doc.storageKey.replace('.pdf', `-signed-${Date.now()}.pdf`);

  // Upload signed PDF
  await storage.upload(signedStorageKey, signedPdfBuffer, 'application/pdf');

  // Update signature record
  await simpleProvider.completeSignature(token, signedStorageKey, signerIp);

  // Save field values if provided (new field-based signing)
  if (parsed.data.fields && parsed.data.fields.length > 0) {
    for (const field of parsed.data.fields) {
      await db
        .update(signatureFields)
        .set({
          fieldValue: field.value,
          completedAt: signedAt,
          updatedAt: signedAt,
        })
        .where(
          and(
            eq(signatureFields.id, field.fieldId),
            eq(signatureFields.signatureId, signature.id)
          )
        );
    }
    logger.info(
      { signatureId: signature.id, fieldCount: parsed.data.fields.length },
      'Saved signature field values'
    );
  }

  logger.info(
    {
      signatureId: signature.id,
      documentId: doc.id,
      signerEmail: signature.signerEmail,
    },
    'Document signed successfully'
  );

  // Send notification to document owner
  if (doc.uploadedBy) {
    try {
      await fetch(`${NOTIFICATIONS_URL}/api/v1/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: doc.uploadedBy,
          type: 'document_signed',
          title: 'Document Signed',
          message: `${signature.signerName} has signed "${doc.name}"`,
          link: `/documents/${doc.id}`,
          emailTemplate: 'document-signed',
          emailVariables: {
            documentName: doc.name,
            signerName: signature.signerName,
            signerEmail: signature.signerEmail,
            signedAt: signedAt.toISOString(),
          },
        }),
      });
    } catch (error) {
      logger.warn({ error }, 'Failed to send document signed notification');
    }
  }

  // Check if this was part of an envelope and if all signers are done
  if (signature.envelopeId) {
    try {
      await checkEnvelopeCompletion(signature.envelopeId);
    } catch (error) {
      logger.warn({ error, envelopeId: signature.envelopeId }, 'Failed to check envelope completion');
    }
  }

  // Get redirect URL from metadata
  const metadata = signature.metadata as { redirectUrl?: string } || {};

  return c.json({
    success: true,
    message: 'Document signed successfully',
    data: {
      signedAt,
      redirectUrl: metadata.redirectUrl || null,
    },
  });
});

/**
 * Decline signature (public endpoint)
 */
signaturesRoutes.post('/sign/:token/decline', async (c) => {
  const token = c.req.param('token');
  const body = await c.req.json().catch(() => ({}));
  const parsed = declineSignatureSchema.safeParse(body);

  const simpleProvider = getSimpleProvider();
  const signature = await simpleProvider.getSignatureByToken(token);

  if (!signature) {
    throw new NotFoundError('Invalid or expired signing link');
  }

  if (signature.status === 'signed') {
    throw new ValidationError('This document has already been signed');
  }

  // Get document for notification
  const document = await db
    .select()
    .from(documents)
    .where(eq(documents.id, signature.documentId))
    .limit(1);

  const doc = document[0];

  // Decline the signature
  await simpleProvider.declineSignature(token, parsed.data?.reason);

  logger.info(
    {
      signatureId: signature.id,
      documentId: signature.documentId,
      reason: parsed.data?.reason,
    },
    'Signature declined'
  );

  // Notify document owner
  if (doc?.uploadedBy) {
    try {
      await fetch(`${NOTIFICATIONS_URL}/api/v1/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: doc.uploadedBy,
          type: 'signature_declined',
          title: 'Signature Declined',
          message: `${signature.signerName} has declined to sign "${doc.name}"`,
          link: `/documents/${doc.id}`,
          emailTemplate: 'signature-declined',
          emailVariables: {
            documentName: doc.name,
            signerName: signature.signerName,
            signerEmail: signature.signerEmail,
            declineReason: parsed.data?.reason || 'No reason provided',
          },
        }),
      });
    } catch (error) {
      logger.warn({ error }, 'Failed to send signature declined notification');
    }
  }

  return c.json({
    success: true,
    message: 'Signature declined',
  });
});

/**
 * Download signed document
 */
signaturesRoutes.get('/:documentId/signatures/:signatureId/download', async (c) => {
  const documentId = c.req.param('documentId');
  const signatureId = c.req.param('signatureId');

  const signature = await db
    .select()
    .from(signatures)
    .where(and(eq(signatures.id, signatureId), eq(signatures.documentId, documentId)))
    .limit(1);

  if (signature.length === 0) {
    throw new NotFoundError('Signature not found');
  }

  const sig = signature[0];

  if (sig.status !== 'signed' || !sig.signedDocumentKey) {
    throw new ValidationError('Document has not been signed yet');
  }

  const downloadUrl = await storage.getSignedDownloadUrl(sig.signedDocumentKey);

  return c.json({
    success: true,
    data: {
      downloadUrl,
    },
  });
});

export { signaturesRoutes };
