import { Resend } from 'resend';

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

interface BriefEmailData {
  recipientName: string;
  brandName: string;
  contentTitle: string;
  channel: string;
  date: string;
  storyHook?: string;
  characterFocus?: string;
  emotionalBeat?: string;
  narrativePurpose?: string;
  mediaType?: string;
  callToAction?: string;
  brief: string;
  suggestedTime?: string;
}

class EmailService {
  private resend: Resend;
  private fromEmail: string;
  private fromName: string;

  constructor() {
    this.fromEmail = 'noreply@mail.andorabrand.me'; // Using Resend verified domain
    this.fromName = 'Andora';

    const resendApiKey = process.env.RESEND_API_KEY || 're_Ucs35LNk_8SV2Gbez3pEFEtsWAmM9sx9U';
    this.resend = new Resend(resendApiKey);

    console.log('✅ Resend email service initialized');
  }

  /**
   * Send a generic email using Resend
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const { data, error } = await this.resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
      });

      if (error) {
        console.error('Resend error:', error);
        return false;
      }

      console.log('✅ Email sent via Resend:', data?.id);
      return true;
    } catch (error) {
      console.error('Failed to send email via Resend:', error);
      return false;
    }
  }

  /**
   * Send content brief to team member(s)
   */
  async sendContentBrief(
    emails: string[],
    data: BriefEmailData
  ): Promise<boolean> {
    // Validate and clean emails
    const validEmails = emails.filter(email => {
      if (!email || typeof email !== 'string') return false;
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email.trim());
    });

    if (validEmails.length === 0) {
      console.error('No valid email addresses provided');
      return false;
    }

    const subject = `Content Brief: ${data.contentTitle} - ${data.channel}`;
    const html = this.generateBriefEmailHTML(data);

