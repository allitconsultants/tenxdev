import { DefaultAzureCredential } from '@azure/identity';
import { SubscriptionClient } from '@azure/arm-subscriptions';
import { ResourceManagementClient } from '@azure/arm-resources';
import { CostManagementClient } from '@azure/arm-costmanagement';
import type {
  CloudProvider,
  CloudAccountInfo,
  CloudResource,
  CloudCosts,
  TransferChecklist,
} from './base.js';
import { logger } from '@tenxdev/service-utils';

const AZURE_TENANT_ID = process.env.AZURE_TENANT_ID;
const AZURE_BILLING_ACCOUNT_ID = process.env.AZURE_BILLING_ACCOUNT_ID;
const AZURE_ENROLLMENT_ACCOUNT_ID = process.env.AZURE_ENROLLMENT_ACCOUNT_ID;
const AZURE_MANAGEMENT_GROUP = process.env.AZURE_CLIENT_MANAGEMENT_GROUP || 'tenxdev-clients';
const AZURE_TENXDEV_SERVICE_PRINCIPAL = process.env.AZURE_TENXDEV_SERVICE_PRINCIPAL_ID;
const AZURE_REGION = process.env.AZURE_REGION || 'eastus';

export class AzureProvider implements CloudProvider {
  name = 'azure';

  private credential: DefaultAzureCredential;
  private subscriptions: SubscriptionClient;

  constructor() {
    // Uses DefaultAzureCredential (environment variables, managed identity, etc.)
    this.credential = new DefaultAzureCredential();
    this.subscriptions = new SubscriptionClient(this.credential);
  }

  async createAccount(name: string, email: string): Promise<CloudAccountInfo> {
    logger.info({ name, email }, 'Creating Azure subscription');

    // Note: Creating subscriptions programmatically requires:
    // - Enterprise Agreement (EA) or Microsoft Customer Agreement (MCA)
    // - Enrollment account access
    // This is a simplified implementation - production would use Azure Billing API

    if (!AZURE_BILLING_ACCOUNT_ID || !AZURE_ENROLLMENT_ACCOUNT_ID) {
      throw new Error('Azure billing account and enrollment account must be configured');
    }

    // Generate a unique subscription alias
    const sanitizedName = name.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 20);
    const subscriptionAlias = `tenxdev-${sanitizedName}-${Date.now().toString(36)}`;

    // In production, use Azure Billing API to create subscription:
    // POST https://management.azure.com/providers/Microsoft.Billing/billingAccounts/{billingAccountId}/enrollmentAccounts/{enrollmentAccountId}/providers/Microsoft.Subscription/createSubscription?api-version=2019-10-01-preview

    logger.info({
      subscriptionAlias,
      billingAccountId: AZURE_BILLING_ACCOUNT_ID,
      enrollmentAccountId: AZURE_ENROLLMENT_ACCOUNT_ID,
    }, 'Azure subscription creation requires EA/MCA - returning placeholder');

