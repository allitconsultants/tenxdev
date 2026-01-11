import {
  OrganizationsClient,
  CreateAccountCommand,
  DescribeAccountCommand,
  MoveAccountCommand,
  ListAccountsCommand,
} from '@aws-sdk/client-organizations';
import {
  IAMClient,
  CreateRoleCommand,
  DeleteRoleCommand,
  AttachRolePolicyCommand,
  DetachRolePolicyCommand,
} from '@aws-sdk/client-iam';
import {
  CostExplorerClient,
  GetCostAndUsageCommand,
  GetCostForecastCommand,
} from '@aws-sdk/client-cost-explorer';
import {
  SecretsManagerClient,
  CreateSecretCommand,
  UpdateSecretCommand,
  DeleteSecretCommand,
} from '@aws-sdk/client-secrets-manager';
import type {
  CloudProvider,
  CloudAccountInfo,
  CloudResource,
  CloudCosts,
  TransferChecklist,
} from './base.js';
import { logger } from '@tenxdev/service-utils';

const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const AWS_OU_ID = process.env.AWS_CLIENT_OU_ID;

export class AWSProvider implements CloudProvider {
  name = 'aws';

  private organizations: OrganizationsClient;
  private iam: IAMClient;
  private costExplorer: CostExplorerClient;
  private secretsManager: SecretsManagerClient;

  constructor() {
    this.organizations = new OrganizationsClient({ region: AWS_REGION });
    this.iam = new IAMClient({ region: AWS_REGION });
    this.costExplorer = new CostExplorerClient({ region: AWS_REGION });
    this.secretsManager = new SecretsManagerClient({ region: AWS_REGION });
  }

  async createAccount(name: string, email: string): Promise<CloudAccountInfo> {
    logger.info({ name, email }, 'Creating AWS account');

    const command = new CreateAccountCommand({
      AccountName: name,
      Email: email,
      IamUserAccessToBilling: 'ALLOW',
    });

    const response = await this.organizations.send(command);

    if (!response.CreateAccountStatus?.Id) {
      throw new Error('Failed to create AWS account');
    }

    // Wait for account creation (simplified - in production use polling)
    await new Promise((resolve) => setTimeout(resolve, 30000));

    // Move to client OU
    if (AWS_OU_ID && response.CreateAccountStatus.AccountId) {
      const moveCommand = new MoveAccountCommand({
        AccountId: response.CreateAccountStatus.AccountId,
        SourceParentId: 'root', // Get from org
        DestinationParentId: AWS_OU_ID,
      });

      await this.organizations.send(moveCommand);
    }

    // Create management role
    await this.createManagementRole(response.CreateAccountStatus.AccountId!);

    return {
      id: response.CreateAccountStatus.AccountId!,
      name,
      status: 'active',
      region: AWS_REGION,
    };
  }

  async getAccount(id: string): Promise<CloudAccountInfo> {
    const command = new DescribeAccountCommand({
      AccountId: id,
    });

    const response = await this.organizations.send(command);

    if (!response.Account) {
      throw new Error('Account not found');
    }

    return {
      id: response.Account.Id!,
      name: response.Account.Name!,
      status: response.Account.Status!.toLowerCase(),
      region: AWS_REGION,
    };
  }

  async deleteAccount(_id: string): Promise<void> {
    // AWS doesn't support programmatic account deletion
    // Mark for manual cleanup
    logger.warn({ accountId: _id }, 'AWS account marked for manual deletion');
  }

  async listResources(_accountId: string): Promise<CloudResource[]> {
    // In production, use Resource Explorer or Config
    // Simplified implementation
    return [];
  }

  async syncResources(accountId: string): Promise<CloudResource[]> {
    return this.listResources(accountId);
  }

  async getCosts(
    accountId: string,
    startDate: Date,
    endDate: Date
  ): Promise<CloudCosts> {
    const command = new GetCostAndUsageCommand({
      TimePeriod: {
        Start: startDate.toISOString().split('T')[0],
        End: endDate.toISOString().split('T')[0],
      },
      Granularity: 'MONTHLY',
      Filter: {
        Dimensions: {
          Key: 'LINKED_ACCOUNT',
          Values: [accountId],
        },
      },
      Metrics: ['UnblendedCost'],
      GroupBy: [{ Type: 'DIMENSION', Key: 'SERVICE' }],
    });

    const response = await this.costExplorer.send(command);

    const breakdown: Record<string, number> = {};
    let totalCost = 0;

    for (const result of response.ResultsByTime || []) {
      for (const group of result.Groups || []) {
        const service = group.Keys?.[0] || 'Other';
        const cost = parseFloat(group.Metrics?.UnblendedCost?.Amount || '0');
        breakdown[service] = (breakdown[service] || 0) + cost;
        totalCost += cost;
      }
    }

    return {
      periodStart: startDate,
      periodEnd: endDate,
      totalCost,
      currency: 'USD',
      breakdown,
    };
  }

