import nodemailer, { Transporter, SendMailOptions } from 'nodemailer';

export interface EmailServiceStatus {
  configured: boolean;
  provider: string;
  fromAddress: string;
}

export interface TeamInvitationEmailParams {
  to: string;
  memberName: string;
  teamName: string;
  eventTitle: string;
  eventDate?: string;
  eventVenue?: string;
  leaderName: string;
  leaderEmail: string;
  token: string;
  expiresAt: string;
  appBaseUrl?: string;
}

export interface InvitationAcceptedEmailParams {
  leaderEmail: string;
  leaderName: string;
  memberName: string;
  memberEmail: string;
  teamName: string;
  eventTitle: string;
  isTeamFullyConfirmed: boolean;
}

export interface InvitationDeclinedEmailParams {
  leaderEmail: string;
  leaderName: string;
  memberName: string;
  memberEmail: string;
  teamName: string;
  eventTitle: string;
  reason?: string;
}

export interface InvitationExpiredEmailParams {
  leaderEmail: string;
  leaderName: string;
  memberName: string;
  teamName: string;
  eventTitle: string;
}

export interface RegistrationConfirmedEmailParams {
  to: string;
  recipientName: string;
  teamName?: string;
  eventTitle: string;
  ticketId: string;
  eventDate?: string;
  eventVenue?: string;
}

class EmailService {
  private transporter: Transporter | null = null;
  private fromAddress: string = 'EventHub <notifications@eventhub.com>';

  constructor() {
    this.initTransporter();
  }

