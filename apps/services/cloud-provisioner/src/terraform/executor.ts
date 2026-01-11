import { exec } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { logger } from '@tenxdev/service-utils';

const execAsync = promisify(exec);

export interface TerraformResult {
  success: boolean;
  output: string;
  error?: string;
  planFile?: string;
  outputs?: Record<string, unknown>;
  changes?: {
    add: number;
    change: number;
    destroy: number;
  };
}

export interface TerraformOptions {
  templatePath: string;
  workspace: string;
  variables: Record<string, string>;
  backendConfig: Record<string, string>;
  provider: 'aws' | 'gcp' | 'azure';
}

export interface BackendConfig {
  aws: {
    bucket: string;
    key: string;
    region: string;
    encrypt: boolean;
    dynamodb_table?: string;
  };
  gcp: {
    bucket: string;
    prefix: string;
  };
  azure: {
    resource_group_name: string;
    storage_account_name: string;
    container_name: string;
    key: string;
  };
}

const TF_STATE_BUCKET = process.env.TF_STATE_BUCKET || 'tenxdev-terraform-state';
const TF_STATE_REGION = process.env.TF_STATE_REGION || 'us-east-1';
const TF_LOCK_TABLE = process.env.TF_LOCK_TABLE || 'tenxdev-terraform-locks';
const TF_AZURE_RG = process.env.TF_AZURE_RESOURCE_GROUP || 'tenxdev-terraform';
const TF_AZURE_STORAGE = process.env.TF_AZURE_STORAGE_ACCOUNT || 'tenxdevtfstate';

export class TerraformExecutor {
  private workdir: string | null = null;

