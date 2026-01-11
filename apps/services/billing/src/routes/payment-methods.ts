import { Hono } from 'hono';
import { stripe } from '../lib/stripe';
import { db, paymentMethods, organizations, eq } from '@tenxdev/database';
import { NotFoundError } from '@tenxdev/service-utils';

const paymentMethodsRoutes = new Hono();

// List payment methods
paymentMethodsRoutes.get('/', async (c) => {
  const organizationId = c.req.query('organizationId');

  if (!organizationId) {
    return c.json({
      success: true,
      data: [],
    });
  }

  const result = await db
    .select()
    .from(paymentMethods)
    .where(eq(paymentMethods.organizationId, organizationId));

  return c.json({
    success: true,
    data: result,
  });
});

// Create setup intent for adding payment method
paymentMethodsRoutes.post('/setup-intent', async (c) => {
  const body = await c.req.json();
  const { organizationId } = body;

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

  // Create setup intent
  const setupIntent = await stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ['card'],
    metadata: { organizationId },
  });

  return c.json({
    success: true,
    data: {
      clientSecret: setupIntent.client_secret,
    },
  });
});

// Delete payment method
paymentMethodsRoutes.delete('/:id', async (c) => {
  const id = c.req.param('id');

  const pm = await db.select().from(paymentMethods).where(eq(paymentMethods.id, id)).limit(1);

  if (pm.length === 0) {
    throw new NotFoundError('Payment method not found');
  }

  // Detach from Stripe
  await stripe.paymentMethods.detach(pm[0].stripePaymentMethodId);

  // Delete from database
  await db.delete(paymentMethods).where(eq(paymentMethods.id, id));

  return c.json({
    success: true,
    message: 'Payment method deleted successfully',
  });
});

// Set default payment method
paymentMethodsRoutes.post('/:id/set-default', async (c) => {
  const id = c.req.param('id');

  const pm = await db.select().from(paymentMethods).where(eq(paymentMethods.id, id)).limit(1);

  if (pm.length === 0) {
    throw new NotFoundError('Payment method not found');
  }

  // Remove default from all others
  await db
    .update(paymentMethods)
    .set({ isDefault: false })
    .where(eq(paymentMethods.organizationId, pm[0].organizationId));

  // Set this one as default
  await db.update(paymentMethods).set({ isDefault: true }).where(eq(paymentMethods.id, id));

  // Update Stripe customer default
  const org = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, pm[0].organizationId))
    .limit(1);

  if (org[0].stripeCustomerId) {
    await stripe.customers.update(org[0].stripeCustomerId, {
      invoice_settings: {
        default_payment_method: pm[0].stripePaymentMethodId,
      },
    });
  }

  return c.json({
    success: true,
    message: 'Default payment method updated',
  });
});

export { paymentMethodsRoutes };
