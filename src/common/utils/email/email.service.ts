import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;
  private isInitialized = false;
  private isEmailEnabled = true;
  private maxRetryAttempts = 3;
  private retryDelay = 5000;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    try {
      await this.initializeWithRetry();
    } catch (error) {
      this.logger.warn(
        `Email service initialization failed after retries. Email functionality will be disabled. Error: ${error.message}`,
      );
      this.isInitialized = false;
      this.isEmailEnabled = false;

      this.logDiagnosticInfo();
    }
  }

  private async initializeWithRetry(retryCount = 0): Promise<void> {
    try {
      await this.initializeTransporter();
      this.isInitialized = true;
      this.isEmailEnabled = true;
      this.logger.log('Email service initialized successfully');
    } catch (error) {
      if (retryCount < this.maxRetryAttempts) {
        const nextRetry = retryCount + 1;
        this.logger.warn(
          `Email initialization failed (attempt ${nextRetry}/${this.maxRetryAttempts}). Retrying in ${this.retryDelay / 1000} seconds...`,
        );

        await new Promise((resolve) => setTimeout(resolve, this.retryDelay));
        return this.initializeWithRetry(nextRetry);
      }
      throw error;
    }
  }

  private async initializeTransporter(): Promise<void> {
    const host = this.configService.get<string>(
      'SMTP_HOST',
      'mail.naksyetu.co.ke',
    );
    const port = parseInt(this.configService.get<string>('SMTP_PORT') || '465');
    const username = this.configService.get<string>('SMTP_USERNAME');
    const password = this.configService.get<string>('SMTP_PASSWORD');

    if (!username || !password) {
      throw new Error('SMTP_USERNAME or SMTP_PASSWORD not configured');
    }

    const isPort465 = port === 465;
    const secure =
      this.configService.get<string>('SMTP_SECURE') === 'true' || isPort465;

    const config: nodemailer.TransportOptions = {
      host,
      port,
      secure,
      auth: {
        user: username,
        pass: password,
      },
      tls: {
        rejectUnauthorized: false,
      },

      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 30000,
    };

    this.logger.log('Initializing cPanel email transporter', {
      host,
      port,
      secure,
      authUser: username,
      hasPassword: !!password,
    });

    this.transporter = nodemailer.createTransport(config);
    await this.verifyTransporter();
  }

  private async verifyTransporter(): Promise<void> {
    try {
      await this.transporter.verify();
      this.logger.log('cPanel email transporter verified successfully');
    } catch (error) {
      this.logger.error('Email transporter verification failed', {
        message: error.message,
        code: error.code,
      });

      if (error.code === 'EAUTH') {
        this.logger.error('cPanel SMTP authentication failed. Please check:');
        this.logger.error('1. Email credentials in cPanel are correct');
        this.logger.error('2. SMTP service is enabled in cPanel');
        this.logger.error(
          "3. You're using full email address as username (e.g., info@naksyetu.co.ke)",
        );
      } else if (error.code === 'ECONNREFUSED') {
        this.logger.error(
          `Connection refused. Check if ${this.configService.get<string>('SMTP_HOST')} is accessible from your server.`,
        );
      }

      throw error;
    }
  }

  async sendEmail(
    to: string,
    subject: string,
    htmlContent: string,
    attachments?: nodemailer.SendMailOptions['attachments'],
    headers?: Record<string, string>,
  ): Promise<boolean> {
    if (!this.isEmailEnabled) {
      this.logger.warn(`Email service disabled. Skipping email to: ${to}`);
      return false;
    }

    if (!this.isInitialized) {
      this.logger.warn(
        'Email service not initialized. Attempting lazy initialization...',
      );
      try {
        await this.initializeTransporter();
        this.isInitialized = true;
        this.isEmailEnabled = true;
      } catch (error) {
        this.logger.error(
          'Lazy initialization failed. Email will not be sent.',
          error.message,
        );
        this.isEmailEnabled = false;
        return false;
      }
    }

    try {
      const fromName = this.configService.get<string>('SMTP_FROM_NAME', 'RHMS');
      const fromAddress =
        this.configService.get<string>('EMAIL_FROM') ||
        this.configService.get<string>('SMTP_USERNAME', 'info@naksyetu.co.ke');

      const mailOptions: nodemailer.SendMailOptions = {
        from: `"${fromName}" <${fromAddress}>`,
        to,
        subject,
        html: htmlContent,
        attachments,
        headers: headers || {},

        messageId: `<${Date.now()}.${Math.random().toString(36).substr(2)}@naksyetu.co.ke>`,
      };

      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email sent successfully to: ${to}`);
      return true;
    } catch (error) {
      this.logger.error('Failed to send email', {
        to,
        subject,
        error: error.message,
        code: error.code,
      });

      if (error.code === 'EAUTH') {
        this.logger.error(
          'Authentication error detected. Disabling email service.',
        );
        this.isEmailEnabled = false;
        this.isInitialized = false;
      }

      if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
        this.logger.warn(
          'Network error. Email service remains enabled for next attempt.',
        );
      }

      return false;
    }
  }

  getEmailServiceStatus() {
    const host = this.configService.get<string>(
      'SMTP_HOST',
      'mail.naksyetu.co.ke',
    );
    const username = this.configService.get<string>('SMTP_USERNAME');

    return {
      isInitialized: this.isInitialized,
      isEmailEnabled: this.isEmailEnabled,
      host,
      usernameConfigured: !!username,
      maxRetryAttempts: this.maxRetryAttempts,
      timestamp: new Date().toISOString(),
    };
  }

  async retryInitialization(): Promise<boolean> {
    this.logger.log('Attempting to reinitialize email service...');

    try {
      await this.initializeTransporter();
      this.isInitialized = true;
      this.isEmailEnabled = true;
      this.logger.log('Email service reinitialized successfully');
      return true;
    } catch (error) {
      this.logger.error('Failed to reinitialize email service', error.message);
      return false;
    }
  }

  setEmailEnabled(enabled: boolean): void {
    this.isEmailEnabled = enabled;
    this.logger.log(
      `Email service manually ${enabled ? 'enabled' : 'disabled'}`,
    );
  }

  private logDiagnosticInfo(): void {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<string>('SMTP_PORT');
    const username = this.configService.get<string>('SMTP_USERNAME');
    const passwordSet = !!this.configService.get<string>('SMTP_PASSWORD');

    this.logger.debug('Email configuration diagnostic:', {
      host: host || 'NOT SET',
      port: port || 'NOT SET (default: 465)',
      username: username ? 'SET' : 'NOT SET',
      password: passwordSet ? 'SET' : 'NOT SET',
      nodeEnv: process.env.NODE_ENV,
    });
  }

  async sendEmailWithFallback(
    to: string,
    subject: string,
    htmlContent: string,
    attachments?: nodemailer.SendMailOptions['attachments'],
  ): Promise<{ success: boolean; method: 'email' | 'fallback' }> {
    const emailSent = await this.sendEmail(
      to,
      subject,
      htmlContent,
      attachments,
    );

    if (!emailSent) {
      this.logger.warn(`Email failed for ${to}`);

      console.warn('EMAIL FAILED - FALLBACK NEEDED:', {
        to,
        subject,
        timestamp: new Date().toISOString(),
      });

      return { success: false, method: 'fallback' };
    }

    return { success: true, method: 'email' };
  }
}
