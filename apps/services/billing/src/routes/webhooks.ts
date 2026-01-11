import { Hono } from 'hono';
import { stripe } from '../lib/stripe';
import { db, invoices, subscriptions, paymentMethods, milestones, eq } from '@tenxdev/database';
import { logger } from '@tenxdev/service-utils';
import type Stripe from 'stripe';

const webhooksRoutes = new Hono();

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

// Stripe webhook handler
webhooksRoutes.post('/stripe', async (c) => {
  const body = await c.req.text();
  const signature = c.req.header('stripe-signature');

  if (!signature) {
    return c.json({ error: 'Missing signature' }, 400);
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    logger.error({ err }, 'Webhook signature verification failed');
    return c.json({ error: 'Invalid signature' }, 400);
  }

  logger.info({ eventType: event.type }, 'Received Stripe webhook');

  switch (event.type) {
    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice;
      await handleInvoicePaid(invoice);
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      await handleInvoicePaymentFailed(invoice);
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionUpdated(subscription);
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionDeleted(subscription);
      break;
    }

    case 'payment_method.attached': {
      const paymentMethod = event.data.object as Stripe.PaymentMethod;
      await handlePaymentMethodAttached(paymentMethod);
      break;
    }

    default:
      logger.info({ eventType: event.type }, 'Unhandled webhook event');
  }

  return c.json({ received: true });
});

async function handleInvoicePaid(stripeInvoice: Stripe.Invoice) {
  if (!stripeInvoice.id) return;

  // Update invoice status
  await db
    .update(invoices)
    .set({
      status: 'paid',
      amountPaid: ((stripeInvoice.amount_paid || 0) / 100).toFixed(2),
      paidAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(invoices.stripeInvoiceId, stripeInvoice.id));

  // Update milestone if linked
  const milestoneId = stripeInvoice.metadata?.milestoneId;
  if (milestoneId) {
    await db
      .update(milestones)
      .set({
        paymentStatus: 'paid',
        paidAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(milestones.id, milestoneId));
  }

  logger.info({ invoiceId: stripeInvoice.id }, 'Invoice marked as paid');
}

async function handleInvoicePaymentFailed(stripeInvoice: Stripe.Invoice) {
  if (!stripeInvoice.id) return;

  await db
    .update(invoices)
    .set({
      status: 'overdue',
      updatedAt: new Date(),
    })
    .where(eq(invoices.stripeInvoiceId, stripeInvoice.id));

  logger.info({ invoiceId: stripeInvoice.id }, 'Invoice payment failed');
}

async function handleSubscriptionUpdated(stripeSubscription: Stripe.Subscription) {
  const status = stripeSubscription.status === 'active' ? 'active' : 'past_due';

  await db
    .update(subscriptions)
    .set({
      status,
      currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.stripeSubscriptionId, stripeSubscription.id));

  logger.info({ subscriptionId: stripeSubscription.id }, 'Subscription updated');
}

async function handleSubscriptionDeleted(stripeSubscription: Stripe.Subscription) {
  await db
    .update(subscriptions)
    .set({
      status: 'cancelled',
      canceledAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.stripeSubscriptionId, stripeSubscription.id));

  logger.info({ subscriptionId: stripeSubscription.id }, 'Subscription cancelled');
}

async function handlePaymentMethodAttached(stripePaymentMethod: Stripe.PaymentMethod) {
  if (!stripePaymentMethod.customer || typeof stripePaymentMethod.customer !== 'string') return;

  const organizationId = stripePaymentMethod.metadata?.organizationId;
  if (!organizationId) return;

  const card = stripePaymentMethod.card;

  await db.insert(paymentMethods).values({
    organizationId,
    stripePaymentMethodId: stripePaymentMethod.id,
    type: stripePaymentMethod.type,
    cardBrand: card?.brand || null,
    cardLast4: card?.last4 || null,
    cardExpMonth: card?.exp_month?.toString() || null,
    cardExpYear: card?.exp_year?.toString() || null,
    isDefault: false,
  });

  logger.info({ paymentMethodId: stripePaymentMethod.id }, 'Payment method attached');
}

export { webhooksRoutes };
