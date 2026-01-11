import { Hono } from 'hono';
import { z } from 'zod';
import { db, domains, dnsRecords, eq } from '@tenxdev/database';
import { cloudflare } from '../lib/cloudflare';
import { NotFoundError, ValidationError } from '@tenxdev/service-utils';

const dnsRoutes = new Hono();

const createDnsRecordSchema = z.object({
  type: z.enum(['A', 'AAAA', 'CNAME', 'TXT', 'MX', 'NS', 'SRV']),
  name: z.string().min(1).max(255),
  content: z.string().min(1),
  ttl: z.number().int().min(1).optional(),
  proxied: z.boolean().optional(),
  priority: z.number().int().optional(),
});

const updateDnsRecordSchema = z.object({
  content: z.string().min(1).optional(),
  ttl: z.number().int().min(1).optional(),
  proxied: z.boolean().optional(),
});

// List DNS records
dnsRoutes.get('/:domainId/dns', async (c) => {
  const domainId = c.req.param('domainId');

  const domain = await db.select().from(domains).where(eq(domains.id, domainId)).limit(1);

  if (domain.length === 0) {
    throw new NotFoundError('Domain not found');
  }

  // Get from database
  const records = await db
    .select()
    .from(dnsRecords)
    .where(eq(dnsRecords.domainId, domainId));

  // Optionally sync with Cloudflare
  if (domain[0].cloudflareZoneId) {
    const cfRecords = await cloudflare.listDnsRecords(domain[0].cloudflareZoneId);

    return c.json({
      success: true,
      data: cfRecords,
    });
  }

  return c.json({
    success: true,
    data: records,
  });
});

// Create DNS record
dnsRoutes.post('/:domainId/dns', async (c) => {
  const domainId = c.req.param('domainId');
  const body = await c.req.json();
  const parsed = createDnsRecordSchema.safeParse(body);

  if (!parsed.success) {
    throw new ValidationError('Invalid DNS record data', parsed.error.flatten().fieldErrors);
  }

  const domain = await db.select().from(domains).where(eq(domains.id, domainId)).limit(1);

  if (domain.length === 0) {
    throw new NotFoundError('Domain not found');
  }

  if (!domain[0].cloudflareZoneId) {
    throw new ValidationError('Domain has no Cloudflare zone');
  }

  // Create in Cloudflare
  const cfRecord = await cloudflare.createDnsRecord(domain[0].cloudflareZoneId, {
    type: parsed.data.type,
    name: parsed.data.name,
    content: parsed.data.content,
    ttl: parsed.data.ttl,
    proxied: parsed.data.proxied,
    priority: parsed.data.priority,
  });

  // Save to database
  const result = await db
    .insert(dnsRecords)
    .values({
      domainId,
      cloudflareRecordId: cfRecord.id,
      type: cfRecord.type,
      name: cfRecord.name,
      content: cfRecord.content,
      ttl: cfRecord.ttl,
      proxied: cfRecord.proxied,
      priority: cfRecord.priority,
    })
    .returning();

  return c.json(
    {
      success: true,
      data: result[0],
    },
    201
  );
});

// Update DNS record
dnsRoutes.patch('/:domainId/dns/:recordId', async (c) => {
  const domainId = c.req.param('domainId');
  const recordId = c.req.param('recordId');
  const body = await c.req.json();
  const parsed = updateDnsRecordSchema.safeParse(body);

  if (!parsed.success) {
    throw new ValidationError('Invalid DNS record data', parsed.error.flatten().fieldErrors);
  }

  const domain = await db.select().from(domains).where(eq(domains.id, domainId)).limit(1);

  if (domain.length === 0) {
    throw new NotFoundError('Domain not found');
  }

  const record = await db
    .select()
    .from(dnsRecords)
    .where(eq(dnsRecords.id, recordId))
    .limit(1);

  if (record.length === 0) {
    throw new NotFoundError('DNS record not found');
  }

  if (!domain[0].cloudflareZoneId || !record[0].cloudflareRecordId) {
    throw new ValidationError('Record has no Cloudflare ID');
  }

  // Update in Cloudflare
  const cfRecord = await cloudflare.updateDnsRecord(
    domain[0].cloudflareZoneId,
    record[0].cloudflareRecordId,
    parsed.data
  );

  // Update database
  const result = await db
    .update(dnsRecords)
    .set({
      content: cfRecord.content,
      ttl: cfRecord.ttl,
      proxied: cfRecord.proxied,
      updatedAt: new Date(),
    })
    .where(eq(dnsRecords.id, recordId))
    .returning();

  return c.json({
    success: true,
    data: result[0],
  });
});

// Delete DNS record
dnsRoutes.delete('/:domainId/dns/:recordId', async (c) => {
  const domainId = c.req.param('domainId');
  const recordId = c.req.param('recordId');

  const domain = await db.select().from(domains).where(eq(domains.id, domainId)).limit(1);

  if (domain.length === 0) {
    throw new NotFoundError('Domain not found');
  }

  const record = await db
    .select()
    .from(dnsRecords)
    .where(eq(dnsRecords.id, recordId))
    .limit(1);

  if (record.length === 0) {
    throw new NotFoundError('DNS record not found');
  }

  if (domain[0].cloudflareZoneId && record[0].cloudflareRecordId) {
    // Delete from Cloudflare
    await cloudflare.deleteDnsRecord(
      domain[0].cloudflareZoneId,
      record[0].cloudflareRecordId
    );
  }

  // Delete from database
  await db.delete(dnsRecords).where(eq(dnsRecords.id, recordId));

  return c.json({
    success: true,
    message: 'DNS record deleted',
  });
});

export { dnsRoutes };
