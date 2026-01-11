import { apiClient } from './client';

export interface Invoice {
  id: string;
  organizationId: string;
  projectId?: string | null;
  milestoneId?: string | null;
  stripeInvoiceId?: string | null;
  number?: string | null;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  subtotal: string;
  tax: string;
  total: string;
  amountPaid: string;
  currency: string;
  lineItems: Array<{
    description: string;
    amount: number;
    quantity: number;
  }>;
  dueDate?: string | null;
  sentAt?: string | null;
  paidAt?: string | null;
  hostedInvoiceUrl?: string | null;
  pdfUrl?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  id: string;
  organizationId: string;
  projectId?: string | null;
  stripeSubscriptionId?: string | null;
  stripePriceId?: string | null;
  plan: 'starter' | 'growth' | 'enterprise';
  status: 'active' | 'past_due' | 'cancelled';
  amount: string;
  currency: string;
  interval: 'month' | 'year';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Get all invoices for the authenticated user's organization
 */
export async function getInvoices() {
  return apiClient<Invoice[]>('billing', '/billing/invoices');
}

/**
 * Get a single invoice by ID
 */
export async function getInvoice(id: string) {
  return apiClient<Invoice>('billing', `/billing/invoices/${id}`);
}

/**
 * Get all subscriptions for the authenticated user's organization
 */
export async function getSubscriptions() {
  return apiClient<Subscription[]>('billing', '/billing/subscriptions');
}

/**
 * Get a single subscription by ID
 */
export async function getSubscription(id: string) {
  return apiClient<Subscription>('billing', `/billing/subscriptions/${id}`);
}

/**
 * Get payment URL for an invoice
 */
export async function getInvoicePaymentUrl(id: string) {
  return apiClient<{ paymentUrl: string }>('billing', `/billing/invoices/${id}/pay`, {
    method: 'POST',
  });
}
