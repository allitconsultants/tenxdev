import { apiClient } from './client';

// Types based on database schema
export interface Document {
  id: string;
  organizationId: string;
  projectId?: string | null;
  uploadedBy?: string | null;
  type: 'contract' | 'proposal' | 'invoice' | 'receipt' | 'sow' | 'nda' | 'other';
  name: string;
  description?: string | null;
  storageKey: string;
  storageUrl?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  version: number;
  parentDocumentId?: string | null;
  templateId?: string | null;
  generatedFrom?: Record<string, unknown>;
  isPublic: boolean;
  isArchived: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Signature {
  id: string;
  documentId: string;
  envelopeId?: string | null;
  signerEmail: string;
  signerName?: string | null;
  signerUserId?: string | null;
  signingOrder: number;
  status: 'pending' | 'sent' | 'viewed' | 'signed' | 'declined' | 'expired';
  provider?: string | null;
  externalEnvelopeId?: string | null;
  externalSignerId?: string | null;
  sentAt?: string | null;
  viewedAt?: string | null;
  signedAt?: string | null;
  declinedAt?: string | null;
  declineReason?: string | null;
  signedDocumentKey?: string | null;
  signerIp?: string | null;
  metadata?: Record<string, unknown>;
  reminderCount: number;
  lastReminderAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SignatureField {
  id: string;
  signatureId: string;
  fieldType: 'signature' | 'initials' | 'date' | 'text';
  pageNumber: number;
  xPosition: string;
  yPosition: string;
  width: string;
  height: string;
  markerText?: string | null;
  isRequired: boolean;
  completedAt?: string | null;
  fieldValue?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SignatureEnvelope {
  id: string;
  documentId: string;
  status: 'draft' | 'sent' | 'in_progress' | 'completed' | 'voided' | 'expired';
  signingOrder: 'sequential' | 'parallel';
  senderUserId?: string | null;
  senderName?: string | null;
  senderEmail?: string | null;
  emailSubject?: string | null;
  emailMessage?: string | null;
  sentAt?: string | null;
  completedAt?: string | null;
  voidedAt?: string | null;
  expiresAt?: string | null;
  finalDocumentKey?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface SignatureWithFields extends Signature {
  fields: SignatureField[];
}

export interface EnvelopeWithDetails {
  envelope: SignatureEnvelope;
  document: Document;
  signatures: SignatureWithFields[];
}

export interface DocumentWithEnvelopes extends Document {
  envelopes: SignatureEnvelope[];
}

export interface DetectedMarker {
  type: 'signature' | 'initials' | 'date' | 'text';
  markerText: string;
  signerIndex: number;
  pageNumber: number;
  xPosition: number;
  yPosition: number;
  width: number;
  height: number;
}

/**
 * Get all documents for the organization
 */
export async function getDocuments() {
  return apiClient<Document[]>('documents', '/api/v1/documents');
}

/**
 * Get a single document by ID
 */
export async function getDocument(id: string) {
  return apiClient<Document>('documents', `/api/v1/documents/${id}`);
}

/**
 * Get all envelopes for a document
 */
export async function getDocumentEnvelopes(documentId: string) {
  return apiClient<SignatureEnvelope[]>('documents', `/api/v1/envelopes/document/${documentId}`);
}

/**
 * Get a single envelope with all signatures
 */
export async function getEnvelope(envelopeId: string) {
  return apiClient<EnvelopeWithDetails>('documents', `/api/v1/envelopes/${envelopeId}`);
}

/**
 * Detect markers in a document
 */
export async function detectMarkers(documentId: string) {
  return apiClient<{
    documentId: string;
    documentName: string;
    markers: DetectedMarker[];
    markerCount: number;
    signerCount: number;
  }>('documents', '/api/v1/envelopes/detect-markers', {
    method: 'POST',
    body: JSON.stringify({ documentId }),
  });
}

/**
 * Create a new envelope with signers
 */
export async function createEnvelope(data: {
  documentId: string;
  signers: Array<{
    email: string;
    name: string;
    signingOrder?: number;
  }>;
  signingOrder?: 'sequential' | 'parallel';
  emailSubject?: string;
  emailMessage?: string;
  expiresInDays?: number;
  autoDetectMarkers?: boolean;
}) {
  return apiClient<{
    envelope: SignatureEnvelope;
    signatures: Signature[];
    detectedMarkers: number;
  }>('documents', '/api/v1/envelopes', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Send an envelope to signers
 */
export async function sendEnvelope(envelopeId: string) {
  return apiClient<{
    status: string;
    signersNotified: number;
  }>('documents', `/api/v1/envelopes/${envelopeId}/send`, {
    method: 'POST',
  });
}

/**
 * Void (cancel) an envelope
 */
export async function voidEnvelope(envelopeId: string, reason?: string) {
  return apiClient<void>('documents', `/api/v1/envelopes/${envelopeId}/void`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

/**
 * Send reminders to pending signers
 */
export async function sendReminders(envelopeId: string) {
  return apiClient<{
    remindersSent: number;
  }>('documents', `/api/v1/envelopes/${envelopeId}/remind`, {
    method: 'POST',
  });
}

/**
 * Get download URL for signed document
 */
export async function getSignedDocumentUrl(envelopeId: string) {
  return apiClient<{
    downloadUrl: string;
  }>('documents', `/api/v1/envelopes/${envelopeId}/download`);
}

/**
 * Get signatures for a document
 */
export async function getDocumentSignatures(documentId: string) {
  return apiClient<Signature[]>('documents', `/api/v1/documents/${documentId}/signatures`);
}

/**
 * Upload a new document
 */
export async function uploadDocument(data: {
  name: string;
  type: Document['type'];
  description?: string;
  projectId?: string;
  file: File;
}) {
  // For file upload, we use FormData instead of JSON
  const formData = new FormData();
  formData.append('name', data.name);
  formData.append('type', data.type);
  if (data.description) formData.append('description', data.description);
  if (data.projectId) formData.append('projectId', data.projectId);
  formData.append('file', data.file);

  return apiClient<Document>('documents', '/api/v1/documents', {
    method: 'POST',
    headers: {
      // Don't set Content-Type for FormData - let browser set it with boundary
    },
    body: formData,
  });
}
