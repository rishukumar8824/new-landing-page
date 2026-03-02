const nodemailer = require('nodemailer');

const BRAND_NAME = String(process.env.APP_NAME || 'BITEGIT')
  .trim()
  .toUpperCase();
const BRAND_ACCENT = '#f0b90b';
const BRAND_DARK = '#181a20';
let providerConfigLogged = false;

function firstNonEmptyEnv(...values) {
  for (const value of values) {
    const normalized = String(value || '').trim();
    if (normalized) {
      return normalized;
    }
  }
  return '';
}

function escapeHtml(input) {
  return String(input || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildEmailShell({ title, subtitle, bodyHtml }) {
  return `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#111;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:20px 12px;">
      <tr>
        <td align="center">
          <table width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;background:#ffffff;border:1px solid #e5e7eb;">
            <tr>
              <td style="background:${BRAND_DARK};padding:20px 28px;">
                <div style="font-size:32px;font-weight:800;letter-spacing:0.5px;color:${BRAND_ACCENT};">${BRAND_NAME}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <h1 style="margin:0 0 10px;font-size:34px;line-height:1.1;color:#111;">${escapeHtml(title)}</h1>
                <p style="margin:0 0 22px;font-size:16px;line-height:1.5;color:#374151;">${escapeHtml(subtitle)}</p>
                ${bodyHtml}
                <p style="margin:28px 0 0;font-size:14px;line-height:1.6;color:#4b5563;"><em>This is an automated message, please do not reply.</em></p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 28px;border-top:1px solid #e5e7eb;">
                <p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:#4b5563;">
                  Keep your account secure. Never share verification codes with anyone.
                </p>
                <p style="margin:0;font-size:12px;line-height:1.5;color:#6b7280;">
                  © ${new Date().getUTCFullYear()} ${BRAND_NAME}. All rights reserved.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `.trim();
}

function resolveTransportConfig() {
  const resendApiKey = firstNonEmptyEnv(process.env.RESEND_API_KEY, process.env.RESEND);
  const resendFromEmail = firstNonEmptyEnv(
    process.env.RESEND_FROM_EMAIL,
    process.env.MAIL_FROM,
    process.env.SMTP_FROM_EMAIL
  );
  const smtpHost = firstNonEmptyEnv(process.env.SMTP_HOST);
  const smtpPortRaw = String(process.env.SMTP_PORT || '').trim();
  const smtpUser = firstNonEmptyEnv(process.env.SMTP_USER);
  const smtpPass = firstNonEmptyEnv(process.env.SMTP_PASS);
  const smtpFromEmail = firstNonEmptyEnv(process.env.SMTP_FROM_EMAIL, process.env.MAIL_FROM);
  const smtpSecureRaw = String(process.env.SMTP_SECURE || '')
    .trim()
    .toLowerCase();
  const gmailUser = firstNonEmptyEnv(process.env.GMAIL_USER);
  const gmailAppPassword = firstNonEmptyEnv(process.env.GMAIL_APP_PASSWORD);

  if (!providerConfigLogged) {
    providerConfigLogged = true;
    console.log('[auth-email] runtime provider env detection', {
      hasResendApiKey: Boolean(resendApiKey),
      hasResendFromEmail: Boolean(resendFromEmail),
      hasResendAliasKey: Boolean(String(process.env.RESEND || '').trim()),
      hasMailFromAlias: Boolean(String(process.env.MAIL_FROM || '').trim()),
      hasSmtpHost: Boolean(smtpHost),
      hasSmtpUser: Boolean(smtpUser),
      hasSmtpPass: Boolean(smtpPass),
      hasSmtpFromEmail: Boolean(smtpFromEmail),
      hasGmailUser: Boolean(gmailUser),
      hasGmailAppPassword: Boolean(gmailAppPassword),
      nodeEnv: String(process.env.NODE_ENV || 'development')
    });
  }

  if (resendApiKey && resendFromEmail) {
    return {
      provider: 'resend',
      resendApiKey,
      fromEmail: resendFromEmail
    };
  }

  if (smtpHost && smtpUser && smtpPass) {
    const parsedPort = Number.parseInt(smtpPortRaw || '587', 10);
    const smtpPort = Number.isFinite(parsedPort) ? parsedPort : 587;
    const secure = smtpSecureRaw ? smtpSecureRaw === 'true' : smtpPort === 465;
    return {
      provider: 'smtp',
      transporter: nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure,
        auth: {
          user: smtpUser,
          pass: smtpPass
        }
      }),
      fromEmail: smtpFromEmail || smtpUser
    };
  }

  if (gmailUser && gmailAppPassword) {
    return {
      provider: 'gmail',
      transporter: nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: gmailUser,
          pass: gmailAppPassword
        }
      }),
      fromEmail: gmailUser
    };
  }

  return { provider: 'none', fromEmail: '' };
}

