import { Hono } from 'hono';
import { z } from 'zod';
import {
  db,
  documents,
  signatures,
  signatureEnvelopes,
  signatureFields,
  eq,
  and,
} from '@tenxdev/database';
import { NotFoundError, ValidationError, logger } from '@tenxdev/service-utils';
import { storage } from '../lib/storage.js';
import { getSimpleProvider } from '../providers/index.js';
import {
  detectMarkers,
  groupMarkersBySigner,
  validateMarkersForSigners,
  type DetectedMarker,
} from '../lib/pdf-marker-detector.js';
import {
  generateFinalSignedDocument,
  type SignerData,
  type FieldValue,
} from '../lib/pdf-signer.js';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';

// R2 client for downloading documents
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

const envelopesRoutes = new Hono();

const NOTIFICATIONS_URL = process.env.NOTIFICATIONS_SERVICE_URL || 'http://localhost:3004';
const PORTAL_URL = process.env.PORTAL_URL || 'http://localhost:3000';

// ========================================
// Validation Schemas
// ========================================

const signerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  signingOrder: z.number().optional().default(1),
});

const createEnvelopeSchema = z.object({
  documentId: z.string().uuid(),
  signers: z.array(signerSchema).min(1),
  signingOrder: z.enum(['sequential', 'parallel']).optional().default('parallel'),
  emailSubject: z.string().optional(),
  emailMessage: z.string().optional(),
  expiresInDays: z.number().min(1).max(90).optional().default(30),
  autoDetectMarkers: z.boolean().optional().default(true),
});

const fieldPositionSchema = z.object({
  type: z.enum(['signature', 'initials', 'date', 'text']),
  signerIndex: z.number().min(0),
  pageNumber: z.number().min(1),
  xPosition: z.number(),
  yPosition: z.number(),
  width: z.number().optional(),
  height: z.number().optional(),
});

const addSignerSchema = signerSchema;

// ========================================
// Envelope CRUD Endpoints
// ========================================

/**
 * Detect markers in a document (preview endpoint)
 */
envelopesRoutes.post('/detect-markers', async (c) => {
  const body = await c.req.json();
  const documentId = body.documentId as string;

  if (!documentId) {
    throw new ValidationError('documentId is required');
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

  if (doc.mimeType !== 'application/pdf') {
    throw new ValidationError('Only PDF documents can be scanned for markers');
  }

  // Download PDF
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: doc.storageKey,
  });

  const response = await s3Client.send(command);
  const pdfBuffer = Buffer.from(await response.Body!.transformToByteArray());

  // Detect markers
  const markers = await detectMarkers(pdfBuffer);

  return c.json({
    success: true,
    data: {
      documentId,
      documentName: doc.name,
      markers,
      markerCount: markers.length,
      signerCount: new Set(markers.map((m) => m.signerIndex)).size,
    },
  });
});

/**
 * Create a new envelope with multiple signers
 */
