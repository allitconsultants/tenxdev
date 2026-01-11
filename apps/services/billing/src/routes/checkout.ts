import { Hono } from 'hono';
import { z } from 'zod';
import { stripe } from '../lib/stripe';
import { db, organizations, eq } from '@tenxdev/database';
import { ValidationError, NotFoundError } from '@tenxdev/service-utils';

const checkoutRoutes = new Hono();

const createCheckoutSchema = z.object({
  organizationId: z.string().uuid(),
  priceId: z.string().optional(),
  mode: z.enum(['payment', 'subscription']).default('payment'),
  lineItems: z
    .array(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        amount: z.number().int().positive(),
        quantity: z.number().int().positive().default(1),
      })
    )
    .optional(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
  metadata: z.record(z.string()).optional(),
});

// Create checkout session
checkoutRoutes.post('/', async (c) => {
  const body = await c.req.json();
  const parsed = createCheckoutSchema.safeParse(body);

  if (!parsed.success) {
    throw new ValidationError('Invalid checkout data', parsed.error.flatten().fieldErrors);
  }

  const { organizationId, priceId, mode, lineItems, successUrl, cancelUrl, metadata } =
    parsed.data;

  // Get organization
  const org = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  if (org.length === 0) {
    throw new NotFoundError('Organization not found');
  }

  // Get or create Stripe customer
  let customerId = org[0].stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      name: org[0].name,
      metadata: {
        organizationId: org[0].id,
      },
    });

    customerId = customer.id;

    // Save customer ID
    await db
      .update(organizations)
      .set({ stripeCustomerId: customerId })
      .where(eq(organizations.id, organizationId));
  }

  // Build line items
  const stripeLineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

  if (priceId) {
    stripeLineItems.push({
      price: priceId,
      quantity: 1,
    });
  } else if (lineItems) {
    for (const item of lineItems) {
      stripeLineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.name,
            description: item.description,
          },
          unit_amount: item.amount,
        },
        quantity: item.quantity,
      });
    }
  }

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode,
    line_items: stripeLineItems,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      organizationId,
      ...metadata,
    },
    payment_intent_data:
      mode === 'payment'
        ? {
            metadata: {
              organizationId,
              ...metadata,
            },
          }
        : undefined,
    subscription_data:
      mode === 'subscription'
        ? {
            metadata: {
              organizationId,
              ...metadata,
            },
          }
        : undefined,
  });

  return c.json({
    success: true,
    data: {
      sessionId: session.id,
      url: session.url,
    },
  });
});

export { checkoutRoutes };
