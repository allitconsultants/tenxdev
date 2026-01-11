import { Hono } from 'hono';
import { z } from 'zod';
import { stripe } from '../lib/stripe';
import { db, subscriptions, organizations, eq, desc } from '@tenxdev/database';
import { ValidationError, NotFoundError } from '@tenxdev/service-utils';

const subscriptionsRoutes = new Hono();

const createSubscriptionSchema = z.object({
  organizationId: z.string().uuid(),
  projectId: z.string().uuid().optional(),
  priceId: z.string(),
  plan: z.enum(['starter', 'growth', 'enterprise']),
});

// List subscriptions
subscriptionsRoutes.get('/', async (c) => {
  const organizationId = c.req.query('organizationId');

  let query = db.select().from(subscriptions);

  if (organizationId) {
    query = query.where(eq(subscriptions.organizationId, organizationId)) as typeof query;
  }

  const result = await query.orderBy(desc(subscriptions.createdAt));

  return c.json({
    success: true,
    data: result,
  });
});

// Get subscription
subscriptionsRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');

  const result = await db.select().from(subscriptions).where(eq(subscriptions.id, id)).limit(1);

  if (result.length === 0) {
    throw new NotFoundError('Subscription not found');
  }

  return c.json({
    success: true,
    data: result[0],
  });
});

// Create subscription
subscriptionsRoutes.post('/', async (c) => {
  const body = await c.req.json();
  const parsed = createSubscriptionSchema.safeParse(body);

  if (!parsed.success) {
    throw new ValidationError('Invalid subscription data', parsed.error.flatten().fieldErrors);
  }

  const { organizationId, projectId, priceId, plan } = parsed.data;

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

  // Create Stripe subscription
  const stripeSubscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    metadata: {
      organizationId,
      projectId: projectId || '',
      plan,
    },
    payment_behavior: 'default_incomplete',
    expand: ['latest_invoice.payment_intent'],
  });

  // Get price details
  const price = await stripe.prices.retrieve(priceId);

  // Save to database
  const result = await db
    .insert(subscriptions)
    .values({
      organizationId,
      projectId,
      stripeSubscriptionId: stripeSubscription.id,
      stripePriceId: priceId,
      plan,
      status: 'active',
      amount: ((price.unit_amount || 0) / 100).toFixed(2),
      interval: price.recurring?.interval || 'month',
      currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
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

// Cancel subscription
subscriptionsRoutes.delete('/:id', async (c) => {
  const id = c.req.param('id');

  const subscription = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.id, id))
    .limit(1);

  if (subscription.length === 0) {
    throw new NotFoundError('Subscription not found');
  }

  if (!subscription[0].stripeSubscriptionId) {
    throw new ValidationError('Subscription has no Stripe ID');
  }

  // Cancel at period end
  await stripe.subscriptions.update(subscription[0].stripeSubscriptionId, {
    cancel_at_period_end: true,
  });

  // Update database
  await db
    .update(subscriptions)
    .set({
      cancelAtPeriodEnd: true,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, id));

  return c.json({
    success: true,
    message: 'Subscription will be cancelled at the end of the billing period',
  });
});

export { subscriptionsRoutes };