envelopesRoutes.post('/', async (c) => {
  const body = await c.req.json();
  const parsed = createEnvelopeSchema.safeParse(body);

  if (!parsed.success) {
    throw new ValidationError('Invalid envelope data', parsed.error.flatten().fieldErrors);
  }

  const { documentId, signers, signingOrder, emailSubject, emailMessage, expiresInDays, autoDetectMarkers } = parsed.data;

  // Verify document exists and is PDF
  const document = await db
    .select()
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1);

  if (document.length === 0) {
    throw new NotFoundError('Document not found');
  }

  const doc = document[0];

  if (doc.mimeType !== 'application/pdf') {
    throw new ValidationError('Only PDF documents can be signed');
  }

  // Detect markers if enabled
  let detectedMarkers: DetectedMarker[] = [];
  if (autoDetectMarkers) {
    try {
      const command = new GetObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: doc.storageKey,
      });

      const response = await s3Client.send(command);
      const pdfBuffer = Buffer.from(await response.Body!.transformToByteArray());
      detectedMarkers = await detectMarkers(pdfBuffer);

      // Validate markers match signers (warning only)
      const validation = validateMarkersForSigners(detectedMarkers, signers.length);
      if (!validation.valid) {
        logger.warn(
          { documentId, errors: validation.errors },
          'Marker validation warnings'
        );
      }
    } catch (error) {
      logger.warn({ error, documentId }, 'Failed to detect markers, continuing without fields');
    }
  }

  // Calculate expiry date
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  // Create envelope
  const envelope = await db
    .insert(signatureEnvelopes)
    .values({
      documentId,
      status: 'draft',
      signingOrder: signingOrder as 'sequential' | 'parallel',
      senderUserId: doc.uploadedBy,
      emailSubject: emailSubject || `Please sign: ${doc.name}`,
      emailMessage,
      expiresAt,
    })
    .returning();

  const envelopeRecord = envelope[0];

  // Create signature records for each signer
  const simpleProvider = getSimpleProvider();
  const signatureRecords = [];
  const groupedMarkers = groupMarkersBySigner(detectedMarkers);

  for (let i = 0; i < signers.length; i++) {
    const signer = signers[i];
    // Generate signing token
    const signingToken = await simpleProvider.generateToken();

    const signatureRecord = await db
      .insert(signatures)
      .values({
        documentId,
        envelopeId: envelopeRecord.id,
        signerEmail: signer.email,
        signerName: signer.name,
        signingOrder: signer.signingOrder,
        status: 'pending',
        provider: 'simple',
        externalEnvelopeId: signingToken,
        metadata: {
          expiresAt: expiresAt.toISOString(),
        },
      })
      .returning();

    const sigRecord = signatureRecord[0];
    signatureRecords.push(sigRecord);

    // Create signature fields from detected markers for this signer
    const signerMarkers = groupedMarkers.get(i) || [];
    for (const marker of signerMarkers) {
      await db.insert(signatureFields).values({
        signatureId: sigRecord.id,
        fieldType: marker.type as 'signature' | 'initials' | 'date' | 'text',
        pageNumber: marker.pageNumber,
        xPosition: marker.xPosition.toString(),
        yPosition: marker.yPosition.toString(),
        width: marker.width.toString(),
        height: marker.height.toString(),
        markerText: marker.markerText,
        isRequired: marker.type === 'signature' || marker.type === 'initials',
      });
    }
  }

  logger.info(
    {
      envelopeId: envelopeRecord.id,
      documentId,
      signerCount: signers.length,
      markerCount: detectedMarkers.length,
    },
    'Envelope created'
  );

  return c.json({
    success: true,
    data: {
      envelope: envelopeRecord,
      signatures: signatureRecords,
      detectedMarkers: detectedMarkers.length,
    },
  });
});

/**
 * Get envelope with all signatures
 */
envelopesRoutes.get('/:envelopeId', async (c) => {
  const envelopeId = c.req.param('envelopeId');

  const envelope = await db
    .select()
    .from(signatureEnvelopes)
    .where(eq(signatureEnvelopes.id, envelopeId))
    .limit(1);

  if (envelope.length === 0) {
    throw new NotFoundError('Envelope not found');
  }

  // Get all signatures for this envelope
  const envelopeSignatures = await db
    .select()
    .from(signatures)
    .where(eq(signatures.envelopeId, envelopeId));

  // Get document
  const document = await db
    .select()
    .from(documents)
    .where(eq(documents.id, envelope[0].documentId))
    .limit(1);

  // Get signature fields for each signature
  const signaturesWithFields = await Promise.all(
    envelopeSignatures.map(async (sig) => {
      const fields = await db
        .select()
        .from(signatureFields)
        .where(eq(signatureFields.signatureId, sig.id));

      return {
        ...sig,
        fields,
      };
    })
  );

  return c.json({
    success: true,
    data: {
      envelope: envelope[0],
      document: document[0],
      signatures: signaturesWithFields,
    },
  });
});

/**
 * Add a signer to an existing envelope (draft only)
 */
