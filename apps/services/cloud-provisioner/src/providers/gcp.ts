import { ProjectsClient } from '@google-cloud/resource-manager';
import { CloudBillingClient } from '@google-cloud/billing';
import { AssetServiceClient } from '@google-cloud/asset';
import type {
  CloudProvider,
  CloudAccountInfo,
  CloudResource,
  CloudCosts,
  TransferChecklist,
} from './base.js';
import { logger } from '@tenxdev/service-utils';

const GCP_REGION = process.env.GCP_REGION || 'us-central1';
const GCP_BILLING_ACCOUNT = process.env.GCP_BILLING_ACCOUNT_ID;
const GCP_FOLDER_ID = process.env.GCP_CLIENT_FOLDER_ID;
const GCP_ORG_ID = process.env.GCP_ORGANIZATION_ID;

export class GCPProvider implements CloudProvider {
  name = 'gcp';

  private projects: ProjectsClient;
  private billing: CloudBillingClient;
  private assets: AssetServiceClient;

  constructor() {
    // Uses Application Default Credentials (ADC) automatically
    this.projects = new ProjectsClient();
    this.billing = new CloudBillingClient();
    this.assets = new AssetServiceClient();
  }

  async createAccount(name: string, email: string): Promise<CloudAccountInfo> {
    logger.info({ name, email }, 'Creating GCP project');

    // Generate a unique project ID (max 30 chars, lowercase, numbers, hyphens)
    const sanitizedName = name.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 15);
    const projectId = `tenxdev-${sanitizedName}-${Date.now().toString(36)}`.slice(0, 30);

    // Determine parent (folder or organization)
    const parent = GCP_FOLDER_ID
      ? `folders/${GCP_FOLDER_ID}`
      : GCP_ORG_ID
      ? `organizations/${GCP_ORG_ID}`
      : undefined;

    if (!parent) {
      throw new Error('GCP_CLIENT_FOLDER_ID or GCP_ORGANIZATION_ID must be configured');
    }

    // Create project
    const [operation] = await this.projects.createProject({
      project: {
        projectId,
        displayName: name,
        parent,
        labels: {
          'managed-by': 'tenxdev',
          'contact-email': email.replace(/[@.]/g, '-'),
        },
      },
    });

    // Wait for operation to complete
    const [project] = await operation.promise();

    if (!project.projectId) {
      throw new Error('Failed to create GCP project');
    }

    // Link billing account
    if (GCP_BILLING_ACCOUNT) {
      try {
        await this.billing.updateProjectBillingInfo({
          name: `projects/${project.projectId}`,
          projectBillingInfo: {
            billingAccountName: `billingAccounts/${GCP_BILLING_ACCOUNT}`,
          },
        });
        logger.info({ projectId: project.projectId }, 'Linked billing account');
      } catch (error) {
        logger.error({ error, projectId: project.projectId }, 'Failed to link billing account');
      }
    }

