import nodemailer from 'nodemailer';

// Create transporter - only if SMTP is configured
let transporter: nodemailer.Transporter | null = null;

/**
 * Initializes the email transporter. Safe to call even if SMTP is not configured.
 */
function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter;

  // Only create transporter if SMTP_HOST is configured
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpHost || !smtpUser || !smtpPass) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: parseInt(process.env.SMTP_PORT ?? '587', 10),
    secure: false,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  return transporter;
}

/**
 * Sends an email. Fails silently if SMTP is not configured or sending fails.
 */
async function sendMail(to: string, subject: string, html: string): Promise<boolean> {
  const transport = getTransporter();
  if (!transport) {
    console.log(`[Email] SMTP not configured, skipping email to ${to}: ${subject}`);
    return false;
  }

  try {
    await transport.sendMail({
      from: process.env.SMTP_USER,
      to,
      subject,
      html,
    });
    console.log(`[Email] Sent to ${to}: ${subject}`);
    return true;
  } catch (error) {
    console.error(`[Email] Failed to send to ${to}:`, error);
    return false;
  }
}

// --- Email Templates ---------------------------------------------------------

function baseTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f4f5f7; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .card { background: white; border-radius: 8px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .header { color: #4f46e5; font-size: 20px; font-weight: 600; margin-bottom: 16px; }
    .content { color: #374151; font-size: 14px; line-height: 1.6; }
    .issue-key { display: inline-block; background: #eef2ff; color: #4338ca; padding: 2px 8px; border-radius: 4px; font-weight: 600; font-size: 12px; }
    .btn { display: inline-block; background: #4f46e5; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 500; font-size: 14px; margin-top: 16px; }
    .footer { text-align: center; color: #9ca3af; font-size: 12px; margin-top: 24px; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; }
    .badge-status { background: #dbeafe; color: #1d4ed8; }
    .badge-priority { background: #fef3c7; color: #92400e; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      ${content}
    </div>
    <div class="footer">
      <p>Trackly &mdash; Project Management</p>
      <p>You received this email because of your notification settings.</p>
    </div>
  </div>
</body>
</html>`;
}

// --- Public API --------------------------------------------------------------

/**
 * Sends an email notification when a user is assigned to an issue.
 */
export async function sendAssignmentEmail(
  to: string,
  assigneeName: string,
  issueKey: string,
  issueTitle: string,
  assignedBy: string,
  issueUrl: string,
): Promise<void> {
  const html = baseTemplate(`
    <div class="header">You've been assigned an issue</div>
    <div class="content">
      <p>Hi ${assigneeName},</p>
      <p><strong>${assignedBy}</strong> assigned you to:</p>
      <p>
        <span class="issue-key">${issueKey}</span>
        <strong>${issueTitle}</strong>
      </p>
      <a href="${issueUrl}" class="btn">View Issue</a>
    </div>
  `);

  await sendMail(to, `[${issueKey}] You were assigned: ${issueTitle}`, html);
}

/**
 * Sends an email notification when someone comments on an issue.
 */
export async function sendCommentEmail(
  to: string,
  recipientName: string,
  issueKey: string,
  issueTitle: string,
  commenterName: string,
  commentPreview: string,
  issueUrl: string,
): Promise<void> {
  const preview = commentPreview.length > 200
    ? commentPreview.substring(0, 200) + '...'
    : commentPreview;

  const html = baseTemplate(`
    <div class="header">New comment on ${issueKey}</div>
    <div class="content">
      <p>Hi ${recipientName},</p>
      <p><strong>${commenterName}</strong> commented on:</p>
      <p>
        <span class="issue-key">${issueKey}</span>
        <strong>${issueTitle}</strong>
      </p>
      <blockquote style="border-left: 3px solid #e5e7eb; padding-left: 12px; margin: 12px 0; color: #6b7280;">
        ${preview}
      </blockquote>
      <a href="${issueUrl}" class="btn">View Comment</a>
    </div>
  `);

  await sendMail(to, `[${issueKey}] New comment: ${issueTitle}`, html);
}

/**
 * Sends an email notification when an issue's status changes.
 */
export async function sendStatusChangeEmail(
  to: string,
  recipientName: string,
  issueKey: string,
  issueTitle: string,
  changedBy: string,
  oldStatus: string,
  newStatus: string,
  issueUrl: string,
): Promise<void> {
  const html = baseTemplate(`
    <div class="header">Status updated on ${issueKey}</div>
    <div class="content">
      <p>Hi ${recipientName},</p>
      <p><strong>${changedBy}</strong> changed the status of:</p>
      <p>
        <span class="issue-key">${issueKey}</span>
        <strong>${issueTitle}</strong>
      </p>
      <p>
        <span class="badge badge-status">${oldStatus}</span>
        &rarr;
        <span class="badge badge-status">${newStatus}</span>
      </p>
      <a href="${issueUrl}" class="btn">View Issue</a>
    </div>
  `);

  await sendMail(to, `[${issueKey}] Status changed to ${newStatus}`, html);
}

/**
 * Sends an email notification when a user is mentioned in a comment.
 */
export async function sendMentionEmail(
  to: string,
  recipientName: string,
  issueKey: string,
  issueTitle: string,
  mentionedBy: string,
  commentPreview: string,
  issueUrl: string,
): Promise<void> {
  const preview = commentPreview.length > 200
    ? commentPreview.substring(0, 200) + '...'
    : commentPreview;

  const html = baseTemplate(`
    <div class="header">You were mentioned in ${issueKey}</div>
    <div class="content">
      <p>Hi ${recipientName},</p>
      <p><strong>${mentionedBy}</strong> mentioned you in a comment on:</p>
      <p>
        <span class="issue-key">${issueKey}</span>
        <strong>${issueTitle}</strong>
      </p>
      <blockquote style="border-left: 3px solid #e5e7eb; padding-left: 12px; margin: 12px 0; color: #6b7280;">
        ${preview}
      </blockquote>
      <a href="${issueUrl}" class="btn">View Comment</a>
    </div>
  `);

  await sendMail(to, `[${issueKey}] You were mentioned: ${issueTitle}`, html);
}

/**
 * Sends a password reset email.
 */
export async function sendPasswordResetEmail(
  to: string,
  userName: string,
  resetUrl: string,
): Promise<void> {
  const html = baseTemplate(`
    <div class="header">Password Reset</div>
    <div class="content">
      <p>Hi ${userName},</p>
      <p>We received a request to reset your password. Click the button below to set a new password:</p>
      <a href="${resetUrl}" class="btn">Reset Password</a>
      <p style="margin-top: 16px; color: #6b7280; font-size: 12px;">
        This link expires in 1 hour. If you didn't request this, you can safely ignore this email.
      </p>
    </div>
  `);

  await sendMail(to, 'Trackly - Password Reset', html);
}