envelopesRoutes.post('/:envelopeId/signers', async (c) => {
  const envelopeId = c.req.param('envelopeId');
  const body = await c.req.json();
  const parsed = addSignerSchema.safeParse(body);

  if (!parsed.success) {
    throw new ValidationError('Invalid signer data', parsed.error.flatten().fieldErrors);
  }

  const envelope = await db
    .select()
    .from(signatureEnvelopes)
    .where(eq(signatureEnvelopes.id, envelopeId))
    .limit(1);

  if (envelope.length === 0) {
    throw new NotFoundError('Envelope not found');
  }

  if (envelope[0].status !== 'draft') {
    throw new ValidationError('Can only add signers to draft envelopes');
  }

  const simpleProvider = getSimpleProvider();
  const signingToken = await simpleProvider.generateToken();

  const signatureRecord = await db
    .insert(signatures)
    .values({
      documentId: envelope[0].documentId,
      envelopeId,
      signerEmail: parsed.data.email,
      signerName: parsed.data.name,
      signingOrder: parsed.data.signingOrder,
      status: 'pending',
      provider: 'simple',
      externalEnvelopeId: signingToken,
      metadata: {
        expiresAt: envelope[0].expiresAt?.toISOString(),
      },
    })
    .returning();

  return c.json({
    success: true,
    data: signatureRecord[0],
  });
});

/**
 * Remove a signer from an envelope (draft only)
 */
envelopesRoutes.delete('/:envelopeId/signers/:signatureId', async (c) => {
  const envelopeId = c.req.param('envelopeId');
  const signatureId = c.req.param('signatureId');

  const envelope = await db
    .select()
    .from(signatureEnvelopes)
    .where(eq(signatureEnvelopes.id, envelopeId))
    .limit(1);

  if (envelope.length === 0) {
    throw new NotFoundError('Envelope not found');
  }

  if (envelope[0].status !== 'draft') {
    throw new ValidationError('Can only remove signers from draft envelopes');
  }

  await db
    .delete(signatures)
    .where(and(eq(signatures.id, signatureId), eq(signatures.envelopeId, envelopeId)));

  return c.json({
    success: true,
    message: 'Signer removed',
  });
});

// ========================================
// Envelope Actions
// ========================================

/**
 * Send envelope to all signers
 */
