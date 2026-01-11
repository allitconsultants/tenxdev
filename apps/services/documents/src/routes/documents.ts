import { Hono } from 'hono';
import { z } from 'zod';
import { db, documents, documentVersions, eq, desc, and } from '@tenxdev/database';
import { storage } from '../lib/storage.js';
import { NotFoundError, ValidationError } from '@tenxdev/service-utils';

const documentsRoutes = new Hono();

// List all documents (for dashboard)
documentsRoutes.get('/', async (c) => {
  const result = await db
    .select()
    .from(documents)
    .where(eq(documents.isArchived, false))
    .orderBy(desc(documents.createdAt));

  return c.json({
    success: true,
    data: result,
  });
});

// Direct file upload (multipart form)
documentsRoutes.post('/', async (c) => {
  const formData = await c.req.formData();

  const file = formData.get('file') as File | null;
  const name = formData.get('name') as string | null;
  const type = (formData.get('type') as string | null) || 'other';
  const description = formData.get('description') as string | null;
  const organizationId = formData.get('organizationId') as string | null;
  const projectId = formData.get('projectId') as string | null;

  if (!file) {
    throw new ValidationError('File is required');
  }

  if (!name) {
    throw new ValidationError('Name is required');
  }

  // Use a default organization ID if not provided (for demo purposes)
  const orgId = organizationId || '00000000-0000-0000-0000-000000000000';

  // Generate storage key
  const storageKey = storage.generateKey(orgId, projectId || null, file.name);

  // Convert file to buffer and upload
  const buffer = Buffer.from(await file.arrayBuffer());
  await storage.upload(storageKey, buffer, file.type);

  // Create document record
  const result = await db
    .insert(documents)
    .values({
      organizationId: orgId,
      projectId: projectId || null,
      type: type as 'contract' | 'sow' | 'invoice' | 'proposal' | 'deliverable' | 'other',
      name,
      description: description || null,
      storageKey,
      mimeType: file.type,
      fileSize: file.size,
      version: 1,
    })
    .returning();

  return c.json({
    success: true,
    data: result[0],
  });
});

const uploadSchema = z.object({
  organizationId: z.string().uuid(),
  projectId: z.string().uuid().optional(),
  type: z.enum(['contract', 'sow', 'invoice', 'proposal', 'deliverable', 'other']),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  filename: z.string(),
  mimeType: z.string(),
  fileSize: z.number().int().positive(),
});

// Get upload URL
documentsRoutes.post('/upload', async (c) => {
  const body = await c.req.json();
  const parsed = uploadSchema.safeParse(body);

  if (!parsed.success) {
    throw new ValidationError('Invalid upload data', parsed.error.flatten().fieldErrors);
  }

  const {
    organizationId,
    projectId,
    type,
    name,
    description,
    filename,
    mimeType,
    fileSize,
  } = parsed.data;

  // Generate storage key
  const storageKey = storage.generateKey(organizationId, projectId || null, filename);

  // Get signed upload URL
  const uploadUrl = await storage.getSignedUploadUrl(storageKey, mimeType);

  // Create document record
  const result = await db
    .insert(documents)
    .values({
      organizationId,
      projectId,
      type,
      name,
      description,
      storageKey,
      mimeType,
      fileSize,
      version: 1,
    })
    .returning();

  return c.json({
    success: true,
    data: {
      document: result[0],
      uploadUrl,
      storageKey,
    },
  });
});

// Get document
documentsRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');

  const result = await db.select().from(documents).where(eq(documents.id, id)).limit(1);

  if (result.length === 0) {
    throw new NotFoundError('Document not found');
  }

  return c.json({
    success: true,
    data: result[0],
  });
});

// Get download URL
documentsRoutes.get('/:id/download', async (c) => {
  const id = c.req.param('id');

  const result = await db.select().from(documents).where(eq(documents.id, id)).limit(1);

  if (result.length === 0) {
    throw new NotFoundError('Document not found');
  }

  const downloadUrl = await storage.getSignedDownloadUrl(result[0].storageKey);

  return c.json({
    success: true,
    data: {
      downloadUrl,
      filename: result[0].name,
      mimeType: result[0].mimeType,
    },
  });
});

// List documents for project
documentsRoutes.get('/project/:projectId', async (c) => {
  const projectId = c.req.param('projectId');

  const result = await db
    .select()
    .from(documents)
    .where(and(eq(documents.projectId, projectId), eq(documents.isArchived, false)))
    .orderBy(desc(documents.createdAt));

  return c.json({
    success: true,
    data: result,
  });
});

// Delete document
documentsRoutes.delete('/:id', async (c) => {
  const id = c.req.param('id');

  const result = await db.select().from(documents).where(eq(documents.id, id)).limit(1);

  if (result.length === 0) {
    throw new NotFoundError('Document not found');
  }

  // Archive instead of hard delete
  await db
    .update(documents)
    .set({
      isArchived: true,
      updatedAt: new Date(),
    })
    .where(eq(documents.id, id));

  return c.json({
    success: true,
    message: 'Document archived',
  });
});

// Get document versions
documentsRoutes.get('/:id/versions', async (c) => {
  const id = c.req.param('id');

  const result = await db
    .select()
    .from(documentVersions)
    .where(eq(documentVersions.documentId, id))
    .orderBy(desc(documentVersions.version));

  return c.json({
    success: true,
    data: result,
  });
});

// Generate contract from template
documentsRoutes.post('/contract/generate', async (c) => {
  const body = await c.req.json();
  const { templateId, organizationId, projectId, variables } = body;

  // In production, render template with variables
  // For now, return placeholder

  const storageKey = storage.generateKey(
    organizationId,
    projectId,
    `contract-${templateId}.pdf`
  );

  const result = await db
    .insert(documents)
    .values({
      organizationId,
      projectId,
      type: 'contract',
      name: `Contract - ${templateId}`,
      storageKey,
      templateId,
      generatedFrom: variables,
      version: 1,
    })
    .returning();

  return c.json({
    success: true,
    data: result[0],
  });
});

export { documentsRoutes };
