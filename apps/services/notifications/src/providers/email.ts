import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

// Brevo SMTP configuration
const BREVO_SMTP_HOST = process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com';
const BREVO_SMTP_PORT = parseInt(process.env.BREVO_SMTP_PORT || '587', 10);
const BREVO_SMTP_USER = process.env.BREVO_SMTP_USER || '';
const BREVO_SMTP_PASSWORD = process.env.BREVO_SMTP_PASSWORD || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@tenxdev.ai';
const FROM_NAME = process.env.FROM_NAME || 'TenxDev';

// Create reusable transporter
let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: BREVO_SMTP_HOST,
      port: BREVO_SMTP_PORT,
      secure: false, // true for 465, false for other ports
      auth: {
        user: BREVO_SMTP_USER,
        pass: BREVO_SMTP_PASSWORD,
      },
    });
  }
  return transporter;
}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export const emailProvider = {
  async send(options: EmailOptions): Promise<{ id: string }> {
    const transport = getTransporter();

    const result = await transport.sendMail({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo,
    });

    return { id: result.messageId || '' };
  },

  async sendTemplate(
    to: string,
    templateName: string,
    variables: Record<string, string>
  ): Promise<{ id: string }> {
    const template = getTemplate(templateName, variables);
    return this.send({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  },
};

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

function getTemplate(
  name: string,
  variables: Record<string, string>
): EmailTemplate {
  const templates: Record<string, EmailTemplate> = {
    // ========================================
    // Signature Templates
    // ========================================
    'signature-request': {
      subject: `${variables.senderName} has requested your signature on "${variables.documentName}"`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #4F46E5; }
            .header h1 { color: #4F46E5; margin: 0; }
            .content { padding: 30px 0; }
            .message-box { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; font-style: italic; }
            .button { display: inline-block; background: #4F46E5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; }
            .footer { text-align: center; padding: 20px 0; color: #666; font-size: 12px; border-top: 1px solid #eee; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Signature Request</h1>
            </div>
            <div class="content">
              <p>Hi ${variables.signerName},</p>
              <p><strong>${variables.senderName}</strong> has sent you a document to sign.</p>
              <p><strong>Document:</strong> ${variables.documentName}</p>
              ${variables.message ? `<div class="message-box">"${variables.message}"</div>` : ''}
              <p style="text-align: center; margin: 30px 0;">
                <a href="${variables.signingUrl}" class="button">Review & Sign Document</a>
              </p>
              <p style="color: #666; font-size: 14px;">This link expires on ${variables.expiresAt}.</p>
              <p>If you have questions, contact ${variables.senderName} at ${variables.senderEmail || 'the sender'}.</p>
            </div>
            <div class="footer">
              <p>Powered by TenxDev E-Signature</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Signature Request\n\nHi ${variables.signerName},\n\n${variables.senderName} has sent you a document to sign.\n\nDocument: ${variables.documentName}\n${variables.message ? `Message: "${variables.message}"\n` : ''}\nSign here: ${variables.signingUrl}\n\nThis link expires on ${variables.expiresAt}.\n\nPowered by TenxDev E-Signature`,
    },
    'signature-reminder': {
      subject: `Reminder: Please sign "${variables.documentName}"`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #F59E0B; }
            .header h1 { color: #F59E0B; margin: 0; }
            .content { padding: 30px 0; }
            .button { display: inline-block; background: #4F46E5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; }
            .footer { text-align: center; padding: 20px 0; color: #666; font-size: 12px; border-top: 1px solid #eee; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Reminder: Signature Needed</h1>
            </div>
            <div class="content">
              <p>Hi ${variables.signerName},</p>
              <p>This is a friendly reminder that <strong>${variables.senderName}</strong> is waiting for your signature on "${variables.documentName}".</p>
              <p style="text-align: center; margin: 30px 0;">
                <a href="${variables.signingUrl}" class="button">Sign Document Now</a>
              </p>
            </div>
            <div class="footer">
              <p>Powered by TenxDev E-Signature</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Reminder: Signature Needed\n\nHi ${variables.signerName},\n\nThis is a friendly reminder that ${variables.senderName} is waiting for your signature on "${variables.documentName}".\n\nSign here: ${variables.signingUrl}\n\nPowered by TenxDev E-Signature`,
    },
    'document-signed': {
      subject: `"${variables.documentName}" has been signed by ${variables.signerName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #10B981; }
            .header h1 { color: #10B981; margin: 0; }
            .content { padding: 30px 0; }
            .details { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .button { display: inline-block; background: #4F46E5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; }
            .footer { text-align: center; padding: 20px 0; color: #666; font-size: 12px; border-top: 1px solid #eee; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Document Signed</h1>
            </div>
            <div class="content">
              <p>Hi,</p>
              <p><strong>${variables.signerName}</strong> has signed "${variables.documentName}".</p>
              <div class="details">
                <p><strong>Signer:</strong> ${variables.signerName} (${variables.signerEmail})</p>
                <p><strong>Signed at:</strong> ${variables.signedAt}</p>
              </div>
              <p style="text-align: center; margin: 30px 0;">
                <a href="${variables.documentUrl || '#'}" class="button">View Document</a>
              </p>
            </div>
            <div class="footer">
              <p>Powered by TenxDev E-Signature</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Document Signed\n\n${variables.signerName} has signed "${variables.documentName}".\n\nSigner: ${variables.signerName} (${variables.signerEmail})\nSigned at: ${variables.signedAt}\n\nPowered by TenxDev E-Signature`,
    },
    'envelope-completed': {
      subject: `All signatures collected for "${variables.documentName}"`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #10B981; }
            .header h1 { color: #10B981; margin: 0; }
            .content { padding: 30px 0; }
            .signers { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .signer { padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
            .signer:last-child { border-bottom: none; }
            .button { display: inline-block; background: #4F46E5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; }
            .footer { text-align: center; padding: 20px 0; color: #666; font-size: 12px; border-top: 1px solid #eee; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>All Signatures Collected!</h1>
            </div>
            <div class="content">
              <p>Hi ${variables.ownerName},</p>
              <p>Great news! All signatures have been collected for "<strong>${variables.documentName}</strong>".</p>
              <div class="signers">
                <p><strong>Signers:</strong></p>
                ${variables.signersList || '<p>All signers have completed their signatures.</p>'}
              </div>
              <p style="text-align: center; margin: 30px 0;">
                <a href="${variables.documentUrl}" class="button">Download Signed Document</a>
              </p>
            </div>
            <div class="footer">
              <p>Powered by TenxDev E-Signature</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `All Signatures Collected!\n\nHi ${variables.ownerName},\n\nGreat news! All signatures have been collected for "${variables.documentName}".\n\nDownload: ${variables.documentUrl}\n\nPowered by TenxDev E-Signature`,
    },
    'signature-declined': {
      subject: `"${variables.documentName}" was declined by ${variables.signerName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #EF4444; }
            .header h1 { color: #EF4444; margin: 0; }
            .content { padding: 30px 0; }
            .reason-box { background: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #EF4444; }
            .button { display: inline-block; background: #4F46E5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; }
            .footer { text-align: center; padding: 20px 0; color: #666; font-size: 12px; border-top: 1px solid #eee; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Signature Declined</h1>
            </div>
            <div class="content">
              <p>Hi,</p>
              <p><strong>${variables.signerName}</strong> (${variables.signerEmail}) has declined to sign "${variables.documentName}".</p>
              ${variables.declineReason ? `<div class="reason-box"><strong>Reason:</strong> ${variables.declineReason}</div>` : ''}
              <p>You may want to contact the signer to discuss any concerns.</p>
            </div>
            <div class="footer">
              <p>Powered by TenxDev E-Signature</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Signature Declined\n\n${variables.signerName} (${variables.signerEmail}) has declined to sign "${variables.documentName}".\n\n${variables.declineReason ? `Reason: ${variables.declineReason}\n` : ''}\nPowered by TenxDev E-Signature`,
    },

    // ========================================
    // Existing Templates
    // ========================================
    'project-created': {
      subject: `Your project "${variables.projectName}" has been created`,
      html: `
        <h1>Project Created</h1>
        <p>Hi ${variables.userName},</p>
        <p>Your project <strong>${variables.projectName}</strong> has been successfully created.</p>
        <p>You can view your project dashboard at:</p>
        <p><a href="${variables.dashboardUrl}">${variables.dashboardUrl}</a></p>
        <p>Best regards,<br>The TenxDev Team</p>
      `,
      text: `Project Created\n\nHi ${variables.userName},\n\nYour project "${variables.projectName}" has been successfully created.\n\nView your dashboard: ${variables.dashboardUrl}\n\nBest regards,\nThe TenxDev Team`,
    },
    'milestone-completed': {
      subject: `Milestone "${variables.milestoneName}" completed`,
      html: `
        <h1>Milestone Completed</h1>
        <p>Hi ${variables.userName},</p>
        <p>Great news! The milestone <strong>${variables.milestoneName}</strong> for project <strong>${variables.projectName}</strong> has been completed.</p>
        <p>Progress: ${variables.progress}%</p>
        <p>View details: <a href="${variables.dashboardUrl}">${variables.dashboardUrl}</a></p>
        <p>Best regards,<br>The TenxDev Team</p>
      `,
      text: `Milestone Completed\n\nHi ${variables.userName},\n\nThe milestone "${variables.milestoneName}" for project "${variables.projectName}" has been completed.\n\nProgress: ${variables.progress}%\n\nView details: ${variables.dashboardUrl}\n\nBest regards,\nThe TenxDev Team`,
    },
    'invoice-sent': {
      subject: `Invoice #${variables.invoiceNumber} for ${variables.projectName}`,
      html: `
        <h1>Invoice Ready</h1>
        <p>Hi ${variables.userName},</p>
        <p>Your invoice #${variables.invoiceNumber} for <strong>${variables.projectName}</strong> is ready.</p>
        <p>Amount: ${variables.amount}</p>
        <p>Due date: ${variables.dueDate}</p>
        <p><a href="${variables.paymentUrl}">Pay Now</a></p>
        <p>Best regards,<br>The TenxDev Team</p>
      `,
      text: `Invoice Ready\n\nHi ${variables.userName},\n\nYour invoice #${variables.invoiceNumber} for "${variables.projectName}" is ready.\n\nAmount: ${variables.amount}\nDue date: ${variables.dueDate}\n\nPay here: ${variables.paymentUrl}\n\nBest regards,\nThe TenxDev Team`,
    },
    'payment-received': {
      subject: `Payment received for ${variables.projectName}`,
      html: `
        <h1>Payment Received</h1>
        <p>Hi ${variables.userName},</p>
        <p>We have received your payment of <strong>${variables.amount}</strong> for <strong>${variables.projectName}</strong>.</p>
        <p>Receipt: <a href="${variables.receiptUrl}">${variables.receiptUrl}</a></p>
        <p>Thank you for your business!</p>
        <p>Best regards,<br>The TenxDev Team</p>
      `,
      text: `Payment Received\n\nHi ${variables.userName},\n\nWe have received your payment of ${variables.amount} for "${variables.projectName}".\n\nReceipt: ${variables.receiptUrl}\n\nThank you for your business!\n\nBest regards,\nThe TenxDev Team`,
    },
    'domain-expiring': {
      subject: `Domain ${variables.domain} expires in ${variables.daysUntilExpiry} days`,
      html: `
        <h1>Domain Expiring Soon</h1>
        <p>Hi ${variables.userName},</p>
        <p>Your domain <strong>${variables.domain}</strong> will expire in <strong>${variables.daysUntilExpiry} days</strong>.</p>
        <p>Expiry date: ${variables.expiryDate}</p>
        <p><a href="${variables.renewUrl}">Renew Now</a></p>
        <p>Best regards,<br>The TenxDev Team</p>
      `,
      text: `Domain Expiring Soon\n\nHi ${variables.userName},\n\nYour domain "${variables.domain}" will expire in ${variables.daysUntilExpiry} days.\n\nExpiry date: ${variables.expiryDate}\n\nRenew here: ${variables.renewUrl}\n\nBest regards,\nThe TenxDev Team`,
    },
    'transfer-ready': {
      subject: `Project ${variables.projectName} ready for transfer`,
      html: `
        <h1>Project Transfer Ready</h1>
        <p>Hi ${variables.userName},</p>
        <p>Your project <strong>${variables.projectName}</strong> is ready for transfer to your cloud account.</p>
        <p>Please review the transfer checklist and initiate the transfer when ready.</p>
        <p><a href="${variables.transferUrl}">Start Transfer</a></p>
        <p>Best regards,<br>The TenxDev Team</p>
      `,
      text: `Project Transfer Ready\n\nHi ${variables.userName},\n\nYour project "${variables.projectName}" is ready for transfer to your cloud account.\n\nStart transfer: ${variables.transferUrl}\n\nBest regards,\nThe TenxDev Team`,
    },
  };

  const template = templates[name];
  if (!template) {
    throw new Error(`Template "${name}" not found`);
  }

  return template;
}