async function sendViaProvider({ to, subject, text, html }) {
  const cfg = resolveTransportConfig();
  if (cfg.provider === 'none' || !cfg.fromEmail) {
    return { delivered: false, reason: 'missing_email_provider_config' };
  }

  if (cfg.provider === 'resend') {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${cfg.resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: cfg.fromEmail,
          to: [to],
          subject,
          html,
          text
        })
      });

      if (response.ok) {
        return { delivered: true, reason: 'sent_via_resend' };
      }
      const errorText = await response.text();
      return { delivered: false, reason: `resend_error:${errorText}` };
    } catch (error) {
      return { delivered: false, reason: `resend_error:${error.message}` };
    }
  }

  try {
    await cfg.transporter.sendMail({
      from: cfg.fromEmail,
      to,
      subject,
      text,
      html
    });
    return { delivered: true, reason: `sent_via_${cfg.provider}` };
  } catch (error) {
    return { delivered: false, reason: `smtp_error:${error.message}` };
  }
}

function createOtpTemplate({ title, code, expiresInMinutes, note }) {
  const safeCode = escapeHtml(code);
  const safeNote = escapeHtml(note);
  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#111;">Your verification code:</p>
    <div style="display:inline-block;background:#fff7d1;border:1px solid #f0b90b;border-radius:8px;padding:10px 16px;font-size:32px;font-weight:800;letter-spacing:3px;color:#111;">
      ${safeCode}
    </div>
    <p style="margin:16px 0 0;font-size:15px;line-height:1.7;color:#111;">
      This code is valid for <strong>${Number(expiresInMinutes)} minutes</strong>.
    </p>
    <p style="margin:8px 0 0;font-size:15px;line-height:1.7;color:#111;">${safeNote}</p>
  `;

  return buildEmailShell({
    title,
    subtitle: 'Security verification required',
    bodyHtml
  });
}

function createNewDeviceTemplate({ email, loginTimeUtc, ipAddress, userAgent, location }) {
  const bodyHtml = `
    <h2 style="margin:0 0 14px;font-size:30px;line-height:1.15;color:#111;">New Device or IP Login Detected</h2>
    <p style="margin:0 0 14px;font-size:16px;line-height:1.6;color:#111;">
      We detected a login attempt for <strong>${escapeHtml(email)}</strong> from a new device or IP address.
      If this was not you, reset your password immediately.
    </p>
    <table cellpadding="0" cellspacing="0" style="font-size:15px;line-height:1.8;color:#111;">
      <tr><td style="padding-right:10px;"><strong>Time:</strong></td><td>${escapeHtml(loginTimeUtc)}</td></tr>
      <tr><td style="padding-right:10px;"><strong>Device:</strong></td><td>${escapeHtml(userAgent)}</td></tr>
      <tr><td style="padding-right:10px;"><strong>IP Address:</strong></td><td>${escapeHtml(ipAddress)}</td></tr>
      <tr><td style="padding-right:10px;"><strong>Location:</strong></td><td>${escapeHtml(location)}</td></tr>
    </table>
  `;

  return buildEmailShell({
    title: 'New Device Login Alert',
    subtitle: 'Review your recent account activity',
    bodyHtml
  });
}

function createAuthEmailService() {
  async function sendSignupOtpEmail(email, code, { expiresInMinutes = 10 } = {}) {
    const subject = `[${BRAND_NAME}] Signup Verification - ${new Date().toISOString().replace('T', ' ').replace('Z', ' (UTC)')}`;
    const text = `Your ${BRAND_NAME} signup verification code is ${code}. It is valid for ${expiresInMinutes} minutes.`;
    const html = createOtpTemplate({
      title: 'Signup Verification',
      code,
      expiresInMinutes,
      note: 'Do not share this code with anyone.'
    });
    return sendViaProvider({ to: email, subject, text, html });
  }

  async function sendForgotPasswordOtpEmail(email, code, { expiresInMinutes = 10 } = {}) {
    const subject = `[${BRAND_NAME}] Password Reset Verification - ${new Date().toISOString().replace('T', ' ').replace('Z', ' (UTC)')}`;
    const text = `Your ${BRAND_NAME} password reset code is ${code}. It is valid for ${expiresInMinutes} minutes.`;
    const html = createOtpTemplate({
      title: 'Password Reset Verification',
      code,
      expiresInMinutes,
      note: 'If you did not request this, secure your account immediately.'
    });
    return sendViaProvider({ to: email, subject, text, html });
  }

  async function sendLoginOtpEmail(email, code, { expiresInMinutes = 10 } = {}) {
    const subject = `[${BRAND_NAME}] Login Verification - ${new Date().toISOString().replace('T', ' ').replace('Z', ' (UTC)')}`;
    const text = `Your ${BRAND_NAME} login verification code is ${code}. It is valid for ${expiresInMinutes} minutes.`;
    const html = createOtpTemplate({
      title: 'Login Verification',
      code,
      expiresInMinutes,
      note: 'Never share this code with anyone, including support.'
    });
    return sendViaProvider({ to: email, subject, text, html });
  }

  async function sendNewDeviceLoginAlert(email, metadata = {}) {
    const loginTimeUtc = metadata.loginTimeUtc || new Date().toISOString().replace('T', ' ').replace('Z', ' (UTC)');
    const ipAddress = metadata.ipAddress || 'Unknown';
    const userAgent = metadata.userAgent || 'Unknown';
    const location = metadata.location || 'Unknown';
    const subject = `[${BRAND_NAME}] New Device or IP Login Alert - ${new Date().toISOString().replace('T', ' ').replace('Z', ' (UTC)')}`;
    const text = `New login detected.\nEmail: ${email}\nTime: ${loginTimeUtc}\nIP: ${ipAddress}\nDevice: ${userAgent}\nLocation: ${location}`;
    const html = createNewDeviceTemplate({
      email,
      loginTimeUtc,
      ipAddress,
      userAgent,
      location
    });
    return sendViaProvider({ to: email, subject, text, html });
  }

  async function sendDepositSuccessEmail(email, summary = {}) {
    const amount = Number(summary.amount || 0);
    const asset = String(summary.asset || 'USDT').toUpperCase();
    const txId = String(summary.transactionId || 'N/A');
    const bodyHtml = `
      <h2 style="margin:0 0 14px;font-size:30px;line-height:1.15;color:#111;">${escapeHtml(asset)} Deposit Successful</h2>
      <p style="margin:0 0 14px;font-size:16px;line-height:1.6;color:#111;">
        Your deposit of <strong>${amount.toLocaleString(undefined, { maximumFractionDigits: 8 })} ${escapeHtml(asset)}</strong> is now available.
      </p>
      <p style="margin:0;font-size:15px;line-height:1.7;color:#111;"><strong>Transaction ID:</strong> ${escapeHtml(txId)}</p>
    `;
    const subject = `[${BRAND_NAME}] ${asset} Deposit Successful`;
    const text = `${asset} Deposit Successful. Amount: ${amount} ${asset}. TxId: ${txId}`;
    const html = buildEmailShell({
      title: `${asset} Deposit Successful`,
      subtitle: 'Funds credited to your account',
      bodyHtml
    });
    return sendViaProvider({ to: email, subject, text, html });
  }

  async function sendWithdrawalSuccessEmail(email, summary = {}) {
    const amount = Number(summary.amount || 0);
    const asset = String(summary.asset || 'USDT').toUpperCase();
    const address = String(summary.address || 'N/A');
    const txId = String(summary.transactionId || 'N/A');
    const bodyHtml = `
      <h2 style="margin:0 0 14px;font-size:30px;line-height:1.15;color:#111;">${escapeHtml(asset)} Withdrawal Successful</h2>
      <p style="margin:0 0 14px;font-size:16px;line-height:1.6;color:#111;">
        You have withdrawn <strong>${amount.toLocaleString(undefined, { maximumFractionDigits: 8 })} ${escapeHtml(asset)}</strong>.
      </p>
      <p style="margin:0;font-size:15px;line-height:1.7;color:#111;"><strong>Address:</strong> ${escapeHtml(address)}</p>
      <p style="margin:8px 0 0;font-size:15px;line-height:1.7;color:#111;"><strong>Transaction ID:</strong> ${escapeHtml(txId)}</p>
    `;
    const subject = `[${BRAND_NAME}] ${asset} Withdrawal Successful`;
    const text = `${asset} Withdrawal Successful. Amount: ${amount} ${asset}. Address: ${address}. TxId: ${txId}`;
    const html = buildEmailShell({
      title: `${asset} Withdrawal Successful`,
      subtitle: 'Withdrawal request completed',
      bodyHtml
    });
    return sendViaProvider({ to: email, subject, text, html });
  }

  return {
    sendSignupOtpEmail,
    sendForgotPasswordOtpEmail,
    sendLoginOtpEmail,
    sendNewDeviceLoginAlert,
    sendDepositSuccessEmail,
    sendWithdrawalSuccessEmail
  };
}

module.exports = {
  createAuthEmailService
};