  async getCostForecast(_accountId: string): Promise<CloudCosts> {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);

    const command = new GetCostForecastCommand({
      TimePeriod: {
        Start: startDate.toISOString().split('T')[0],
        End: endDate.toISOString().split('T')[0],
      },
      Metric: 'UNBLENDED_COST',
      Granularity: 'MONTHLY',
    });

    const response = await this.costExplorer.send(command);

    return {
      periodStart: startDate,
      periodEnd: endDate,
      totalCost: parseFloat(response.Total?.Amount || '0'),
      currency: 'USD',
      breakdown: {},
    };
  }

  getTransferChecklist(_accountId: string): TransferChecklist {
    return {
      items: [
        {
          id: 'remove-iam-users',
          name: 'Remove tenxdev IAM users',
          description: 'Delete all IAM users created by tenxdev',
          completed: false,
        },
        {
          id: 'remove-management-role',
          name: 'Remove TenxdevManagementRole',
          description: 'Delete the cross-account management role',
          completed: false,
        },
        {
          id: 'rotate-secrets',
          name: 'Rotate all secrets',
          description: 'Rotate credentials in Secrets Manager',
          completed: false,
        },
        {
          id: 'remove-scp',
          name: 'Remove organization SCPs',
          description: 'Remove service control policies',
          completed: false,
        },
        {
          id: 'update-billing',
          name: 'Update billing contact',
          description: 'Set client as billing contact',
          completed: false,
        },
        {
          id: 'remove-from-org',
          name: 'Remove from organization',
          description: 'Move account out of tenxdev organization',
          completed: false,
        },
        {
          id: 'verify-access',
          name: 'Verify client access',
          description: 'Confirm client can access account',
          completed: false,
        },
      ],
    };
  }

  async executeTransferStep(accountId: string, stepId: string): Promise<void> {
    logger.info({ accountId, stepId }, 'Executing transfer step');

    switch (stepId) {
      case 'remove-management-role':
        await this.removeManagementRole(accountId);
        break;
      // Other steps would be implemented here
      default:
        logger.warn({ stepId }, 'Unknown transfer step');
    }
  }

  async verifyTransfer(_accountId: string): Promise<boolean> {
    // Verify we no longer have access
    try {
      await this.getAccount(_accountId);
      return false; // We still have access
    } catch {
      return true; // Access removed successfully
    }
  }

  async completeTransfer(accountId: string, _targetOrgId: string): Promise<void> {
    logger.info({ accountId }, 'Completing AWS account transfer');
    // Final cleanup steps
  }

  private async createManagementRole(accountId: string): Promise<void> {
    const assumeRolePolicy = {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: {
            AWS: process.env.AWS_MANAGEMENT_ROLE_ARN,
          },
          Action: 'sts:AssumeRole',
        },
      ],
    };

    const command = new CreateRoleCommand({
      RoleName: 'TenxdevManagementRole',
      AssumeRolePolicyDocument: JSON.stringify(assumeRolePolicy),
      Description: 'Management role for tenxdev.ai',
      Tags: [
        { Key: 'ManagedBy', Value: 'tenxdev' },
        { Key: 'AccountId', Value: accountId },
      ],
    });

    await this.iam.send(command);

    // Attach admin policy (in production, use least privilege)
    const attachCommand = new AttachRolePolicyCommand({
      RoleName: 'TenxdevManagementRole',
      PolicyArn: 'arn:aws:iam::aws:policy/AdministratorAccess',
    });

    await this.iam.send(attachCommand);
  }

  private async removeManagementRole(_accountId: string): Promise<void> {
    // Detach policies first
    const detachCommand = new DetachRolePolicyCommand({
      RoleName: 'TenxdevManagementRole',
      PolicyArn: 'arn:aws:iam::aws:policy/AdministratorAccess',
    });

    await this.iam.send(detachCommand);

    // Delete role
    const deleteCommand = new DeleteRoleCommand({
      RoleName: 'TenxdevManagementRole',
    });

    await this.iam.send(deleteCommand);
  }
}

export const awsProvider = new AWSProvider();