  public initTransporter() {
    const host = process.env.SMTP_HOST || process.env.EMAIL_HOST;
    const user = process.env.SMTP_USER || process.env.EMAIL_USER;
    const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
    const port = Number(process.env.SMTP_PORT || process.env.EMAIL_PORT || 587);
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;

    this.fromAddress = process.env.SMTP_FROM || process.env.EMAIL_FROM || 'EventHub <notifications@eventhub.com>';

    if (host && (user || pass)) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: user ? { user, pass: pass || '' } : undefined
      });
    } else {
      this.transporter = null;
    }
  }

  public isConfigured(): boolean {
    if (process.env.EMAIL_SIMULATE === 'true') {
      return true;
    }
    return this.transporter !== null;
  }

  public getStatus(): EmailServiceStatus {
    return {
      configured: this.isConfigured(),
      provider: process.env.EMAIL_SIMULATE === 'true' ? 'Simulated Dev Transport' : (this.transporter ? 'SMTP' : 'Unconfigured'),
      fromAddress: this.fromAddress
    };
  }

  private getBaseUrl(explicitUrl?: string): string {
    if (explicitUrl) return explicitUrl.replace(/\/$/, '');
    if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL.replace(/\/$/, '');
    return 'http://localhost:3000';
  }

  private async deliverMail(mailOptions: SendMailOptions): Promise<{ messageId: string; delivered: boolean }> {
    if (process.env.EMAIL_SIMULATE === 'true') {
      const mockId = `sim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      return { messageId: mockId, delivered: true };
    }

    if (!this.transporter) {
      throw new Error(
        'Email service is not configured (SMTP credentials missing in environment variables). Invitation saved in database, but email delivery could not be performed.'
      );
    }

    const info = await this.transporter.sendMail({
      from: this.fromAddress,
      ...mailOptions
    });

    return { messageId: info.messageId, delivered: true };
  }

  /**
   * 1. Send Team Invitation Email with Accept and Decline actions
   */
  public async sendTeamInvitation(params: TeamInvitationEmailParams): Promise<{ messageId: string; delivered: boolean }> {
    const baseUrl = this.getBaseUrl(params.appBaseUrl);
    const acceptUrl = `${baseUrl}/invitations/${params.token}?action=accept`;
    const declineUrl = `${baseUrl}/invitations/${params.token}?action=decline`;
    const expiryFormatted = new Date(params.expiresAt).toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Team Invitation - EventHub</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 32px 28px; text-align: center; color: #ffffff;">
      <div style="font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">EventHub</div>
      <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.9;">Team Registration Invitation</p>
    </div>

    <!-- Body Content -->
    <div style="padding: 32px 28px;">
      <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #0f172a;">You've Been Invited to Join a Team!</h2>
      <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: #475569;">
        Hello <strong>${escapeHtml(params.memberName)}</strong>,<br/><br/>
        <strong>${escapeHtml(params.leaderName)}</strong> (${escapeHtml(params.leaderEmail)}) has registered a team for <strong>${escapeHtml(params.eventTitle)}</strong> and invited you to participate as a team member.
      </p>

      <!-- Event & Team Summary Card -->
      <div style="background-color: #f1f5f9; border-radius: 12px; padding: 20px; margin-bottom: 24px; border-left: 4px solid #4f46e5;">
        <div style="margin-bottom: 10px;">
          <span style="font-size: 12px; text-transform: uppercase; font-weight: 700; color: #64748b; letter-spacing: 0.5px;">Event</span>
          <div style="font-size: 16px; font-weight: 700; color: #1e293b; margin-top: 2px;">${escapeHtml(params.eventTitle)}</div>
        </div>
        <div style="margin-bottom: 10px;">
          <span style="font-size: 12px; text-transform: uppercase; font-weight: 700; color: #64748b; letter-spacing: 0.5px;">Team Name</span>
          <div style="font-size: 15px; font-weight: 600; color: #334155; margin-top: 2px;">${escapeHtml(params.teamName)}</div>
        </div>
        <div style="margin-bottom: 10px;">
          <span style="font-size: 12px; text-transform: uppercase; font-weight: 700; color: #64748b; letter-spacing: 0.5px;">Team Leader</span>
          <div style="font-size: 14px; color: #334155; margin-top: 2px;">${escapeHtml(params.leaderName)}</div>
        </div>
        ${params.eventDate ? `
        <div style="margin-bottom: 10px;">
          <span style="font-size: 12px; text-transform: uppercase; font-weight: 700; color: #64748b; letter-spacing: 0.5px;">Date & Time</span>
          <div style="font-size: 14px; color: #334155; margin-top: 2px;">${escapeHtml(params.eventDate)}</div>
        </div>` : ''}
        ${params.eventVenue ? `
        <div>
          <span style="font-size: 12px; text-transform: uppercase; font-weight: 700; color: #64748b; letter-spacing: 0.5px;">Venue</span>
          <div style="font-size: 14px; color: #334155; margin-top: 2px;">${escapeHtml(params.eventVenue)}</div>
        </div>` : ''}
      </div>

      <p style="margin: 0 0 24px 0; font-size: 14px; color: #64748b; line-height: 1.5;">
        Please respond by <strong>${expiryFormatted}</strong>. Your team's registration will remain pending until all required team members confirm.
      </p>

      <!-- Action Buttons -->
      <div style="text-align: center; margin: 30px 0 24px 0;">
        <a href="${acceptUrl}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; font-weight: 700; font-size: 15px; padding: 14px 32px; border-radius: 10px; text-decoration: none; margin-right: 12px; box-shadow: 0 4px 10px rgba(79, 70, 229, 0.3);">
          Accept Invitation
        </a>
        <a href="${declineUrl}" style="display: inline-block; background-color: #f1f5f9; color: #64748b; font-weight: 600; font-size: 14px; padding: 14px 24px; border-radius: 10px; text-decoration: none; border: 1px solid #cbd5e1;">
          Decline
        </a>
      </div>

      <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
        If you don't already have an EventHub account, clicking "Accept Invitation" will let you quickly register and join with your email (${escapeHtml(params.to)}).
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #f8fafc; padding: 16px 28px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
      &copy; ${new Date().getFullYear()} EventHub. All rights reserved. Secure invitation link valid for 48 hours.
    </div>
  </div>
</body>
</html>
    `;

    return this.deliverMail({
      to: params.to,
      subject: `Team Invitation: Join "${params.teamName}" for ${params.eventTitle}`,
      html
    });
  }

  /**
   * 2. Send Invitation Acceptance Notification to Team Leader
   */
  public async sendInvitationAcceptedNotification(params: InvitationAcceptedEmailParams): Promise<{ messageId: string; delivered: boolean }> {
    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
  <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
    <div style="background: #10b981; padding: 24px 28px; text-align: center; color: #ffffff;">
      <div style="font-size: 22px; font-weight: 800;">EventHub</div>
      <p style="margin: 4px 0 0 0; font-size: 14px;">Member Accepted Invitation</p>
    </div>
    <div style="padding: 28px;">
      <h3 style="margin-top: 0; color: #0f172a;">Great news, ${escapeHtml(params.leaderName)}!</h3>
      <p style="font-size: 15px; color: #475569; line-height: 1.6;">
        <strong>${escapeHtml(params.memberName)}</strong> (${escapeHtml(params.memberEmail)}) has accepted your invitation to join team <strong>"${escapeHtml(params.teamName)}"</strong> for <strong>${escapeHtml(params.eventTitle)}</strong>.
      </p>
      ${params.isTeamFullyConfirmed ? `
      <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px; padding: 16px; margin: 20px 0; color: #065f46;">
        <strong>🎉 Team Registration Confirmed!</strong><br/>
        All required members have accepted. Your official team ticket and QR passes are now active in your dashboard.
      </div>
      ` : `
      <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 16px; margin: 20px 0; color: #1e40af;">
        Your team registration is progressing. It will be fully confirmed once all remaining members accept.
      </div>
      `}
    </div>
    <div style="background-color: #f8fafc; padding: 14px 28px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
      &copy; ${new Date().getFullYear()} EventHub
    </div>
  </div>
</body>
</html>`;

    return this.deliverMail({
      to: params.leaderEmail,
      subject: `Team Member Accepted: ${params.memberName} joined "${params.teamName}"`,
      html
    });
  }

  /**
   * 3. Send Invitation Declined Notification to Team Leader
   */
  public async sendInvitationDeclinedNotification(params: InvitationDeclinedEmailParams): Promise<{ messageId: string; delivered: boolean }> {
    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
  <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
    <div style="background: #f59e0b; padding: 24px 28px; text-align: center; color: #ffffff;">
      <div style="font-size: 22px; font-weight: 800;">EventHub</div>
      <p style="margin: 4px 0 0 0; font-size: 14px;">Invitation Update</p>
    </div>
    <div style="padding: 28px;">
      <h3 style="margin-top: 0; color: #0f172a;">Notice for ${escapeHtml(params.leaderName)}</h3>
      <p style="font-size: 15px; color: #475569; line-height: 1.6;">
        <strong>${escapeHtml(params.memberName)}</strong> (${escapeHtml(params.memberEmail)}) has declined the invitation to join team <strong>"${escapeHtml(params.teamName)}"</strong> for <strong>${escapeHtml(params.eventTitle)}</strong>.
      </p>
      ${params.reason ? `<p style="font-size: 14px; color: #64748b; font-style: italic;">Note: "${escapeHtml(params.reason)}"</p>` : ''}
      <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 16px; margin: 20px 0; color: #92400e;">
        You can log into your Attendee Dashboard to replace this member or invite another participant if team size requirements allow.
      </div>
    </div>
    <div style="background-color: #f8fafc; padding: 14px 28px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
      &copy; ${new Date().getFullYear()} EventHub
    </div>
  </div>
</body>
</html>`;

    return this.deliverMail({
      to: params.leaderEmail,
      subject: `Team Invitation Declined: ${params.memberName} declined joining "${params.teamName}"`,
      html
    });
  }

  /**
   * 4. Send Team Registration Confirmation to Leader & Accepted Members
   */
  public async sendRegistrationConfirmed(params: RegistrationConfirmedEmailParams): Promise<{ messageId: string; delivered: boolean }> {
    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
  <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
    <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px 28px; text-align: center; color: #ffffff;">
      <div style="font-size: 24px; font-weight: 800;">EventHub</div>
      <p style="margin: 6px 0 0 0; font-size: 15px;">Registration Confirmed!</p>
    </div>
    <div style="padding: 28px;">
      <h2 style="margin-top: 0; color: #0f172a;">You're in, ${escapeHtml(params.recipientName)}!</h2>
      <p style="font-size: 15px; color: #475569; line-height: 1.6;">
        Your registration for <strong>${escapeHtml(params.eventTitle)}</strong> is officially confirmed.
        ${params.teamName ? `<br/>Team: <strong>${escapeHtml(params.teamName)}</strong>` : ''}
      </p>

      <div style="background: #f1f5f9; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid #10b981;">
        <div style="font-size: 12px; text-transform: uppercase; font-weight: 700; color: #64748b;">Ticket Code</div>
        <div style="font-size: 20px; font-weight: 800; color: #0f172a; letter-spacing: 1px; margin-top: 4px;">${escapeHtml(params.ticketId)}</div>
        ${params.eventDate ? `<div style="font-size: 14px; color: #475569; margin-top: 8px;">📅 ${escapeHtml(params.eventDate)}</div>` : ''}
        ${params.eventVenue ? `<div style="font-size: 14px; color: #475569; margin-top: 4px;">📍 ${escapeHtml(params.eventVenue)}</div>` : ''}
      </div>

      <p style="font-size: 14px; color: #64748b;">
        You can access your digital pass and QR code anytime from your EventHub Attendee Dashboard.
      </p>
    </div>
    <div style="background-color: #f8fafc; padding: 14px 28px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
      &copy; ${new Date().getFullYear()} EventHub
    </div>
  </div>
</body>
</html>`;

    return this.deliverMail({
      to: params.to,
      subject: `Registration Confirmed: ${params.eventTitle} (Ticket: ${params.ticketId})`,
      html
    });
  }
}

function escapeHtml(str?: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export const emailService = new EmailService();
