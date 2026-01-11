export interface CloudAccountInfo {
  id: string;
  name: string;
  status: string;
  region: string;
}

export interface CloudResource {
  id: string;
  type: string;
  name: string;
  region: string;
  status: string;
  monthlyCostEstimate?: number;
}

export interface CloudCosts {
  periodStart: Date;
  periodEnd: Date;
  totalCost: number;
  currency: string;
  breakdown: Record<string, number>;
}

export interface TransferChecklist {
  items: Array<{
    id: string;
    name: string;
    description: string;
    completed: boolean;
    completedAt?: Date;
  }>;
}

export interface CloudProvider {
  name: string;

  // Account management
  createAccount(name: string, email: string): Promise<CloudAccountInfo>;
  getAccount(id: string): Promise<CloudAccountInfo>;
  deleteAccount(id: string): Promise<void>;

  // Resources
  listResources(accountId: string): Promise<CloudResource[]>;
  syncResources(accountId: string): Promise<CloudResource[]>;

  // Costs
  getCosts(accountId: string, startDate: Date, endDate: Date): Promise<CloudCosts>;
  getCostForecast(accountId: string): Promise<CloudCosts>;

  // Transfer
  getTransferChecklist(accountId: string): TransferChecklist;
  executeTransferStep(accountId: string, stepId: string): Promise<void>;
  verifyTransfer(accountId: string): Promise<boolean>;
  completeTransfer(accountId: string, targetOrgId: string): Promise<void>;
}