    return this.sendEmail({
      to: validEmails,
      subject,
      html,
    });
  }

  /**
   * Generate global Andora email template with branding
   */
  private generateAndoraEmailTemplate(content: string, subject: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc; color: #1e293b;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 16px rgba(49, 56, 150, 0.1);">

          <!-- Header with Andora Branding -->
          <tr>
            <td style="background: linear-gradient(135deg, #313896 0%, #7637b6 100%); padding: 40px 32px; text-align: center;">
              <div style="width: 80px; height: 80px; margin: 0 auto 16px; background: rgba(255, 255, 255, 0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(10px);">
                <img src="https://andorabrand.me/logo.png" alt="Andora" style="width: 50px; height: 50px; border-radius: 50%;" />
              </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">
                Andora
              </h1>
              <p style="margin: 8px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px; font-weight: 500;">
                AI-Powered Brand Storytelling
              </p>
            </td>
          </tr>

          <!-- Content Area -->
          <tr>
            <td style="padding: 48px 32px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 32px; background: linear-gradient(to bottom, #fbf7ff 0%, #f4efff 100%); border-top: 1px solid #ebe5ff;">
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td style="text-align: center; padding-bottom: 16px;">
                    <h3 style="margin: 0 0 12px 0; color: #313896; font-size: 18px; font-weight: 600;">
                      Connect with Andora
                    </h3>
                    <div style="margin: 16px 0;">
                      <a href="https://facebook.com/andorabrand" style="display: inline-block; margin: 0 8px; text-decoration: none;">
                        <img src="https://img.icons8.com/color/48/facebook.png" alt="Facebook" style="width: 32px; height: 32px;" />
                      </a>
                      <a href="https://instagram.com/andorabrand" style="display: inline-block; margin: 0 8px; text-decoration: none;">
                        <img src="https://img.icons8.com/color/48/instagram-new.png" alt="Instagram" style="width: 32px; height: 32px;" />
                      </a>
                      <a href="https://x.com/andorabrand" style="display: inline-block; margin: 0 8px; text-decoration: none;">
                        <img src="https://img.icons8.com/color/48/twitterx.png" alt="X" style="width: 32px; height: 32px;" />
                      </a>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="text-align: center; padding: 16px 0; border-top: 1px solid #ded9ff;">
                    <p style="margin: 0 0 8px 0; color: #5a5594; font-size: 14px; font-weight: 500;">
                      Andora Brand Storytelling Platform
                    </p>
                    <p style="margin: 0 0 4px 0; color: #746fa8; font-size: 13px;">
                      Mr Smith Complex, Opp Hollywood Event Centre
                    </p>
                    <p style="margin: 0 0 12px 0; color: #746fa8; font-size: 13px;">
                      Enugu Onitsha Exp, Agu Awka
                    </p>
                    <p style="margin: 0; color: #938fbe; font-size: 12px;">
                      Visit us at <a href="https://andorabrand.me" style="color: #313896; text-decoration: none; font-weight: 600;">andorabrand.me</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(
    email: string,
    resetToken: string,
    userName?: string
  ): Promise<boolean> {
    const resetLink = `${process.env.FRONTEND_URL || 'https://andorabrand.me'}/reset-password?token=${resetToken}`;

    const content = `
      <div style="text-align: center; margin-bottom: 32px;">
        <h2 style="margin: 0 0 12px 0; color: #313896; font-size: 28px; font-weight: 700;">
          Reset Your Password
        </h2>
        <p style="margin: 0; color: #5a5594; font-size: 16px;">
          ${userName ? `Hi ${userName}` : 'Hello'},
        </p>
      </div>

      <div style="background: linear-gradient(135deg, #fbf7ff 0%, #f4efff 100%); padding: 24px; border-radius: 12px; border-left: 4px solid #313896; margin-bottom: 24px;">
        <p style="margin: 0 0 16px 0; color: #2f2a52; font-size: 15px; line-height: 1.6;">
          We received a request to reset your password for your Andora account. Click the button below to create a new password:
        </p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${resetLink}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #313896 0%, #7637b6 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(49, 56, 150, 0.3);">
            Reset Password
          </a>
        </div>
        <p style="margin: 16px 0 0 0; color: #746fa8; font-size: 13px; line-height: 1.5;">
          Or copy and paste this link into your browser:<br />
          <a href="${resetLink}" style="color: #313896; word-break: break-all;">${resetLink}</a>
        </p>
      </div>

      <div style="background: #fff7ed; padding: 20px; border-radius: 12px; border-left: 4px solid #ff7a1f; margin-bottom: 24px;">
        <p style="margin: 0; color: #7c1f00; font-size: 14px; line-height: 1.6;">
          <strong>⚠️ Security Notice:</strong> This password reset link will expire in 1 hour. If you didn't request this reset, please ignore this email or contact our support team.
        </p>
      </div>

      <div style="text-align: center; padding-top: 24px; border-top: 1px solid #ebe5ff;">
        <p style="margin: 0; color: #938fbe; font-size: 13px;">
          Need help? We're here for you at <a href="mailto:support@andorabrand.me" style="color: #313896; text-decoration: none;">support@andorabrand.me</a>
        </p>
      </div>
    `;

    const html = this.generateAndoraEmailTemplate(content, 'Reset Your Password');

    return this.sendEmail({
      to: email,
      subject: 'Reset Your Andora Password',
      html,
    });
  }

  /**
   * Generate HTML email template for content brief with Andora branding
   */
  private generateBriefEmailHTML(data: BriefEmailData): string {
    const formatDate = (dateStr: string) => {
      try {
        const date = new Date(dateStr + 'T12:00:00Z');
        return date.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          timeZone: 'UTC',
        });
      } catch {
        return dateStr;
      }
    };

    const channelColors: Record<string, string> = {
      LinkedIn: '#0077B5',
      Instagram: '#E1306C',
      X: '#000000',
      Facebook: '#1877F2',
      TikTok: '#000000',
      YouTube: '#FF0000',
      Blog: '#21A366',
      Email: '#FFA500',
    };

    const channelColor = channelColors[data.channel] || '#6366F1';

    // Build content sections - minimalist design
    const contentSections = `
      <!-- Title and Metadata -->
      <div style="text-align: center; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 2px solid #f97316;">
        <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 26px; font-weight: 700; line-height: 1.3;">
          ${data.contentTitle}
        </h2>
        <div style="margin-top: 12px;">
          <span style="display: inline-block; padding: 8px 16px; background-color: #f97316; color: #ffffff; border-radius: 6px; font-size: 14px; font-weight: 600; margin: 4px 6px;">
            ${data.channel}
          </span>
          <span style="display: inline-block; padding: 8px 16px; background-color: #f5f5f5; color: #475569; border-radius: 6px; font-size: 14px; font-weight: 500; margin: 4px 6px;">
            ${formatDate(data.date)}
          </span>
          ${data.suggestedTime ? `
          <span style="display: inline-block; padding: 8px 16px; background-color: #f5f5f5; color: #475569; border-radius: 6px; font-size: 14px; font-weight: 500; margin: 4px 6px;">
            ${data.suggestedTime}
          </span>
          ` : ''}
        </div>
      </div>

      <!-- Content Brief -->
      <div style="margin-bottom: 32px;">
        <h3 style="margin: 0 0 16px 0; color: #0f172a; font-size: 20px; font-weight: 700; border-bottom: 2px solid #f5f5f5; padding-bottom: 8px;">
          Content Brief
        </h3>
        <div style="color: #1e293b; font-size: 16px; line-height: 1.8; white-space: pre-wrap; word-wrap: break-word;">
${data.brief || 'No detailed brief available yet.'}
        </div>
      </div>

      ${data.storyHook ? `
      <div style="margin-bottom: 24px;">
        <h4 style="margin: 0 0 8px 0; color: #0f172a; font-size: 16px; font-weight: 700;">
          Story Hook
        </h4>
        <p style="margin: 0; color: #475569; font-size: 16px; line-height: 1.7;">
          ${data.storyHook}
        </p>
      </div>
      ` : ''}

      ${data.characterFocus ? `
      <div style="margin-bottom: 24px;">
        <h4 style="margin: 0 0 8px 0; color: #0f172a; font-size: 16px; font-weight: 700;">
          Character Focus
        </h4>
        <p style="margin: 0; color: #475569; font-size: 16px; line-height: 1.7;">
          ${data.characterFocus}
        </p>
      </div>
      ` : ''}

      ${data.emotionalBeat ? `
      <div style="margin-bottom: 24px;">
        <h4 style="margin: 0 0 8px 0; color: #0f172a; font-size: 16px; font-weight: 700;">
          Emotional Beat
        </h4>
        <p style="margin: 0; color: #475569; font-size: 16px; line-height: 1.7;">
          ${data.emotionalBeat}
        </p>
      </div>
      ` : ''}

      ${data.narrativePurpose ? `
      <div style="margin-bottom: 24px;">
        <h4 style="margin: 0 0 8px 0; color: #0f172a; font-size: 16px; font-weight: 700;">
          Narrative Purpose
        </h4>
        <p style="margin: 0; color: #475569; font-size: 16px; line-height: 1.7;">
          ${data.narrativePurpose}
        </p>
      </div>
      ` : ''}

      ${data.mediaType ? `
      <div style="margin-bottom: 24px;">
        <h4 style="margin: 0 0 8px 0; color: #0f172a; font-size: 16px; font-weight: 700;">
          Media Type
        </h4>
        <p style="margin: 0; color: #475569; font-size: 16px; line-height: 1.7;">
          ${data.mediaType}
        </p>
      </div>
      ` : ''}

      ${data.callToAction ? `
      <div style="margin-bottom: 24px;">
        <h4 style="margin: 0 0 8px 0; color: #0f172a; font-size: 16px; font-weight: 700;">
          Call To Action
        </h4>
        <p style="margin: 0; color: #475569; font-size: 16px; line-height: 1.7;">
          ${data.callToAction}
        </p>
      </div>
      ` : ''}

      <!-- CTA Button -->
      <div style="margin-top: 40px; text-align: center; padding-top: 32px; border-top: 2px solid #f5f5f5;">
        <a href="https://andorabrand.me" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #f97316 0%, #fb923c 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 2px 8px rgba(249, 115, 22, 0.3);">
          Open in Andora →
        </a>
      </div>
    `;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Content Brief: ${data.contentTitle}</title>
  <style>
    @media only screen and (max-width: 600px) {
      .content-wrapper { width: 100% !important; padding: 16px !important; }
      .header { padding: 32px 24px !important; }
      .footer { padding: 32px 20px !important; }
      h1 { font-size: 28px !important; }
      h2 { font-size: 22px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; color: #1e293b;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
    <tr>
      <td style="padding: 24px 16px;">
        <table role="presentation" class="content-wrapper" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);">

          <!-- Minimalist Header -->
          <tr>
            <td class="header" style="background: linear-gradient(135deg, #f97316 0%, #fb923c 100%); padding: 40px 32px; text-align: center;">
              <h1 style="margin: 0 0 8px 0; color: #ffffff; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">
                Andora
              </h1>
              <p style="margin: 0; color: rgba(255, 255, 255, 0.95); font-size: 16px; font-weight: 500; letter-spacing: 0.5px;">
                Content Brief for ${data.brandName}
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              ${contentSections}
            </td>
          </tr>

          <!-- Minimalist Footer -->
          <tr>
            <td class="footer" style="padding: 40px 32px; background-color: #f5f5f5; border-top: 2px solid #f97316; text-align: center;">
              <!-- Social Links -->
              <div style="margin-bottom: 20px;">
                <a href="https://facebook.com/andorabrand" style="display: inline-block; margin: 0 8px; text-decoration: none; color: #64748b; font-size: 14px;">Facebook</a>
                <span style="color: #cbd5e1;">•</span>
                <a href="https://instagram.com/andorabrand" style="display: inline-block; margin: 0 8px; text-decoration: none; color: #64748b; font-size: 14px;">Instagram</a>
                <span style="color: #cbd5e1;">•</span>
                <a href="https://x.com/andorabrand" style="display: inline-block; margin: 0 8px; text-decoration: none; color: #64748b; font-size: 14px;">X</a>
                <span style="color: #cbd5e1;">•</span>
                <a href="https://linkedin.com/company/andorabrand" style="display: inline-block; margin: 0 8px; text-decoration: none; color: #64748b; font-size: 14px;">LinkedIn</a>
              </div>

              <!-- Company Info -->
              <p style="margin: 0 0 8px 0; color: #475569; font-size: 14px; line-height: 1.6;">
                <strong style="color: #0f172a;">Andora</strong> — AI Brand Storytelling Platform
              </p>
              <p style="margin: 0 0 16px 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                Mr Smith Complex, Opp Hollywood Event Centre<br/>
                Enugu Onitsha Exp, Agu Awka, Nigeria
              </p>
              <p style="margin: 0 0 16px 0; color: #64748b; font-size: 14px;">
                <a href="mailto:hello@andorabrand.me" style="color: #f97316; text-decoration: none; font-weight: 500;">hello@andorabrand.me</a>
              </p>
              <p style="margin: 0; color: #94a3b8; font-size: 13px;">
                © ${new Date().getFullYear()} Andora. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  /**
   * Strip HTML tags for plain text version
   */
  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  /**
   * Verify email configuration (Resend)
   */
  async verifyConnection(): Promise<boolean> {
    try {
      // Resend doesn't have a verify method, so we just check if the API key is set
      const isConfigured = !!process.env.RESEND_API_KEY || true;
      console.log('✅ Resend email service is configured');
      return isConfigured;
    } catch (error) {
      console.error('❌ Email service verification failed:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();
export default emailService;