    return {
      id: project.projectId,
      name: project.displayName || name,
      status: 'active',
      region: GCP_REGION,
    };
  }

  async getAccount(id: string): Promise<CloudAccountInfo> {
    const [project] = await this.projects.getProject({
      name: `projects/${id}`,
    });

    if (!project) {
      throw new Error('GCP project not found');
    }

    // Map GCP state to generic status
    let status = 'active';
    const projectState = String(project.state);
    if (projectState === 'DELETE_REQUESTED' || projectState === 'DELETE_IN_PROGRESS') {
      status = 'deleting';
    }

    return {
      id: project.projectId!,
      name: project.displayName || project.projectId!,
      status,
      region: GCP_REGION,
    };
  }

  async deleteAccount(id: string): Promise<void> {
    // GCP projects can be deleted programmatically (30-day recovery window)
    logger.info({ projectId: id }, 'Requesting GCP project deletion');

    await this.projects.deleteProject({
      name: `projects/${id}`,
    });

    logger.warn({ projectId: id }, 'GCP project marked for deletion (30-day recovery window)');
  }

  async listResources(accountId: string): Promise<CloudResource[]> {
    const resources: CloudResource[] = [];

    try {
      // Use Asset Inventory for comprehensive listing
      const request = {
        parent: `projects/${accountId}`,
        assetTypes: [
          'compute.googleapis.com/Instance',
          'storage.googleapis.com/Bucket',
          'sqladmin.googleapis.com/Instance',
          'container.googleapis.com/Cluster',
          'run.googleapis.com/Service',
          'cloudfunctions.googleapis.com/Function',
        ],
        contentType: 'RESOURCE' as const,
      };

      const [response] = await this.assets.listAssets(request);

      for (const asset of response || []) {
        const assetName = asset.name || '';
        const resourceType = asset.assetType?.split('/').pop() || 'Unknown';

        resources.push({
          id: assetName,
          type: resourceType,
          name: (asset.resource?.data as Record<string, unknown>)?.name as string || assetName.split('/').pop() || '',
          region: asset.resource?.location || GCP_REGION,
          status: (asset.resource?.data as Record<string, unknown>)?.status as string || 'RUNNING',
          monthlyCostEstimate: undefined,
        });
      }
    } catch (error) {
      logger.error({ error, accountId }, 'Failed to list GCP resources');
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
    // Note: GCP billing requires BigQuery export setup for detailed costs
    // This is a simplified implementation - production would query BigQuery

    const breakdown: Record<string, number> = {};
    let totalCost = 0;

    try {
      // Get billing info for the project
      const [billingInfo] = await this.billing.getProjectBillingInfo({
        name: `projects/${accountId}`,
      });

      if (billingInfo.billingEnabled && billingInfo.billingAccountName) {
        logger.info({
          projectId: accountId,
          billingAccount: billingInfo.billingAccountName,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        }, 'GCP billing is enabled - query BigQuery for detailed costs');

        // In production, query BigQuery billing export:
        // SELECT service.description, SUM(cost) as total
        // FROM `billing_dataset.gcp_billing_export`
        // WHERE project.id = @projectId
        //   AND usage_start_time >= @startDate
        //   AND usage_end_time <= @endDate
        // GROUP BY service.description
      }
    } catch (error) {
      logger.error({ error, accountId }, 'Failed to get GCP costs');
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

    // GCP doesn't have native forecasting API like AWS
    // Use historical average for simple forecast
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const historicalCosts = await this.getCosts(accountId, ninetyDaysAgo, new Date());
    const averageDailyCost = historicalCosts.totalCost / 90;
    const forecastedCost = averageDailyCost * 30; // 30-day forecast

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
          id: 'remove-service-accounts',
          name: 'Remove tenxdev service accounts',
          description: 'Delete service accounts created for tenxdev management',
          completed: false,
        },
        {
          id: 'revoke-iam-bindings',
          name: 'Revoke tenxdev IAM bindings',
          description: 'Remove all IAM roles granted to tenxdev',
          completed: false,
        },
        {
          id: 'rotate-secrets',
          name: 'Rotate all secrets',
          description: 'Rotate credentials in Secret Manager',
          completed: false,
        },
        {
          id: 'unlink-billing',
          name: 'Update billing account',
          description: 'Transfer billing to client billing account',
          completed: false,
        },
        {
          id: 'move-project',
          name: 'Move to client organization',
          description: 'Transfer project to client GCP organization',
          completed: false,
        },
        {
          id: 'update-org-policy',
          name: 'Remove org policies',
          description: 'Remove tenxdev organization policy constraints',
          completed: false,
        },
        {
          id: 'verify-access',
          name: 'Verify client access',
          description: 'Confirm client can access project',
          completed: false,
        },
      ],
    };
  }

  async executeTransferStep(accountId: string, stepId: string): Promise<void> {
    logger.info({ accountId, stepId }, 'Executing GCP transfer step');

    switch (stepId) {
      case 'unlink-billing':
        await this.unlinkBilling(accountId);
        break;
      case 'remove-service-accounts':
        logger.info({ accountId }, 'Removing tenxdev service accounts');
        // Implementation: delete service accounts with tenxdev prefix
        break;
      case 'revoke-iam-bindings':
        logger.info({ accountId }, 'Revoking tenxdev IAM bindings');
        // Implementation: remove IAM bindings for tenxdev principals
        break;
      default:
        logger.warn({ stepId }, 'Unknown GCP transfer step');
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

  async completeTransfer(accountId: string, targetOrgId: string): Promise<void> {
    logger.info({ accountId, targetOrgId }, 'Completing GCP project transfer');

    // Move project to target organization
    if (targetOrgId) {
      try {
        await this.projects.moveProject({
          name: `projects/${accountId}`,
          destinationParent: `organizations/${targetOrgId}`,
        });
        logger.info({ accountId, targetOrgId }, 'Project moved to target organization');
      } catch (error) {
        logger.error({ error, accountId, targetOrgId }, 'Failed to move project');
        throw error;
      }
    }
  }

  private async unlinkBilling(accountId: string): Promise<void> {
    await this.billing.updateProjectBillingInfo({
      name: `projects/${accountId}`,
      projectBillingInfo: {
        billingAccountName: '', // Unlink billing
      },
    });
    logger.info({ accountId }, 'Billing account unlinked');
  }
}

export const gcpProvider = new GCPProvider();
