import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSecretValue } from '../config/secrets.js';
import { logger } from '../utils/logger.js';

// Lazy-load R2 client to support secret manager
let r2Client: S3Client | null = null;

function getR2Client(): S3Client {
  if (!r2Client) {
    const accountId = getSecretValue('r2AccountId', process.env.R2_ACCOUNT_ID);
    const accessKeyId = getSecretValue('r2AccessKeyId', process.env.R2_ACCESS_KEY_ID);
    const secretAccessKey = getSecretValue('r2SecretAccessKey', process.env.R2_SECRET_ACCESS_KEY);

    if (!accountId || !accessKeyId || !secretAccessKey) {
      throw new Error('R2 credentials not configured');
    }

    r2Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }
  return r2Client;
}

export interface UploadResult {
  success: boolean;
  key?: string;
  url?: string;
  error?: string;
}

export const r2Service = {
  /**
   * Upload a file to R2 in the tenxdev-job-applications folder
   */
  async uploadResume(
    buffer: Buffer,
    originalFilename: string,
    mimeType: string,
    applicantEmail: string,
    position: string
  ): Promise<UploadResult> {
    try {
      const bucketName = getSecretValue('r2BucketName', process.env.R2_BUCKET_NAME);
      if (!bucketName) {
        throw new Error('R2 bucket name not configured');
      }

      // Create a unique filename with timestamp and sanitized email
      const timestamp = new Date().toISOString().split('T')[0];
      const sanitizedEmail = applicantEmail.replace(/[^a-zA-Z0-9]/g, '_');
      const sanitizedPosition = position.replace(/[^a-zA-Z0-9-]/g, '_');
      const ext = originalFilename.split('.').pop() || 'pdf';

      // Store in tenxdev-job-applications/YYYY-MM-DD/position/email_timestamp.ext
      const key = `tenxdev-job-applications/${timestamp}/${sanitizedPosition}/${sanitizedEmail}_${Date.now()}.${ext}`;

      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        Metadata: {
          'original-filename': originalFilename,
          'applicant-email': applicantEmail,
          position: position,
          'uploaded-at': new Date().toISOString(),
        },
      });

      await getR2Client().send(command);

      logger.info({ key, applicantEmail, position }, 'Resume uploaded to R2');

      return {
        success: true,
        key,
        url: `r2://${bucketName}/${key}`,
      };
    } catch (error) {
      logger.error({ error, applicantEmail }, 'Failed to upload resume to R2');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  },
};