envelopesRoutes.post('/:envelopeId/send', async (c) => {
  const envelopeId = c.req.param('envelopeId');

  const envelope = await db
    .select()
    .from(signatureEnvelopes)
    .where(eq(signatureEnvelopes.id, envelopeId))
    .limit(1);

  if (envelope.length === 0) {
    throw new NotFoundError('Envelope not found');
  }

  const env = envelope[0];

  if (env.status !== 'draft') {
    throw new ValidationError('Envelope has already been sent');
  }

  // Get document
  const document = await db
    .select()
    .from(documents)
    .where(eq(documents.id, env.documentId))
    .limit(1);

  const doc = document[0];

  // Get all signatures
  const envelopeSignatures = await db
    .select()
    .from(signatures)
    .where(eq(signatures.envelopeId, envelopeId));

  if (envelopeSignatures.length === 0) {
    throw new ValidationError('Envelope has no signers');
  }

  // Determine which signers to notify based on signing order
  let signersToNotify = envelopeSignatures;

  if (env.signingOrder === 'sequential') {
    // Only notify the first signer(s) in sequence
    const minOrder = Math.min(...envelopeSignatures.map((s) => s.signingOrder || 1));
    signersToNotify = envelopeSignatures.filter((s) => (s.signingOrder || 1) === minOrder);
  }

  // Send emails to signers
  for (const sig of signersToNotify) {
    const signingUrl = `${PORTAL_URL}/sign/${sig.externalEnvelopeId}`;

    try {
      await fetch(`${NOTIFICATIONS_URL}/api/v1/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: sig.signerEmail,
          type: 'signature_requested',
          title: 'Document Signature Requested',
          message: `You have been requested to sign "${doc.name}"`,
          emailTemplate: 'signature-request',
          emailVariables: {
            senderName: env.senderName || 'TenxDev',
            senderEmail: env.senderEmail || '',
            signerName: sig.signerName || sig.signerEmail,
            documentName: doc.name,
            signingUrl,
            message: env.emailMessage || '',
            expiresAt: env.expiresAt?.toISOString() || '',
          },
        }),
      });

      // Update signature status to sent
      await db
        .update(signatures)
        .set({
          status: 'sent',
          sentAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(signatures.id, sig.id));
    } catch (error) {
      logger.warn({ error, signatureId: sig.id }, 'Failed to send signature request email');
    }
  }

  // Update envelope status
  const newStatus = env.signingOrder === 'sequential' ? 'sent' : 'in_progress';
  await db
    .update(signatureEnvelopes)
    .set({
      status: newStatus,
      sentAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(signatureEnvelopes.id, envelopeId));

  logger.info(
    {
      envelopeId,
      signerCount: signersToNotify.length,
    },
    'Envelope sent'
  );

  return c.json({
    success: true,
    message: `Envelope sent to ${signersToNotify.length} signer(s)`,
    data: {
      status: newStatus,
      signersNotified: signersToNotify.length,
    },
  });
});

/**
 * Void (cancel) an envelope
 */
envelopesRoutes.post('/:envelopeId/void', async (c) => {
  const envelopeId = c.req.param('envelopeId');
  const body = await c.req.json().catch(() => ({}));
  const reason = (body as { reason?: string }).reason;

  const envelope = await db
    .select()
    .from(signatureEnvelopes)
    .where(eq(signatureEnvelopes.id, envelopeId))
    .limit(1);

  if (envelope.length === 0) {
    throw new NotFoundError('Envelope not found');
  }

  const env = envelope[0];

  if (env.status === 'completed' || env.status === 'voided') {
    throw new ValidationError(`Cannot void an envelope that is ${env.status}`);
  }

  // Update envelope
  await db
    .update(signatureEnvelopes)
    .set({
      status: 'voided',
      voidedAt: new Date(),
      metadata: {
        ...(env.metadata as object || {}),
        voidReason: reason,
      },
      updatedAt: new Date(),
    })
    .where(eq(signatureEnvelopes.id, envelopeId));

  // Update all pending signatures
  await db
    .update(signatures)
    .set({
      status: 'declined',
      declinedAt: new Date(),
      declineReason: 'Envelope voided',
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(signatures.envelopeId, envelopeId),
        eq(signatures.status, 'pending')
      )
    );

  logger.info({ envelopeId, reason }, 'Envelope voided');

  return c.json({
    success: true,
    message: 'Envelope voided',
  });
});

/**
 * Send reminders to pending signers
 */
envelopesRoutes.post('/:envelopeId/remind', async (c) => {
  const envelopeId = c.req.param('envelopeId');

  const envelope = await db
    .select()
    .from(signatureEnvelopes)
    .where(eq(signatureEnvelopes.id, envelopeId))
    .limit(1);

  if (envelope.length === 0) {
    throw new NotFoundError('Envelope not found');
  }

  const env = envelope[0];

  if (env.status !== 'sent' && env.status !== 'in_progress') {
    throw new ValidationError('Can only send reminders for active envelopes');
  }

  // Get document
  const document = await db
    .select()
    .from(documents)
    .where(eq(documents.id, env.documentId))
    .limit(1);

  const doc = document[0];

  // Get pending/sent signatures
  const pendingSignatures = await db
    .select()
    .from(signatures)
    .where(
      and(
        eq(signatures.envelopeId, envelopeId),
        eq(signatures.status, 'sent')
      )
    );

  let remindersSent = 0;

  for (const sig of pendingSignatures) {
    const signingUrl = `${PORTAL_URL}/sign/${sig.externalEnvelopeId}`;

    try {
      await fetch(`${NOTIFICATIONS_URL}/api/v1/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: sig.signerEmail,
          type: 'signature_reminder',
          title: 'Reminder: Document Signature Requested',
          message: `Reminder: Please sign "${doc.name}"`,
          emailTemplate: 'signature-reminder',
          emailVariables: {
            senderName: env.senderName || 'TenxDev',
            signerName: sig.signerName || sig.signerEmail,
            documentName: doc.name,
            signingUrl,
          },
        }),
      });

      // Update reminder count
      await db
        .update(signatures)
        .set({
          reminderCount: (sig.reminderCount || 0) + 1,
          lastReminderAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(signatures.id, sig.id));

      remindersSent++;
    } catch (error) {
      logger.warn({ error, signatureId: sig.id }, 'Failed to send reminder email');
    }
  }

  logger.info({ envelopeId, remindersSent }, 'Reminders sent');

  return c.json({
    success: true,
    message: `Reminders sent to ${remindersSent} signer(s)`,
    data: {
      remindersSent,
    },
  });
});

