import { inngest } from '../inngest.js';
import { db, invoices, projects, eq, lt, and } from '@tenxdev/database';
import { logger } from '@tenxdev/service-utils';

// Check for overdue invoices daily
export const checkOverdueInvoices = inngest.createFunction(
  { id: 'check-overdue-invoices', name: 'Check Overdue Invoices' },
  { cron: '0 9 * * *' }, // 9 AM daily
  async ({ step }) => {
    const overdueInvoices = await step.run('find-overdue-invoices', async () => {
      const now = new Date();
      return db
        .select()
        .from(invoices)
        .where(
          and(
            eq(invoices.status, 'sent'),
            lt(invoices.dueDate, now)
          )
        );
    });

    logger.info({ count: overdueInvoices.length }, 'Found overdue invoices');

    // Update status for each overdue invoice
    for (const invoice of overdueInvoices) {
      await step.run(`update-status-${invoice.id}`, async () => {
        await db
          .update(invoices)
          .set({ status: 'overdue', updatedAt: new Date() })
          .where(eq(invoices.id, invoice.id));
      });
    }

    return { processed: overdueInvoices.length };
  }
);

// Send invoice reminders 3 days before due date
export const sendInvoiceReminders = inngest.createFunction(
  { id: 'send-invoice-reminders', name: 'Send Invoice Reminders' },
  { cron: '0 10 * * *' }, // 10 AM daily
  async ({ step }) => {
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcomingInvoices = await step.run('find-upcoming-invoices', async () => {
      return db
        .select()
        .from(invoices)
        .where(eq(invoices.status, 'sent'));
    });

    // Filter to invoices due in ~3 days
    const dueSoon = upcomingInvoices.filter((inv) => {
      if (!inv.dueDate) return false;
      const dueDate = new Date(inv.dueDate);
      const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays >= 2 && diffDays <= 4;
    });

    logger.info({ count: dueSoon.length }, 'Found invoices due soon');

    // Just log the count for now - notifications can be sent via a service call
    logger.info({ invoiceIds: dueSoon.map((i) => i.id) }, 'Invoices due soon');

    return { processed: dueSoon.length };
  }
);
