import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import type { ContactInput } from '../validators/contact.js';
import { confirmationService } from './confirmationService.js';

// Brevo SMTP configuration
const BREVO_SMTP_HOST = 'smtp-relay.brevo.com';
const BREVO_SMTP_PORT = 587;

// Lazy-initialized transporter
let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!transporter && config.brevoSmtpKey) {
    transporter = nodemailer.createTransport({
      host: BREVO_SMTP_HOST,
      port: BREVO_SMTP_PORT,
      secure: false,
      auth: {
        user: config.email.brevoLogin,
        pass: config.brevoSmtpKey,
      },
    });
  }
  return transporter;
}

const serviceLabels: Record<string, string> = {
  'ai-development': 'AI-Powered Development',
  infrastructure: 'Infrastructure Engineering',
  devops: 'DevOps Automation',
  cloud: 'Cloud Architecture',
  platform: 'Platform Engineering',
  consulting: 'Consulting & Training',
};

export const emailService = {
  async sendContactNotification(data: ContactInput): Promise<boolean> {
    const transport = getTransporter();
    if (!transport) {
      logger.warn('Brevo SMTP not configured, skipping email');
      return true;
    }

    const serviceLabel = serviceLabels[data.service] || data.service;

    try {
      await transport.sendMail({
        to: config.email.toEmail,
        from: config.email.fromEmail,
        subject: `New Contact from ${data.name} - ${serviceLabel}`,
        html: `
          <h2>New Contact Form Submission</h2>
          <p><strong>Name:</strong> ${data.name}</p>
          <p><strong>Email:</strong> ${data.email}</p>
          <p><strong>Company:</strong> ${data.company || 'Not provided'}</p>
          <p><strong>Service:</strong> ${serviceLabel}</p>
          <h3>Message:</h3>
          <p>${data.message.replace(/\n/g, '<br>')}</p>
        `,
        text: `
New Contact Form Submission

Name: ${data.name}
Email: ${data.email}
Company: ${data.company || 'Not provided'}
Service: ${serviceLabel}

Message:
${data.message}
        `,
      });

      logger.info({ email: data.email }, 'Contact notification email sent');
      return true;
    } catch (error) {
      logger.error({ error, email: data.email }, 'Failed to send contact email');
      throw error;
    }
  },

  async sendContactConfirmation(data: ContactInput): Promise<boolean> {
    const transport = getTransporter();
    if (!transport) {
      logger.warn('Brevo SMTP not configured, skipping confirmation email');
      return true;
    }

    try {
      await transport.sendMail({
        to: data.email,
        from: config.email.fromEmail,
        subject: "Thanks for reaching out to tenxdev.ai",
        html: `
          <h2>Thanks for reaching out, ${data.name}!</h2>
          <p>We've received your message and will get back to you within 24 hours.</p>
          <p>In the meantime, here's a summary of your inquiry:</p>
          <ul>
            <li><strong>Service:</strong> ${serviceLabels[data.service] || data.service}</li>
            <li><strong>Message:</strong> ${data.message.substring(0, 200)}${data.message.length > 200 ? '...' : ''}</li>
          </ul>
          <p>Best regards,<br>The tenxdev.ai Team</p>
        `,
      });

      logger.info({ email: data.email }, 'Contact confirmation email sent');
      return true;
    } catch (error) {
      logger.error({ error, email: data.email }, 'Failed to send confirmation email');
      return false;
    }
  },

  async sendNewsletterWelcome(email: string): Promise<boolean> {
    const transport = getTransporter();
    if (!transport) {
      logger.warn('Brevo SMTP not configured, skipping newsletter welcome');
      return true;
    }

    try {
      await transport.sendMail({
        to: email,
        from: config.email.fromEmail,
        subject: "Welcome to the tenxdev.ai Newsletter!",
        html: `
          <h2>Welcome to the tenxdev.ai Newsletter!</h2>
          <p>Thanks for subscribing! You'll receive updates on:</p>
          <ul>
            <li>AI-powered development best practices</li>
            <li>Infrastructure and DevOps insights</li>
            <li>Industry news and trends</li>
            <li>Exclusive content and case studies</li>
          </ul>
          <p>Best regards,<br>The tenxdev.ai Team</p>
        `,
      });

      logger.info({ email }, 'Newsletter welcome email sent');
      return true;
    } catch (error) {
      logger.error({ error, email }, 'Failed to send newsletter welcome');
      throw error;
    }
  },

  async sendDemoConfirmation(data: {
    to: string;
    name: string;
    company: string;
    meetLink: string;
    startTime: string;
    endTime: string;
    eventId: string;
  }): Promise<boolean> {
    logger.info({ to: data.to, eventId: data.eventId, startTime: data.startTime }, 'Attempting to send demo confirmation email');

    const transport = getTransporter();
    if (!transport) {
      logger.warn('Brevo SMTP not configured, skipping demo confirmation');
      return true;
    }

    if (!data.eventId) {
      logger.error({ to: data.to }, 'Cannot send demo confirmation: eventId is missing');
      return false;
    }

    const startDate = new Date(data.startTime);
    const endDate = new Date(data.endTime);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      logger.error({ startTime: data.startTime, endTime: data.endTime }, 'Invalid date for demo confirmation email');
      return false;
    }
    const dateStr = startDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const timeStr = `${startDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })} - ${endDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZoneName: 'short',
    })}`;

    // Generate confirmation URL
    const confirmUrl = confirmationService.generateConfirmationUrl(data.eventId, data.to);

    try {
      await transport.sendMail({
        to: data.to,
        from: config.email.fromEmail,
        subject: `Action Required: Confirm Your Demo with tenxdev.ai - ${dateStr}`,
        html: `
          <h2>Please Confirm Your Demo</h2>
          <p>Hi ${data.name},</p>
          <p>Thanks for scheduling a demo with tenxdev.ai! We're excited to show you how we can help ${data.company} build software faster with AI.</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${confirmUrl}" style="background-color: #0066cc; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Confirm Your Demo
            </a>
          </div>

          <p style="color: #e65100; font-weight: bold; text-align: center;">
            ⚠️ Please confirm within 1 hour or your slot will be released.
          </p>

          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Demo Details</h3>
            <p><strong>Date:</strong> ${dateStr}</p>
            <p><strong>Time:</strong> ${timeStr}</p>
            ${data.meetLink ? `<p><strong>Join Link:</strong> <a href="${data.meetLink}">${data.meetLink}</a></p>` : '<p><em>Meeting link will be provided after confirmation</em></p>'}
          </div>

          <p><strong>What to expect:</strong></p>
          <ul>
            <li>Learn about our AI-powered development approach</li>
            <li>See examples of projects we've delivered</li>
            <li>Discuss your specific needs and challenges</li>
            <li>Get answers to any questions you have</li>
          </ul>

          <p>If you need to reschedule, please reply to this email.</p>

          <p>See you soon!<br>The tenxdev.ai Team</p>
        `,
        text: `
Please Confirm Your Demo

Hi ${data.name},

Thanks for scheduling a demo with tenxdev.ai! We're excited to show you how we can help ${data.company} build software faster with AI.

CONFIRM YOUR DEMO: ${confirmUrl}

⚠️ Please confirm within 1 hour or your slot will be released.

Demo Details:
- Date: ${dateStr}
- Time: ${timeStr}
${data.meetLink ? `- Join Link: ${data.meetLink}` : '- Meeting link will be provided after confirmation'}

What to expect:
- Learn about our AI-powered development approach
- See examples of projects we've delivered
- Discuss your specific needs and challenges
- Get answers to any questions you have

If you need to reschedule, please reply to this email.

See you soon!
The tenxdev.ai Team
        `,
      });

      logger.info({ email: data.to }, 'Demo confirmation email sent');
      return true;
    } catch (error) {
      logger.error({ error, email: data.to }, 'Failed to send demo confirmation');
      throw error;
    }
  },

  async sendJobApplicationNotification(data: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    position: string;
    linkedIn?: string;
    portfolio?: string;
    coverLetter?: string;
    resumeKey: string;
  }): Promise<boolean> {
    const transport = getTransporter();
    if (!transport) {
      logger.warn('Brevo SMTP not configured, skipping job application notification');
      return true;
    }

    try {
      await transport.sendMail({
        to: config.email.toEmail,
        from: config.email.fromEmail,
        subject: `New Job Application: ${data.position} - ${data.firstName} ${data.lastName}`,
        html: `
          <h2>New Job Application</h2>
          <p><strong>Position:</strong> ${data.position}</p>
          <hr>
          <h3>Candidate Information</h3>
          <p><strong>Name:</strong> ${data.firstName} ${data.lastName}</p>
          <p><strong>Email:</strong> <a href="mailto:${data.email}">${data.email}</a></p>
          <p><strong>Phone:</strong> ${data.phone}</p>
          ${data.linkedIn ? `<p><strong>LinkedIn:</strong> <a href="${data.linkedIn}">${data.linkedIn}</a></p>` : ''}
          ${data.portfolio ? `<p><strong>Portfolio/GitHub:</strong> <a href="${data.portfolio}">${data.portfolio}</a></p>` : ''}
          <hr>
          <h3>Resume</h3>
          <p>Resume uploaded to R2: <code>${data.resumeKey}</code></p>
          ${data.coverLetter ? `
          <hr>
          <h3>Cover Letter</h3>
          <p>${data.coverLetter.replace(/\n/g, '<br>')}</p>
          ` : ''}
          <hr>
          <p><em>This application requires US citizenship and US residency.</em></p>
        `,
        text: `
New Job Application

Position: ${data.position}

Candidate Information
Name: ${data.firstName} ${data.lastName}
Email: ${data.email}
Phone: ${data.phone}
${data.linkedIn ? `LinkedIn: ${data.linkedIn}` : ''}
${data.portfolio ? `Portfolio/GitHub: ${data.portfolio}` : ''}

Resume
Resume uploaded to R2: ${data.resumeKey}

${data.coverLetter ? `Cover Letter:\n${data.coverLetter}` : ''}

This application requires US citizenship and US residency.
        `,
      });

      // Also send confirmation to applicant
      await transport.sendMail({
        to: data.email,
        from: config.email.fromEmail,
        subject: `Application Received: ${data.position} at TenxDev`,
        html: `
          <h2>Thanks for applying, ${data.firstName}!</h2>
          <p>We've received your application for the <strong>${data.position}</strong> position at TenxDev.</p>
          <p>Our team will review your application and get back to you within 5 business days.</p>
          <h3>What's Next?</h3>
          <ul>
            <li>Our team reviews your resume and qualifications</li>
            <li>If there's a match, we'll reach out to schedule an initial call</li>
            <li>The interview process typically includes technical and cultural fit discussions</li>
          </ul>
          <p>In the meantime, feel free to learn more about us at <a href="https://tenxdev.ai">tenxdev.ai</a>.</p>
          <p>Best regards,<br>The TenxDev Team</p>
        `,
      });

      logger.info({ email: data.email, position: data.position }, 'Job application notification sent');
      return true;
    } catch (error) {
      logger.error({ error, email: data.email }, 'Failed to send job application notification');
      throw error;
    }
  },
};