/**
 * Download final signed document
 */
envelopesRoutes.get('/:envelopeId/download', async (c) => {
  const envelopeId = c.req.param('envelopeId');

  const envelope = await db
    .select()
    .from(signatureEnvelopes)
    .where(eq(signatureEnvelopes.id, envelopeId))
    .limit(1);

  if (envelope.length === 0) {
    throw new NotFoundError('Envelope not found');
  }

  const env = envelope[0];

  if (env.status !== 'completed') {
    throw new ValidationError('Envelope is not yet completed');
  }

  if (!env.finalDocumentKey) {
    throw new ValidationError('Final document not yet generated');
  }

  const downloadUrl = await storage.getSignedDownloadUrl(env.finalDocumentKey);

  return c.json({
    success: true,
    data: {
      downloadUrl,
    },
  });
});

// ========================================
// List Endpoints
// ========================================

/**
 * List envelopes for a document
 */
envelopesRoutes.get('/document/:documentId', async (c) => {
  const documentId = c.req.param('documentId');

  const envelopes = await db
    .select()
    .from(signatureEnvelopes)
    .where(eq(signatureEnvelopes.documentId, documentId));

  return c.json({
    success: true,
    data: envelopes,
  });
});

/**
 * Helper function to check and complete envelope
 * Called after a signature is completed to check if all signers are done
 */
