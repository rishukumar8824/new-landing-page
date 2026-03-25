const nodemailer = require('nodemailer');

function createHttpError(statusCode, message, code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function createOtpEmailService(config = {}) {
  const host = String(config.host || '').trim();
  const port = Number(config.port) || 587;
  const user = String(config.user || '').trim();
  const pass = String(config.pass || '').trim();
  const secure = Boolean(config.secure);
  const from = String(config.from || '').trim();

  const configured = Boolean(host && user && pass && from);

  let transporter = null;
  function getTransporter() {
    if (!configured) {
      throw createHttpError(503, 'SMTP is not configured for OTP email delivery.', 'SMTP_NOT_CONFIGURED');
    }
    if (!transporter) {
      transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
          user,
          pass
        }
      });
    }
    return transporter;
  }

  async function sendOtpEmail(email, otp) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const code = String(otp || '').trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      throw createHttpError(400, 'Invalid email for OTP delivery.', 'EMAIL_INVALID');
    }
    if (!/^\d{6}$/.test(code)) {
      throw createHttpError(500, 'OTP format is invalid.', 'OTP_INVALID');
    }

    const client = getTransporter();
    await client.sendMail({
      from,
      to: normalizedEmail,
      subject: 'Bitegit Verification Code',
      text: `Your Bitegit verification code is: ${code}\nThis code will expire in 5 minutes.`,
      html: `<div style="font-family:Arial,sans-serif;color:#111">` +
        `<p>Your Bitegit verification code is: <strong>${code}</strong></p>` +
        `<p>This code will expire in 5 minutes.</p>` +
        `</div>`
    });
  }

  return {
    isConfigured: configured,
    sendOtpEmail
  };
}

module.exports = {
  createOtpEmailService
};
