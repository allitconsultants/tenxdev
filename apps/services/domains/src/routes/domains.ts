import { Hono } from 'hono';
import { z } from 'zod';
import { db, domains, eq, desc } from '@tenxdev/database';
import { cloudflare } from '../lib/cloudflare';
import { NotFoundError, ValidationError } from '@tenxdev/service-utils';

const domainsRoutes = new Hono();

const registerDomainSchema = z.object({
  organizationId: z.string().uuid(),
  projectId: z.string().uuid().optional(),
  domainName: z.string().min(3).max(255),
  registrantContact: z.object({
    first_name: z.string(),
    last_name: z.string(),
    email: z.string().email(),
    phone: z.string(),
    address: z.string(),
    city: z.string(),
    state: z.string(),
    zip: z.string(),
    country: z.string(),
    organization: z.string().optional(),
  }),
});

// Search domains
domainsRoutes.get('/search', async (c) => {
  const query = c.req.query('query');

  if (!query || query.length < 3) {
    return c.json({
      success: true,
      data: [],
    });
  }

  // Check availability
  const availability = await cloudflare.checkAvailability(query);

  // Also check popular TLDs
  const tlds = ['.com', '.io', '.dev', '.ai', '.co'];
  const baseName = query.replace(/\.[^.]+$/, '');

  const results = await Promise.all(
    tlds.map(async (tld) => {
      const domain = baseName + tld;
      if (domain === query) return null;

      try {
        return await cloudflare.checkAvailability(domain);
      } catch {
        return null;
      }
    })
  );

  return c.json({
    success: true,
    data: [availability, ...results.filter(Boolean)],
  });
});

// List domains
domainsRoutes.get('/', async (c) => {
  const organizationId = c.req.query('organizationId');

  let query = db.select().from(domains);

  if (organizationId) {
    query = query.where(eq(domains.organizationId, organizationId)) as typeof query;
  }

  const result = await query.orderBy(desc(domains.createdAt));

  return c.json({
    success: true,
    data: result,
  });
});

// Get domain
domainsRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');

  const result = await db.select().from(domains).where(eq(domains.id, id)).limit(1);

  if (result.length === 0) {
    throw new NotFoundError('Domain not found');
  }

  return c.json({
    success: true,
    data: result[0],
  });
});

// Register domain
domainsRoutes.post('/register', async (c) => {
  const body = await c.req.json();
  const parsed = registerDomainSchema.safeParse(body);

  if (!parsed.success) {
    throw new ValidationError('Invalid domain data', parsed.error.flatten().fieldErrors);
  }

  const { organizationId, projectId, domainName, registrantContact } = parsed.data;

  // Check availability
  const availability = await cloudflare.checkAvailability(domainName);

  if (!availability.available) {
    throw new ValidationError('Domain is not available');
  }

  // Register domain
  const domainInfo = await cloudflare.registerDomain(domainName, registrantContact);

  // Get or create zone
  let zoneId = await cloudflare.getZoneId(domainName);
  if (!zoneId) {
    const zone = await cloudflare.createZone(domainName);
    zoneId = zone.id;
  }

  // Extract TLD
  const tld = domainName.split('.').pop() || '';

  // Save to database
  const result = await db
    .insert(domains)
    .values({
      organizationId,
      projectId,
      domainName,
      tld,
      status: 'active',
      cloudflareZoneId: zoneId,
      cloudflareRegistrarId: domainInfo.id,
      registeredAt: new Date(),
      expiresAt: new Date(domainInfo.expires_at),
      autoRenew: domainInfo.auto_renew,
      registrantContact,
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

// Configure domain for project
domainsRoutes.post('/:id/configure/:projectId', async (c) => {
  const domainId = c.req.param('id');
  const projectId = c.req.param('projectId');
  const body = await c.req.json();
  const { targetIp, targetCname } = body;

  const domain = await db.select().from(domains).where(eq(domains.id, domainId)).limit(1);

  if (domain.length === 0) {
    throw new NotFoundError('Domain not found');
  }

  if (!domain[0].cloudflareZoneId) {
    throw new ValidationError('Domain has no Cloudflare zone');
  }

  // Create DNS records for project
  const records = [];

  if (targetIp) {
    // A record for root
    const rootRecord = await cloudflare.createDnsRecord(domain[0].cloudflareZoneId, {
      type: 'A',
      name: '@',
      content: targetIp,
      proxied: true,
    });
    records.push(rootRecord);

    // A record for www
    const wwwRecord = await cloudflare.createDnsRecord(domain[0].cloudflareZoneId, {
      type: 'A',
      name: 'www',
      content: targetIp,
      proxied: true,
    });
    records.push(wwwRecord);
  }

  if (targetCname) {
    // CNAME for root (flattened by Cloudflare)
    const rootRecord = await cloudflare.createDnsRecord(domain[0].cloudflareZoneId, {
      type: 'CNAME',
      name: '@',
      content: targetCname,
      proxied: true,
    });
    records.push(rootRecord);

    // CNAME for www
    const wwwRecord = await cloudflare.createDnsRecord(domain[0].cloudflareZoneId, {
      type: 'CNAME',
      name: 'www',
      content: targetCname,
      proxied: true,
    });
    records.push(wwwRecord);
  }

  // Update domain project association
  await db
    .update(domains)
    .set({
      projectId,
      updatedAt: new Date(),
    })
    .where(eq(domains.id, domainId));

  return c.json({
    success: true,
    data: {
      records,
    },
  });
});

// Renew domain
domainsRoutes.post('/:id/renew', async (c) => {
  const id = c.req.param('id');

  const domain = await db.select().from(domains).where(eq(domains.id, id)).limit(1);

  if (domain.length === 0) {
    throw new NotFoundError('Domain not found');
  }

  // Enable auto-renew in Cloudflare
  await cloudflare.setAutoRenew(domain[0].domainName, true);

  // Update database
  await db
    .update(domains)
    .set({
      autoRenew: true,
      updatedAt: new Date(),
    })
    .where(eq(domains.id, id));

  return c.json({
    success: true,
    message: 'Auto-renew enabled',
  });
});

// Delete domain (transfer out)
domainsRoutes.delete('/:id', async (c) => {
  const id = c.req.param('id');

  const domain = await db.select().from(domains).where(eq(domains.id, id)).limit(1);

  if (domain.length === 0) {
    throw new NotFoundError('Domain not found');
  }

  // Mark as transferring
  await db
    .update(domains)
    .set({
      status: 'transferring',
      updatedAt: new Date(),
    })
    .where(eq(domains.id, id));

  return c.json({
    success: true,
    message: 'Domain transfer initiated',
  });
});

export { domainsRoutes };
