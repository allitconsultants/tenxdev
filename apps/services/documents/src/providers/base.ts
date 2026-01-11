/**
 * E-Signature Provider Interface
 *
 * This defines the contract for signature providers.
 * Implementations can be:
 * - SimpleSignatureProvider (built-in, browser-based)
 * - DocuSignProvider (external)
 * - HelloSignProvider (external)
 */

export type SignatureStatus = 'pending' | 'sent' | 'viewed' | 'signed' | 'declined' | 'expired';

export interface SignatureRequest {
  documentId: string;
  documentUrl: string;
  signerEmail: string;
  signerName: string;
  message?: string;
  redirectUrl?: string;
  expiresInDays?: number;
}

export interface SignatureResult {
  signingUrl: string;
  externalEnvelopeId: string;
  externalSignerId: string;
  expiresAt?: Date;
}

export interface SignatureStatusResult {
  status: SignatureStatus;
  signedAt?: Date;
  viewedAt?: Date;
  signedDocumentUrl?: string;
  signerIp?: string;
  declineReason?: string;
}

export interface WebhookResult {
  signatureId: string;
  status: SignatureStatus;
  signedAt?: Date;
  signerIp?: string;
  signedDocumentKey?: string;
}

export interface SignatureProvider {
  /** Provider name identifier */
  readonly name: string;

  /**
   * Request a signature from a signer
   * Creates the envelope/signature request and returns the signing URL
   */
  requestSignature(request: SignatureRequest): Promise<SignatureResult>;

  /**
   * Get the current status of a signature request
   */
  getStatus(externalEnvelopeId: string): Promise<SignatureStatusResult>;

  /**
   * Handle incoming webhook from the provider (for external providers)
   * Returns the updated signature status
   */
  handleWebhook?(
    payload: unknown,
    headers: Record<string, string>
  ): Promise<WebhookResult>;

  /**
   * Verify webhook signature (for external providers)
   */
  verifyWebhook?(
    payload: string,
    signature: string,
    secret: string
  ): boolean;

  /**
   * Download the signed document from the provider (for external providers)
   */
  downloadSignedDocument?(externalEnvelopeId: string): Promise<Buffer>;
}
