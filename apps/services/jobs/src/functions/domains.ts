import { inngest } from '../inngest.js';
import { db, domains, projects, eq, lt, and } from '@tenxdev/database';
import { logger } from '@tenxdev/service-utils';

// Check for expiring domains daily
export const checkExpiringDomains = inngest.createFunction(
  { id: 'check-expiring-domains', name: 'Check Expiring Domains' },
  { cron: '0 8 * * *' }, // 8 AM daily
  async ({ step }) => {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const expiringDomains = await step.run('find-expiring-domains', async () => {
      return db
        .select()
        .from(domains)
        .where(
          and(
            eq(domains.status, 'active'),
            lt(domains.expiresAt, thirtyDaysFromNow)
          )
        );
    });

    logger.info({ count: expiringDomains.length }, 'Found expiring domains');

    // Log domains needing attention
    logger.info(
      { domainIds: expiringDomains.map((d) => d.id) },
      'Domains expiring soon'
    );

    return { processed: expiringDomains.length };
  }
);

// Auto-renew domains if enabled
export const autoRenewDomains = inngest.createFunction(
  { id: 'auto-renew-domains', name: 'Auto Renew Domains' },
  { cron: '0 6 * * *' }, // 6 AM daily
  async ({ step }) => {
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const domainsToRenew = await step.run('find-domains-to-renew', async () => {
      return db
        .select()
        .from(domains)
        .where(
          and(
            eq(domains.status, 'active'),
            eq(domains.autoRenew, true),
            lt(domains.expiresAt, sevenDaysFromNow)
          )
        );
    });

    logger.info({ count: domainsToRenew.length }, 'Found domains to auto-renew');

    // Log domains needing renewal
    logger.info(
      { domainIds: domainsToRenew.map((d) => d.id) },
      'Domains needing renewal'
    );

    return { processed: domainsToRenew.length };
  }
);
