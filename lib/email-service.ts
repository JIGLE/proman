// Email service for correspondence functionality
import * as sgMail from '@sendgrid/mail';
import type { MailDataRequired, ClientResponse } from '@sendgrid/mail';
import { getPrismaClient } from '@/lib/database';
import type { PrismaClient } from '@prisma/client';

// Initialize SendGrid with API key
const sendGridClient = sgMail as unknown as {
  setApiKey?: (k: string) => void;
  send: (msg: MailDataRequired) => Promise<[ClientResponse, unknown] | ClientResponse>;
};
if (process.env.SENDGRID_API_KEY && typeof sendGridClient.setApiKey === 'function') {
  sendGridClient.setApiKey(process.env.SENDGRID_API_KEY);
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  variables: string[]; // Array of variable names like ['tenantName', 'propertyAddress']
}

export interface EmailData {
  to: string | string[];
  from: string;
  subject: string;
  html: string;
  text?: string;
  templateId?: string;
  dynamicTemplateData?: Record<string, unknown>;
}

// Predefined email templates
export const EMAIL_TEMPLATES: Record<string, EmailTemplate> = {
  rent_reminder: {
    id: 'rent_reminder',
    name: 'Rent Payment Reminder',
    subject: 'Rent Payment Reminder - {{propertyAddress}}',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Rent Payment Reminder</h2>
        <p>Dear {{tenantName}},</p>
        <p>This is a friendly reminder that your rent payment of $\{{rentAmount}} for <strong>{{propertyAddress}}</strong> is due on {{dueDate}}.</p>
        <p>Please ensure your payment is made by the due date to avoid any late fees.</p>
        <div style="background-color: #f8f9fa; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <h3>Payment Details:</h3>
          <ul>
            <li><strong>Property:</strong> {{propertyAddress}}</li>
            <li><strong>Amount Due:</strong> $\{{rentAmount}}</li>
            <li><strong>Due Date:</strong> {{dueDate}}</li>
            <li><strong>Payment Method:</strong> {{paymentMethod}}</li>
          </ul>
        </div>
        <p>If you have already made this payment, please disregard this reminder.</p>
        <p>Thank you for your prompt attention to this matter.</p>
        <p>Best regards,<br>{{landlordName}}<br>{{companyName}}</p>
      </div>
    `,
    variables: ['tenantName', 'propertyAddress', 'rentAmount', 'dueDate', 'paymentMethod', 'landlordName', 'companyName']
  },
  lease_renewal: {
    id: 'lease_renewal',
    name: 'Lease Renewal Notice',
    subject: 'Lease Renewal Notice - {{propertyAddress}}',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Lease Renewal Notice</h2>
        <p>Dear {{tenantName}},</p>
        <p>Your current lease for <strong>{{propertyAddress}}</strong> is approaching its expiration date.</p>
        <div style="background-color: #e8f5e8; padding: 15px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #4caf50;">
          <h3>Lease Details:</h3>
          <ul>
            <li><strong>Current Lease End:</strong> {{currentLeaseEnd}}</li>
            <li><strong>Proposed New Term:</strong> {{newLeaseTerm}}</li>
            <li><strong>New Monthly Rent:</strong> $\{{newRentAmount}}</li>
            <li><strong>Renewal Deadline:</strong> {{renewalDeadline}}</li>
          </ul>
        </div>
        <p>If you would like to renew your lease, please contact us by {{renewalDeadline}} to discuss the terms and sign the renewal agreement.</p>
        <p>We value you as a tenant and hope to continue our landlord-tenant relationship.</p>
        <p>Best regards,<br>{{landlordName}}<br>{{companyName}}</p>
      </div>
    `,
    variables: ['tenantName', 'propertyAddress', 'currentLeaseEnd', 'newLeaseTerm', 'newRentAmount', 'renewalDeadline', 'landlordName', 'companyName']
  },
  maintenance_complete: {
    id: 'maintenance_complete',
    name: 'Maintenance Work Completed',
    subject: 'Maintenance Work Completed - {{propertyAddress}}',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Maintenance Work Completed</h2>
        <p>Dear {{tenantName}},</p>
        <p>We are pleased to inform you that the maintenance work at your property has been completed.</p>
        <div style="background-color: #fff3cd; padding: 15px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #ffc107;">
          <h3>Work Details:</h3>
          <ul>
            <li><strong>Property:</strong> {{propertyAddress}}</li>
            <li><strong>Work Requested:</strong> {{workDescription}}</li>
            <li><strong>Completion Date:</strong> {{completionDate}}</li>
            <li><strong>Contractor:</strong> {{contractorName}}</li>
          </ul>
        </div>
        <p>Please inspect the work and contact us immediately if you notice any issues or have concerns about the completed work.</p>
        <p>Thank you for bringing this to our attention. We strive to maintain your property in excellent condition.</p>
        <p>Best regards,<br>{{landlordName}}<br>{{companyName}}</p>
      </div>
    `,
    variables: ['tenantName', 'propertyAddress', 'workDescription', 'completionDate', 'contractorName', 'landlordName', 'companyName']
  }
};

export class EmailService {
  private static instance: EmailService;
  private isInitialized = false;

  private constructor() {
    this.initialize();
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  private initialize() {
    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      this.isInitialized = true;
    }
  }

  public isReady(): boolean {
    return this.isInitialized && !!process.env.SENDGRID_API_KEY;
  }

  /**
   * Send a single email
   */
  public async sendEmail(emailData: EmailData, userId: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.isReady()) {
      return { success: false, error: 'Email service not configured' };
    }

    try {
      const msg = {
        to: emailData.to,
        from: emailData.from || process.env.FROM_EMAIL || 'noreply@proman.app',
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text,
        templateId: emailData.templateId,
        dynamicTemplateData: emailData.dynamicTemplateData,
      } as const;

      const result = await sendGridClient.send(msg);
      let messageId: string | undefined;

      // Helper to safely extract headers from possible send result shapes
      const getHeaders = (r: unknown): Record<string, string> | undefined => {
        if (!r || typeof r !== 'object') return undefined;
        return (r as { headers?: Record<string, string> }).headers;
      };

      if (Array.isArray(result) && result.length > 0) {
        const headers = getHeaders(result[0]);
        const maybeMsgId = headers?.['x-message-id'];
        if (typeof maybeMsgId === 'string') messageId = maybeMsgId;
      } else {
        const headers = getHeaders(result);
        const maybeMsgId = headers?.['x-message-id'];
        if (typeof maybeMsgId === 'string') messageId = maybeMsgId;
      }

      // Log the email in database for tracking
      await this.logEmail({
        to: Array.isArray(emailData.to) ? emailData.to.join(', ') : emailData.to,
        from: String(msg.from),
        subject: emailData.subject,
        templateId: emailData.templateId,
        status: 'sent',
        messageId,
        userId,
      });

      return { success: true, messageId };
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error('Email send error:', error);

      // Log failed email
      await this.logEmail({
        to: Array.isArray(emailData.to) ? emailData.to.join(', ') : emailData.to,
        from: emailData.from || process.env.FROM_EMAIL || 'noreply@proman.app',
        subject: emailData.subject,
        templateId: emailData.templateId,
        status: 'failed',
        error: errMsg,
        userId,
      });

      return { success: false, error: errMsg };
    }
  }

  /**
   * Send email using a predefined template
   */
  public async sendTemplatedEmail(
    templateId: string,
    recipientEmail: string,
    variables: Record<string, unknown>,
    userId: string,
    customSubject?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const template = EMAIL_TEMPLATES[templateId];
    if (!template) {
      return { success: false, error: `Template ${templateId} not found` };
    }

    // Replace variables in subject and content
    let subject = customSubject || template.subject;
    let htmlContent = template.htmlContent;

    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      subject = subject.replace(regex, String(value));
      htmlContent = htmlContent.replace(regex, String(value));
    });

    return this.sendEmail({
      to: recipientEmail,
      from: process.env.FROM_EMAIL || 'noreply@proman.app',
      subject,
      html: htmlContent,
      templateId,
    }, userId);
  }

  /**
   * Send bulk emails with rate limiting
   */
  public async sendBulkEmails(
    emails: Array<{ email: string; templateId: string; variables: Record<string, unknown> }>,
    batchSize = 10,
    delayMs = 1000,
    userId: string
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    const results = { success: 0, failed: 0, errors: [] as string[] };

    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);

      const batchPromises = batch.map(async (emailData) => {
        try {
          const result = await this.sendTemplatedEmail(
            emailData.templateId,
            emailData.email,
            emailData.variables as Record<string, unknown>,
            userId,
            undefined
          );

          if (result.success) {
            results.success++;
          } else {
            results.failed++;
            results.errors.push(`Failed to send to ${emailData.email}: ${result.error}`);
          }
        } catch (error: unknown) {
          results.failed++;
          const errMsg = error instanceof Error ? error.message : String(error);
          results.errors.push(`Error sending to ${emailData.email}: ${errMsg}`);
        }
      });

      await Promise.all(batchPromises);

      // Rate limiting delay between batches
      if (i + batchSize < emails.length) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    return results;
  }

  /**
   * Log email in database for tracking
   */
  private async logEmail(data: {
    to: string;
    from: string;
    subject: string;
    templateId?: string;
    status: 'sent' | 'failed' | 'bounced' | 'delivered';
    messageId?: string;
    error?: string;
    userId: string;
  }): Promise<void> {
    try {
      let prisma: PrismaClient;
      try {
        prisma = getPrismaClient();
      } catch (getErr: unknown) {
        const msg = getErr instanceof Error ? getErr.message : String(getErr);
        // If Prisma isn't available during build/test time, silently skip logging to avoid noisy errors
        if (msg.includes('PrismaClient not available during build time')) {
          return;
        }
        // Unexpected error while obtaining Prisma client — surface it for diagnostics
        console.error('Failed to obtain PrismaClient for email logging:', getErr);
        return;
      }

      await prisma.emailLog.create({
        data: {
          to: data.to,
          from: data.from,
          subject: data.subject,
          templateId: data.templateId,
          status: data.status,
          messageId: data.messageId,
          error: data.error,
          sentAt: new Date(),
          userId: data.userId,
        },
      });
    } catch (error: unknown) {
      // Keep this low-noise during tests; log at debug level
      console.debug('Failed to log email:', error);
    }
  }

  /**
   * Get email delivery statistics
   */
  public async getEmailStats(userId: string, days = 30): Promise<Record<string, number>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    try {
      const prisma: PrismaClient = getPrismaClient();
      const stats = await prisma.emailLog.groupBy({
        by: ['status'],
        where: {
          sentAt: {
            gte: startDate,
          },
        },
        _count: {
          id: true,
        },
      });

      return stats.reduce((acc: Record<string, number>, stat: { status: string; _count: { id: number } }) => {
        acc[stat.status] = stat._count.id;
        return acc;
      }, {} as Record<string, number>);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('PrismaClient not available during build time')) {
        return {};
      }
      console.error('Failed to fetch email stats:', err);
      return {};
    }
  }
}

// Export singleton instance
export const emailService = EmailService.getInstance();