    // For now, return a placeholder - actual implementation would wait for subscription creation
    return {
      id: subscriptionAlias,
      name: name,
      status: 'pending',
      region: AZURE_REGION,
    };
  }

  async getAccount(id: string): Promise<CloudAccountInfo> {
    const subscription = await this.subscriptions.subscriptions.get(id);

    if (!subscription) {
      throw new Error('Azure subscription not found');
    }

    // Map Azure state to generic status
    let status = 'active';
    if (subscription.state === 'Disabled' || subscription.state === 'Deleted') {
      status = 'suspended';
    } else if (subscription.state === 'Warned') {
      status = 'warning';
    }

    return {
      id: subscription.subscriptionId!,
      name: subscription.displayName || subscription.subscriptionId!,
      status,
      region: AZURE_REGION,
    };
  }

  async deleteAccount(id: string): Promise<void> {
    // Azure subscriptions can be cancelled but require support ticket for full deletion
    logger.info({ subscriptionId: id }, 'Requesting Azure subscription cancellation');

    // In production, use Subscription API to cancel:
    // POST https://management.azure.com/subscriptions/{subscriptionId}/providers/Microsoft.Subscription/cancel?api-version=2021-10-01

    logger.warn({ subscriptionId: id }, 'Azure subscription cancellation requires manual process or API call');
  }

  async listResources(accountId: string): Promise<CloudResource[]> {
    const resources: CloudResource[] = [];

    try {
      const resourceClient = new ResourceManagementClient(this.credential, accountId);

      // List all resources in the subscription
      for await (const resource of resourceClient.resources.list()) {
        resources.push({
          id: resource.id || '',
          type: resource.type || 'Unknown',
          name: resource.name || '',
          region: resource.location || AZURE_REGION,
          status: resource.provisioningState || 'Unknown',
          monthlyCostEstimate: undefined,
        });
      }
    } catch (error) {
      logger.error({ error, accountId }, 'Failed to list Azure resources');
    }

    return resources;
  }

  async syncResources(accountId: string): Promise<CloudResource[]> {
    return this.listResources(accountId);
  }

  async getCosts(
    accountId: string,
    startDate: Date,
    endDate: Date
  ): Promise<CloudCosts> {
    const breakdown: Record<string, number> = {};
    let totalCost = 0;

    try {
      const costClient = new CostManagementClient(this.credential);

      // Query cost management for the subscription
      const scope = `subscriptions/${accountId}`;
      const result = await costClient.query.usage(scope, {
        type: 'ActualCost',
        timeframe: 'Custom',
        timePeriod: {
          from: startDate,
          to: endDate,
        },
        dataset: {
          granularity: 'None',
          aggregation: {
            totalCost: {
              name: 'Cost',
              function: 'Sum',
            },
          },
          grouping: [
            {
              type: 'Dimension',
              name: 'ServiceName',
            },
          ],
        },
      });

      // Process results
      if (result.rows) {
        for (const row of result.rows) {
          const cost = row[0] as number;
          const serviceName = row[1] as string;
          breakdown[serviceName] = cost;
          totalCost += cost;
        }
      }
    } catch (error) {
      logger.error({ error, accountId }, 'Failed to get Azure costs');
    }

    return {
      periodStart: startDate,
      periodEnd: endDate,
      totalCost,
      currency: 'USD',
      breakdown,
    };
  }

  async getCostForecast(accountId: string): Promise<CloudCosts> {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);

    let forecastedCost = 0;

    try {
      const costClient = new CostManagementClient(this.credential);
      const scope = `subscriptions/${accountId}`;

      // Azure Cost Management provides native forecasting
      const result = await costClient.forecast.usage(scope, {
        type: 'ActualCost',
        timeframe: 'Custom',
        timePeriod: {
          from: startDate,
          to: endDate,
        },
        dataset: {
          granularity: 'Monthly',
          aggregation: {
            totalCost: {
              name: 'Cost',
              function: 'Sum',
            },
          },
        },
      });

      if (result.rows && result.rows.length > 0) {
        forecastedCost = result.rows[0][0] as number;
      }
    } catch (error) {
      logger.error({ error, accountId }, 'Failed to get Azure cost forecast');

      // Fallback to historical average
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const historicalCosts = await this.getCosts(accountId, thirtyDaysAgo, new Date());
      forecastedCost = historicalCosts.totalCost; // Last 30 days as forecast
    }

    return {
      periodStart: startDate,
      periodEnd: endDate,
      totalCost: forecastedCost,
      currency: 'USD',
      breakdown: {},
    };
  }

  getTransferChecklist(_accountId: string): TransferChecklist {
    return {
      items: [
        {
          id: 'remove-service-principal',
          name: 'Remove tenxdev service principal',
          description: 'Remove tenxdev service principal access from the subscription',
          completed: false,
        },
        {
          id: 'revoke-role-assignments',
          name: 'Revoke tenxdev role assignments',
          description: 'Remove all Azure RBAC role assignments for tenxdev',
          completed: false,
        },
        {
          id: 'rotate-secrets',
          name: 'Rotate all secrets',
          description: 'Rotate credentials in Key Vault',
          completed: false,
        },
        {
          id: 'transfer-billing',
          name: 'Transfer billing ownership',
          description: 'Transfer subscription billing to client billing account',
          completed: false,
        },
        {
          id: 'move-subscription',
          name: 'Move to client management group',
          description: 'Transfer subscription to client Azure tenant or management group',
          completed: false,
        },
        {
          id: 'update-policies',
          name: 'Remove Azure policies',
          description: 'Remove tenxdev Azure Policy assignments',
          completed: false,
        },
        {
          id: 'verify-access',
          name: 'Verify client access',
          description: 'Confirm client can access subscription',
          completed: false,
        },
      ],
    };
  }

  async executeTransferStep(accountId: string, stepId: string): Promise<void> {
    logger.info({ accountId, stepId }, 'Executing Azure transfer step');

    switch (stepId) {
      case 'remove-service-principal':
        await this.removeServicePrincipalAccess(accountId);
        break;
      case 'revoke-role-assignments':
        logger.info({ accountId }, 'Revoking tenxdev role assignments');
        // Implementation: remove role assignments for tenxdev principals
        break;
      case 'transfer-billing':
        logger.info({ accountId }, 'Transferring billing ownership');
        // Requires Azure Billing API and customer's billing account
        break;
      default:
        logger.warn({ stepId }, 'Unknown Azure transfer step');
    }
  }

  async verifyTransfer(accountId: string): Promise<boolean> {
    try {
      await this.getAccount(accountId);
      return false; // Still have access
    } catch {
      return true; // Access removed
    }
  }

  async completeTransfer(accountId: string, targetTenantId: string): Promise<void> {
    logger.info({ accountId, targetTenantId }, 'Completing Azure subscription transfer');

    // Moving subscriptions between tenants is complex and often requires:
    // 1. Target tenant to accept the transfer
    // 2. Billing ownership transfer
    // 3. Manual process via Azure Portal or support

    if (targetTenantId) {
      logger.info({
        accountId,
        targetTenantId,
        currentTenant: AZURE_TENANT_ID,
      }, 'Azure subscription transfer requires manual process or Azure Billing API');
    }
  }

  private async removeServicePrincipalAccess(accountId: string): Promise<void> {
    if (!AZURE_TENXDEV_SERVICE_PRINCIPAL) {
      logger.warn('AZURE_TENXDEV_SERVICE_PRINCIPAL_ID not configured');
      return;
    }

    logger.info({
      accountId,
      servicePrincipalId: AZURE_TENXDEV_SERVICE_PRINCIPAL,
    }, 'Removing tenxdev service principal access');

    // In production, use Azure RBAC API to remove role assignments:
    // DELETE https://management.azure.com/subscriptions/{subscriptionId}/providers/Microsoft.Authorization/roleAssignments/{roleAssignmentId}?api-version=2022-04-01
  }
}

export const azureProvider = new AzureProvider();