export async function checkEnvelopeCompletion(envelopeId: string): Promise<boolean> {
  const envelope = await db
    .select()
    .from(signatureEnvelopes)
    .where(eq(signatureEnvelopes.id, envelopeId))
    .limit(1);

  if (envelope.length === 0) return false;

  const env = envelope[0];

  // Get all signatures
  const envelopeSignatures = await db
    .select()
    .from(signatures)
    .where(eq(signatures.envelopeId, envelopeId));

  const allSigned = envelopeSignatures.every((s) => s.status === 'signed');

  if (allSigned) {
    // Get document for final document generation
    const document = await db
      .select()
      .from(documents)
      .where(eq(documents.id, env.documentId))
      .limit(1);

    const doc = document[0];

    // Generate final signed document with all signatures
    let finalDocumentKey: string | null = null;

    try {
      // Download original PDF
      const command = new GetObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: doc.storageKey,
      });

      const response = await s3Client.send(command);
      const pdfBuffer = Buffer.from(await response.Body!.transformToByteArray());

      // Build signer data with field values
      const signersData: SignerData[] = [];

      for (const sig of envelopeSignatures) {
        // Get signature fields for this signer
        const fields = await db
          .select()
          .from(signatureFields)
          .where(eq(signatureFields.signatureId, sig.id));

        const fieldValues: FieldValue[] = fields
          .filter((f) => f.fieldValue) // Only include completed fields
          .map((f) => ({
            fieldId: f.id,
            type: f.fieldType as 'signature' | 'initials' | 'date' | 'text',
            value: f.fieldValue!,
            pageNumber: f.pageNumber,
            x: parseFloat(f.xPosition),
            y: parseFloat(f.yPosition),
            width: parseFloat(f.width || '200'),
            height: parseFloat(f.height || '50'),
          }));

        signersData.push({
          signerName: sig.signerName || sig.signerEmail,
          signerEmail: sig.signerEmail,
          signedAt: sig.signedAt || new Date(),
          signerIp: sig.signerIp || undefined,
          fields: fieldValues,
        });
      }

      // Generate final PDF with all signatures embedded
      const finalPdfBuffer = await generateFinalSignedDocument(
        pdfBuffer,
        signersData,
        doc.name
      );

      // Upload final document to R2
      finalDocumentKey = doc.storageKey.replace('.pdf', `-final-${Date.now()}.pdf`);
      await storage.upload(finalDocumentKey, finalPdfBuffer, 'application/pdf');

      logger.info(
        { envelopeId, finalDocumentKey },
        'Final signed document generated'
      );
    } catch (error) {
      logger.error({ error, envelopeId }, 'Failed to generate final document');
      // Continue with completion even if final document fails
    }

    // Mark envelope as completed
    await db
      .update(signatureEnvelopes)
      .set({
        status: 'completed',
        completedAt: new Date(),
        finalDocumentKey,
        updatedAt: new Date(),
      })
      .where(eq(signatureEnvelopes.id, envelopeId));

    // Build signers list HTML
    const signersListHtml = envelopeSignatures
      .map(
        (s) =>
          `<div class="signer"><strong>${s.signerName}</strong> (${s.signerEmail}) - Signed ${s.signedAt?.toLocaleDateString()}</div>`
      )
      .join('');

    // Notify document owner
    if (env.senderUserId) {
      try {
        await fetch(`${NOTIFICATIONS_URL}/api/v1/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: env.senderUserId,
            type: 'envelope_completed',
            title: 'All Signatures Collected',
            message: `All signatures have been collected for "${doc.name}"`,
            link: `/documents/${doc.id}`,
            emailTemplate: 'envelope-completed',
            emailVariables: {
              ownerName: env.senderName || 'there',
              documentName: doc.name,
              signersList: signersListHtml,
              documentUrl: `${PORTAL_URL}/documents/${doc.id}`,
            },
          }),
        });
      } catch (error) {
        logger.warn({ error, envelopeId }, 'Failed to send envelope completed notification');
      }
    }

    logger.info({ envelopeId, finalDocumentKey }, 'Envelope completed');
    return true;
  }

  // For sequential signing, notify next signer
  if (env.signingOrder === 'sequential') {
    const signedOrders = envelopeSignatures
      .filter((s) => s.status === 'signed')
      .map((s) => s.signingOrder || 1);

    const maxSignedOrder = signedOrders.length > 0 ? Math.max(...signedOrders) : 0;

    const nextSigners = envelopeSignatures.filter(
      (s) => s.status === 'pending' && (s.signingOrder || 1) === maxSignedOrder + 1
    );

    // Get document for notification
    const document = await db
      .select()
      .from(documents)
      .where(eq(documents.id, env.documentId))
      .limit(1);

    const doc = document[0];

    for (const sig of nextSigners) {
      const signingUrl = `${PORTAL_URL}/sign/${sig.externalEnvelopeId}`;

      try {
        await fetch(`${NOTIFICATIONS_URL}/api/v1/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: sig.signerEmail,
            type: 'signature_requested',
            title: 'Your turn to sign',
            message: `It's now your turn to sign "${doc.name}"`,
            emailTemplate: 'signature-request',
            emailVariables: {
              senderName: env.senderName || 'TenxDev',
              senderEmail: env.senderEmail || '',
              signerName: sig.signerName || sig.signerEmail,
              documentName: doc.name,
              signingUrl,
              message: env.emailMessage || '',
              expiresAt: env.expiresAt?.toISOString() || '',
            },
          }),
        });

        // Update signature status
        await db
          .update(signatures)
          .set({
            status: 'sent',
            sentAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(signatures.id, sig.id));
      } catch (error) {
        logger.warn({ error, signatureId: sig.id }, 'Failed to notify next signer');
      }
    }
  }

  return false;
}

export { envelopesRoutes };
