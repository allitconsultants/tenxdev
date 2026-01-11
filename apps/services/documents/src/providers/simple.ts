import crypto from 'crypto';
import { db, signatures, eq } from '@tenxdev/database';
import type {
  SignatureProvider,
  SignatureRequest,
  SignatureResult,
  SignatureStatusResult,
  SignatureStatus,
} from './base.js';

const PORTAL_URL = process.env.PORTAL_URL || 'http://localhost:3000';
const DEFAULT_EXPIRY_DAYS = 7;

/**
 * Simple Signature Provider
 *
 * Built-in signature provider that uses browser-based signature capture.
 * No external service required - signatures are captured via canvas and
 * embedded directly into PDFs.
 *
 * Flow:
 * 1. requestSignature() creates a unique token and returns signing URL
 * 2. User visits /sign/[token] in the portal
 * 3. User views document and draws signature on canvas
 * 4. Signature is submitted and embedded into PDF
 * 5. Signed PDF is stored and signature record updated
 */
export class SimpleSignatureProvider implements SignatureProvider {
  readonly name = 'simple';

  async requestSignature(request: SignatureRequest): Promise<SignatureResult> {
    // Generate unique signing token
    const token = crypto.randomUUID();

    // Calculate expiry
    const expiresInDays = request.expiresInDays || DEFAULT_EXPIRY_DAYS;
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

    // Build signing URL
    const signingUrl = `${PORTAL_URL}/sign/${token}`;

    return {
      signingUrl,
      externalEnvelopeId: token,
      externalSignerId: request.signerEmail,
      expiresAt,
    };
  }

  async getStatus(token: string): Promise<SignatureStatusResult> {
    // Look up signature by token (externalEnvelopeId)
    const result = await db
      .select()
      .from(signatures)
      .where(eq(signatures.externalEnvelopeId, token))
      .limit(1);

    if (result.length === 0) {
      return {
        status: 'expired',
      };
    }

    const signature = result[0];

    // Check if expired
    if (signature.metadata && typeof signature.metadata === 'object') {
      const metadata = signature.metadata as { expiresAt?: string };
      if (metadata.expiresAt && new Date(metadata.expiresAt) < new Date()) {
        return {
          status: 'expired',
        };
      }
    }

    return {
      status: signature.status as SignatureStatus,
      signedAt: signature.signedAt || undefined,
      viewedAt: signature.viewedAt || undefined,
      signerIp: signature.signerIp || undefined,
      declineReason: signature.declineReason || undefined,
    };
  }

  /**
   * Mark signature as viewed (called when user loads signing page)
   */
  async markViewed(token: string): Promise<void> {
    await db
      .update(signatures)
      .set({
        status: 'viewed',
        viewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(signatures.externalEnvelopeId, token));
  }

  /**
   * Complete signature (called when user submits signature)
   */
  async completeSignature(
    token: string,
    signedDocumentKey: string,
    signerIp: string
  ): Promise<void> {
    await db
      .update(signatures)
      .set({
        status: 'signed',
        signedAt: new Date(),
        signedDocumentKey,
        signerIp,
        updatedAt: new Date(),
      })
      .where(eq(signatures.externalEnvelopeId, token));
  }

  /**
   * Decline signature
   */
  async declineSignature(token: string, reason?: string): Promise<void> {
    await db
      .update(signatures)
      .set({
        status: 'declined',
        declinedAt: new Date(),
        declineReason: reason || null,
        updatedAt: new Date(),
      })
      .where(eq(signatures.externalEnvelopeId, token));
  }

  /**
   * Get signature record by token for validation
   */
  async getSignatureByToken(token: string) {
    const result = await db
      .select()
      .from(signatures)
      .where(eq(signatures.externalEnvelopeId, token))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Generate a unique signing token
   */
  async generateToken(): Promise<string> {
    return crypto.randomUUID();
  }
}