  /**
   * Create a temporary working directory and copy template files
   */
  async prepare(options: TerraformOptions): Promise<string> {
    // Create temp directory
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'terraform-'));
    this.workdir = tempDir;

    logger.info({ tempDir, templatePath: options.templatePath }, 'Created Terraform working directory');

    // Copy template files to working directory
    await this.copyDirectory(options.templatePath, tempDir);

    // Generate terraform.tfvars
    const tfvarsContent = Object.entries(options.variables)
      .map(([key, value]) => `${key} = "${value}"`)
      .join('\n');

    await fs.writeFile(path.join(tempDir, 'terraform.tfvars'), tfvarsContent);

    // Generate backend config file
    const backendConfigContent = this.generateBackendConfig(options);
    await fs.writeFile(path.join(tempDir, 'backend.tfvars'), backendConfigContent);

    return tempDir;
  }

  /**
   * Initialize Terraform with backend configuration
   */
  async init(workdir: string): Promise<TerraformResult> {
    logger.info({ workdir }, 'Running terraform init');

    try {
      const { stdout, stderr } = await execAsync(
        'terraform init -backend-config=backend.tfvars -input=false -no-color',
        { cwd: workdir, timeout: 300000 } // 5 minute timeout
      );

      logger.info({ workdir }, 'Terraform init completed');

      return {
        success: true,
        output: stdout + stderr,
      };
    } catch (error) {
      const err = error as { stdout?: string; stderr?: string; message: string };
      logger.error({ error: err.message, workdir }, 'Terraform init failed');

      return {
        success: false,
        output: err.stdout || '',
        error: err.stderr || err.message,
      };
    }
  }

  /**
   * Select or create Terraform workspace
   */
  async selectWorkspace(workdir: string, workspace: string): Promise<TerraformResult> {
    logger.info({ workdir, workspace }, 'Selecting Terraform workspace');

    try {
      // Try to select existing workspace
      await execAsync(`terraform workspace select ${workspace}`, {
        cwd: workdir,
        timeout: 30000,
      });
    } catch {
      // Workspace doesn't exist, create it
      try {
        await execAsync(`terraform workspace new ${workspace}`, {
          cwd: workdir,
          timeout: 30000,
        });
      } catch (error) {
        const err = error as { message: string };
        return {
          success: false,
          output: '',
          error: `Failed to create workspace: ${err.message}`,
        };
      }
    }

    return {
      success: true,
      output: `Workspace ${workspace} selected`,
    };
  }

  /**
   * Run Terraform plan and save plan file
   */
  async plan(workdir: string): Promise<TerraformResult> {
    const planFile = path.join(workdir, 'tfplan');
    logger.info({ workdir, planFile }, 'Running terraform plan');

    try {
      const { stdout, stderr } = await execAsync(
        `terraform plan -out=${planFile} -input=false -no-color -detailed-exitcode`,
        { cwd: workdir, timeout: 600000 } // 10 minute timeout
      );

      const output = stdout + stderr;
      const changes = this.parsePlanOutput(output);

      logger.info({ workdir, changes }, 'Terraform plan completed');

      return {
        success: true,
        output,
        planFile,
        changes,
      };
    } catch (error) {
      const err = error as { code?: number; stdout?: string; stderr?: string; message: string };

      // Exit code 2 means changes are present (not an error)
      if (err.code === 2) {
        const output = (err.stdout || '') + (err.stderr || '');
        const changes = this.parsePlanOutput(output);

        return {
          success: true,
          output,
          planFile,
          changes,
        };
      }

      logger.error({ error: err.message, workdir }, 'Terraform plan failed');

      return {
        success: false,
        output: err.stdout || '',
        error: err.stderr || err.message,
      };
    }
  }

  /**
   * Apply Terraform plan
   */
  async apply(workdir: string, planFile?: string): Promise<TerraformResult> {
    const planArg = planFile ? planFile : '-auto-approve';
    logger.info({ workdir, planFile }, 'Running terraform apply');

    try {
      const { stdout, stderr } = await execAsync(
        `terraform apply -input=false -no-color ${planArg}`,
        { cwd: workdir, timeout: 1800000 } // 30 minute timeout
      );

      logger.info({ workdir }, 'Terraform apply completed');

      // Get outputs after successful apply
      const outputs = await this.getOutputs(workdir);

      return {
        success: true,
        output: stdout + stderr,
        outputs,
      };
    } catch (error) {
      const err = error as { stdout?: string; stderr?: string; message: string };
      logger.error({ error: err.message, workdir }, 'Terraform apply failed');

      return {
        success: false,
        output: err.stdout || '',
        error: err.stderr || err.message,
      };
    }
  }

  /**
   * Destroy Terraform-managed infrastructure
   */
  async destroy(workdir: string): Promise<TerraformResult> {
    logger.warn({ workdir }, 'Running terraform destroy');

    try {
      const { stdout, stderr } = await execAsync(
        'terraform destroy -auto-approve -input=false -no-color',
        { cwd: workdir, timeout: 1800000 } // 30 minute timeout
      );

      logger.info({ workdir }, 'Terraform destroy completed');

      return {
        success: true,
        output: stdout + stderr,
      };
    } catch (error) {
      const err = error as { stdout?: string; stderr?: string; message: string };
      logger.error({ error: err.message, workdir }, 'Terraform destroy failed');

      return {
        success: false,
        output: err.stdout || '',
        error: err.stderr || err.message,
      };
    }
  }

  /**
   * Get Terraform outputs as JSON
   */
  async getOutputs(workdir: string): Promise<Record<string, unknown>> {
    try {
      const { stdout } = await execAsync('terraform output -json', {
        cwd: workdir,
        timeout: 30000,
      });

      const outputs = JSON.parse(stdout);

      // Extract values from Terraform output format
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(outputs)) {
        result[key] = (value as { value: unknown }).value;
      }

      return result;
    } catch (error) {
      logger.error({ error }, 'Failed to get Terraform outputs');
      return {};
    }
  }

  /**
   * Clean up working directory
   */
  async cleanup(workdir: string): Promise<void> {
    try {
      await fs.rm(workdir, { recursive: true, force: true });
      logger.info({ workdir }, 'Cleaned up Terraform working directory');
    } catch (error) {
      logger.warn({ error, workdir }, 'Failed to cleanup working directory');
    }
  }

  /**
   * Generate backend configuration based on provider
   */
  private generateBackendConfig(options: TerraformOptions): string {
    const stateKey = `clients/${options.workspace}/terraform.tfstate`;

    switch (options.provider) {
      case 'aws':
        return [
          `bucket         = "${TF_STATE_BUCKET}"`,
          `key            = "${stateKey}"`,
          `region         = "${TF_STATE_REGION}"`,
          `encrypt        = true`,
          `dynamodb_table = "${TF_LOCK_TABLE}"`,
        ].join('\n');

      case 'gcp':
        return [
          `bucket = "${TF_STATE_BUCKET}"`,
          `prefix = "clients/${options.workspace}"`,
        ].join('\n');

      case 'azure':
        return [
          `resource_group_name  = "${TF_AZURE_RG}"`,
          `storage_account_name = "${TF_AZURE_STORAGE}"`,
          `container_name       = "tfstate"`,
          `key                  = "${stateKey}"`,
        ].join('\n');

      default:
        throw new Error(`Unsupported provider: ${options.provider}`);
    }
  }

  /**
   * Parse plan output to extract change counts
   */
  private parsePlanOutput(output: string): { add: number; change: number; destroy: number } {
    const match = output.match(/(\d+) to add, (\d+) to change, (\d+) to destroy/);

    if (match) {
      return {
        add: parseInt(match[1], 10),
        change: parseInt(match[2], 10),
        destroy: parseInt(match[3], 10),
      };
    }

    // Check for no changes
    if (output.includes('No changes') || output.includes('Infrastructure is up-to-date')) {
      return { add: 0, change: 0, destroy: 0 };
    }

    return { add: 0, change: 0, destroy: 0 };
  }

  /**
   * Recursively copy directory contents
   */
  private async copyDirectory(src: string, dest: string): Promise<void> {
    const entries = await fs.readdir(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        await fs.mkdir(destPath, { recursive: true });
        await this.copyDirectory(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }
}

export const terraformExecutor = new TerraformExecutor();
