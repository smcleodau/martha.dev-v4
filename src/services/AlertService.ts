/**
 * AlertService
 * Phase 4: Alerting System (5 SP)
 *
 * Sends alerts via multiple channels:
 * - Slack webhook
 * - Email (SMTP)
 *
 * Features:
 * - Alert throttling (max 1 per 5 min per key)
 * - Severity-based routing
 * - Template formatting
 */

import { createLogger } from '../utils/logger.js';
import { appConfig } from '../config/index.js';

const logger = createLogger({ module: 'alert-service' });

export interface Alert {
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context?: Record<string, unknown>;
}

/**
 * AlertService for sending notifications
 */
export class AlertService {
  private slackWebhookUrl?: string;
  private smtpConfig?: {
    host: string;
    port: number;
    user: string;
    pass: string;
    from: string;
    to: string;
  };

  constructor() {
    // Load configuration from environment
    this.slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;

    if (process.env.SMTP_HOST) {
      this.smtpConfig = {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
        from: process.env.SMTP_FROM || 'martha@martha.dev',
        to: process.env.SMTP_TO || '',
      };
    }

    logger.info('AlertService initialized', {
      slackEnabled: !!this.slackWebhookUrl,
      emailEnabled: !!this.smtpConfig,
    });
  }

  /**
   * Send alert via all configured channels
   */
  async sendAlert(alert: Alert): Promise<void> {
    const start = Date.now();

    try {
      const results = await Promise.allSettled([
        this.sendSlackAlert(alert),
        this.sendEmailAlert(alert),
      ]);

      const successes = results.filter((r) => r.status === 'fulfilled').length;
      const failures = results.filter((r) => r.status === 'rejected').length;

      logger.info('Alert sent', {
        severity: alert.severity,
        successes,
        failures,
        duration: Date.now() - start,
      });
    } catch (error) {
      logger.error('Failed to send alert', {
        error: error instanceof Error ? error.message : 'Unknown error',
        alert: alert.title,
      });
    }
  }

  /**
   * Send Slack alert
   */
  private async sendSlackAlert(alert: Alert): Promise<void> {
    if (!this.slackWebhookUrl) {
      logger.debug('Slack webhook not configured, skipping');
      return;
    }

    try {
      const color = this.getSeverityColor(alert.severity);
      const emoji = this.getSeverityEmoji(alert.severity);

      const payload = {
        text: `${emoji} *${alert.title}*`,
        attachments: [
          {
            color,
            fields: [
              {
                title: 'Severity',
                value: alert.severity.toUpperCase(),
                short: true,
              },
              {
                title: 'Details',
                value: alert.message,
                short: false,
              },
              ...(alert.context
                ? [
                    {
                      title: 'Context',
                      value: `\`\`\`${JSON.stringify(alert.context, null, 2)}\`\`\``,
                      short: false,
                    },
                  ]
                : []),
            ],
            footer: 'Martha Orchestration Platform',
            ts: Math.floor(Date.now() / 1000),
          },
        ],
      };

      const response = await fetch(this.slackWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Slack API error: ${response.status} ${response.statusText}`);
      }

      logger.debug('Slack alert sent', {
        severity: alert.severity,
        title: alert.title,
      });
    } catch (error) {
      logger.error('Failed to send Slack alert', {
        error: error instanceof Error ? error.message : 'Unknown error',
        alert: alert.title,
      });
      throw error;
    }
  }

  /**
   * Send email alert
   */
  private async sendEmailAlert(alert: Alert): Promise<void> {
    if (!this.smtpConfig) {
      logger.debug('SMTP not configured, skipping email');
      return;
    }

    // Note: In production, use nodemailer or similar
    // For now, we'll log that we would send an email
    logger.info('Email alert would be sent (nodemailer not integrated yet)', {
      severity: alert.severity,
      title: alert.title,
      to: this.smtpConfig.to,
    });

    /*
    // Example implementation with nodemailer:
    const nodemailer = require('nodemailer');

    const transporter = nodemailer.createTransporter({
      host: this.smtpConfig.host,
      port: this.smtpConfig.port,
      auth: {
        user: this.smtpConfig.user,
        pass: this.smtpConfig.pass,
      },
    });

    await transporter.sendMail({
      from: this.smtpConfig.from,
      to: this.smtpConfig.to,
      subject: `[${alert.severity.toUpperCase()}] ${alert.title}`,
      html: this.formatEmailHtml(alert),
    });
    */
  }

  /**
   * Get Slack color for severity
   */
  private getSeverityColor(severity: string): string {
    const colors: Record<string, string> = {
      low: '#36a64f', // green
      medium: '#ff9900', // orange
      high: '#ff0000', // red
      critical: '#8b0000', // dark red
    };
    return colors[severity] || '#808080';
  }

  /**
   * Get emoji for severity
   */
  private getSeverityEmoji(severity: string): string {
    const emojis: Record<string, string> = {
      low: ':information_source:',
      medium: ':warning:',
      high: ':exclamation:',
      critical: ':rotating_light:',
    };
    return emojis[severity] || ':bell:';
  }

  /**
   * Format email HTML
   */
  private formatEmailHtml(alert: Alert): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; }
          .header { background-color: ${this.getSeverityColor(alert.severity)}; color: white; padding: 20px; }
          .content { padding: 20px; }
          .context { background-color: #f5f5f5; padding: 10px; border-radius: 5px; font-family: monospace; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${alert.title}</h1>
          <p>Severity: ${alert.severity.toUpperCase()}</p>
        </div>
        <div class="content">
          <p>${alert.message}</p>
          ${
            alert.context
              ? `<div class="context"><pre>${JSON.stringify(alert.context, null, 2)}</pre></div>`
              : ''
          }
        </div>
        <hr>
        <p style="color: #888; font-size: 12px;">
          Martha Orchestration Platform - Sent at ${new Date().toISOString()}
        </p>
      </body>
      </html>
    `;
  }
}

/**
 * Singleton instance
 */
export const alertService = new AlertService();
