import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

class MailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '465'),
      secure: true, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendMail(to: string, subject: string, html: string) {
    try {
      const info = await this.transporter.sendMail({
        from: `"ClipForge AI" <${process.env.SMTP_USER}>`,
        to,
        subject,
        html,
      });
      console.log('Message sent: %s', info.messageId);
      return info;
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  async sendForgotPasswordEmail(to: string, resetToken: string) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0d0d0d; color: #fff; padding: 20px; border-radius: 10px;">
        <h2 style="color: #00e5ff; text-align: center;">ClipForge AI Password Reset</h2>
        <p>You requested a password reset for your admin account.</p>
        <p>Click the button below to reset your password. This link is valid for 1 hour.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #00e5ff; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
        </div>
        <p style="color: #888; font-size: 12px; text-align: center;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `;
    return this.sendMail(to, 'Reset Your Password - ClipForge AI', html);
  }

  async sendVerificationEmail(to: string, token: string) {
    const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0d0d0d; color: #fff; padding: 20px; border-radius: 10px;">
        <h2 style="color: #00e5ff; text-align: center;">Welcome to ClipForge AI</h2>
        <p>Please verify your email address to complete your registration.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyUrl}" style="background-color: #00e5ff; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Verify Email</a>
        </div>
      </div>
    `;
    return this.sendMail(to, 'Verify Your Email - ClipForge AI', html);
  }

  async sendSubscriptionConfirmation(to: string, planName: string) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0d0d0d; color: #fff; padding: 20px; border-radius: 10px;">
        <h2 style="color: #00e5ff; text-align: center;">Subscription Activated!</h2>
        <p>Thank you for subscribing to the <strong>${planName}</strong> plan.</p>
        <p>You now have access to premium features on ClipForge AI.</p>
      </div>
    `;
    return this.sendMail(to, 'Subscription Confirmation - ClipForge AI', html);
  }
}

export const mailService = new MailService();
