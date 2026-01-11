import { Inngest } from 'inngest';

export const inngest = new Inngest({
  id: 'tenxdev',
  eventKey: process.env.INNGEST_EVENT_KEY,
});

// Event types
export type Events = {
  'cloud/transfer.initiated': {
    data: {
      accountId: string;
      transferId: string;
      projectId: string;
    };
  };
  'terraform/plan.requested': {
    data: {
      accountId: string;
      template: 'full-stack' | 'api-only' | 'frontend-only';
      variables: Record<string, string>;
    };
  };
  'terraform/apply.requested': {
    data: {
      accountId: string;
      planFile?: string;
    };
  };
  'terraform/destroy.requested': {
    data: {
      accountId: string;
      confirmed: boolean;
    };
  };
  'project/milestone.completed': {
    data: {
      milestoneId: string;
      projectId: string;
    };
  };
  'billing/invoice.created': {
    data: {
      invoiceId: string;
      projectId: string;
    };
  };
  'billing/payment.received': {
    data: {
      paymentId: string;
      invoiceId: string;
      projectId: string;
    };
  };
};
