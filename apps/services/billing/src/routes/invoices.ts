import { Hono } from 'hono';
import { z } from 'zod';
import { stripe } from '../lib/stripe';
import { db, invoices, organizations, milestones, eq, desc } from '@tenxdev/database';
import { ValidationError, NotFoundError } from '@tenxdev/service-utils';

const invoicesRoutes = new Hono();

const createInvoiceSchema = z.object({
  projectId: z.string().uuid().optional(),
  milestoneId: z.string().uuid().optional(),
  lineItems: z.array(
    z.object({
      description: z.string(),
      amount: z.number().positive(),
      quantity: z.number().int().positive().default(1),
    })
  ),
  dueDate: z.string().datetime().optional(),
  notes: z.string().optional(),
});

// List invoices
invoicesRoutes.get('/', async (c) => {
  const auth = c.get('auth');

  // Filter by authenticated user's organization
  const result = auth.organizationId
    ? await db
        .select()
        .from(invoices)
        .where(eq(invoices.organizationId, auth.organizationId))
        .orderBy(desc(invoices.createdAt))
    : [];

  return c.json({
    success: true,
    data: result,
  });
});

// Get invoice by ID
invoicesRoutes.get('/:id', async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');

  const result = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1);

  if (result.length === 0) {
    throw new NotFoundError('Invoice not found');
  }

  // Verify user has access to this invoice
  if (auth.organizationId && result[0].organizationId !== auth.organizationId) {
    throw new NotFoundError('Invoice not found');
  }

  return c.json({
    success: true,
    data: result[0],
  });
});

// Create invoice
invoicesRoutes.post('/', async (c) => {
  const auth = c.get('auth');
  const body = await c.req.json();
  const parsed = createInvoiceSchema.safeParse(body);

  if (!parsed.success) {
    throw new ValidationError('Invalid invoice data', parsed.error.flatten().fieldErrors);
  }

  if (!auth.organizationId) {
    throw new ValidationError('Organization membership required to create invoices');
  }

  const { projectId, milestoneId, lineItems, dueDate, notes } = parsed.data;
  const organizationId = auth.organizationId;

  // Get organization
  const org = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  if (org.length === 0) {
    throw new NotFoundError('Organization not found');
  }

  // Ensure Stripe customer exists
  let customerId = org[0].stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      name: org[0].name,
      metadata: { organizationId },
    });

    customerId = customer.id;

    await db
      .update(organizations)
      .set({ stripeCustomerId: customerId })
      .where(eq(organizations.id, organizationId));
  }

  // Create Stripe invoice
  const stripeInvoice = await stripe.invoices.create({
    customer: customerId,
    collection_method: 'send_invoice',
    days_until_due: dueDate ? undefined : 14,
    due_date: dueDate ? Math.floor(new Date(dueDate).getTime() / 1000) : undefined,
    metadata: {
      organizationId,
      projectId: projectId || '',
      milestoneId: milestoneId || '',
    },
  });

  // Add line items
  for (const item of lineItems) {
    await stripe.invoiceItems.create({
      customer: customerId,
      invoice: stripeInvoice.id,
      description: item.description,
      unit_amount: Math.round(item.amount * 100),
      quantity: item.quantity,
    });
  }

  // Finalize invoice
  const finalizedInvoice = await stripe.invoices.finalizeInvoice(stripeInvoice.id);

  // Calculate totals
  const subtotal = lineItems.reduce((sum, item) => sum + item.amount * item.quantity, 0);

  // Save to database
  const result = await db
    .insert(invoices)
    .values({
      organizationId,
      projectId,
      milestoneId,
      stripeInvoiceId: finalizedInvoice.id,
      number: finalizedInvoice.number || undefined,
      status: 'sent',
      subtotal: subtotal.toFixed(2),
      total: subtotal.toFixed(2),
      lineItems,
      dueDate: dueDate ? new Date(dueDate) : null,
      hostedInvoiceUrl: finalizedInvoice.hosted_invoice_url || undefined,
      pdfUrl: finalizedInvoice.invoice_pdf || undefined,
      notes,
      sentAt: new Date(),
    })
    .returning();

  // Update milestone if provided
  if (milestoneId) {
    await db
      .update(milestones)
      .set({
        stripeInvoiceId: finalizedInvoice.id,
        paymentStatus: 'invoiced',
        updatedAt: new Date(),
      })
      .where(eq(milestones.id, milestoneId));
  }

  return c.json(
    {
      success: true,
      data: result[0],
    },
    201
  );
});

// Send invoice
invoicesRoutes.post('/:id/send', async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');

  const invoice = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1);

  if (invoice.length === 0) {
    throw new NotFoundError('Invoice not found');
  }

  // Verify user has access to this invoice
  if (auth.organizationId && invoice[0].organizationId !== auth.organizationId) {
    throw new NotFoundError('Invoice not found');
  }

  if (!invoice[0].stripeInvoiceId) {
    throw new ValidationError('Invoice has no Stripe ID');
  }

  // Send via Stripe
  await stripe.invoices.sendInvoice(invoice[0].stripeInvoiceId);

  // Update status
  await db
    .update(invoices)
    .set({
      status: 'sent',
      sentAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(invoices.id, id));

  return c.json({
    success: true,
    message: 'Invoice sent successfully',
  });
});

// Pay invoice
invoicesRoutes.post('/:id/pay', async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');

  const invoice = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1);

  if (invoice.length === 0) {
    throw new NotFoundError('Invoice not found');
  }

  // Verify user has access to this invoice
  if (auth.organizationId && invoice[0].organizationId !== auth.organizationId) {
    throw new NotFoundError('Invoice not found');
  }

  if (!invoice[0].stripeInvoiceId) {
    throw new ValidationError('Invoice has no Stripe ID');
  }

  // Get Stripe invoice
  const stripeInvoice = await stripe.invoices.retrieve(invoice[0].stripeInvoiceId);

  return c.json({
    success: true,
    data: {
      paymentUrl: stripeInvoice.hosted_invoice_url,
    },
  });
});

export { invoicesRoutes };
