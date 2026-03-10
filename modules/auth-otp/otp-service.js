const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { normalizeEmail } = require('./mysql-store');

function createHttpError(statusCode, message, code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim().toLowerCase());
}

function generateOtpCode() {
  return String(crypto.randomInt(100000, 1000000));
}

function deriveUsernameFromEmail(email) {
  const raw = normalizeEmail(email);
  if (!raw.includes('@')) {
    return raw;
  }
  return raw.split('@')[0] || 'user';
}

function createOtpAuthService({
  store,
  geetestService,
  emailService,
  tokenService,
  otpConfig,
  logger = console
}) {
  const config = {
    ttlMs: Number(otpConfig?.ttlMs) || 5 * 60 * 1000,
    maxAttempts: Number(otpConfig?.maxAttempts) || 3,
    maxRequestsPerHour: Number(otpConfig?.maxRequestsPerHour) || 5
  };

  async function sendOtp({ email, geetest }) {
    const normalizedEmail = normalizeEmail(email);
    if (!isValidEmail(normalizedEmail)) {
      throw createHttpError(400, 'Enter a valid email address.', 'EMAIL_INVALID');
    }

    await geetestService.verifyChallenge(geetest || {});

    const requestsInWindow = await store.countOtpRequestsInLastHour(normalizedEmail);
    if (requestsInWindow >= config.maxRequestsPerHour) {
      throw createHttpError(429, 'Too many OTP requests. Try again later.', 'OTP_RATE_LIMITED');
    }

    const otpCode = generateOtpCode();
    const otpHash = await bcrypt.hash(otpCode, 12);
    const expiresAt = new Date(Date.now() + config.ttlMs);

    const otpId = await store.createOtpRecord(normalizedEmail, otpHash, expiresAt);
    try {
      await emailService.sendOtpEmail(normalizedEmail, otpCode);
    } catch (error) {
      await store.deleteOtpRecordById(otpId);
      throw createHttpError(
        Number(error?.statusCode) || 503,
        'Unable to send verification code right now.',
        'OTP_DELIVERY_FAILED'
      );
    }

    logger.log(`[auth-otp] verification code issued for ${normalizedEmail}`);

    return {
      success: true,
      message: 'Verification code sent to your email.',
      expiresInSeconds: Math.floor(config.ttlMs / 1000)
    };
  }

  async function verifyOtp({ email, otp }) {
    const normalizedEmail = normalizeEmail(email);
    const otpCode = String(otp || '').trim();

    if (!isValidEmail(normalizedEmail)) {
      throw createHttpError(400, 'Enter a valid email address.', 'EMAIL_INVALID');
    }
    if (!/^\d{6}$/.test(otpCode)) {
      throw createHttpError(400, 'Enter a valid 6-digit verification code.', 'OTP_INVALID_FORMAT');
    }

    const otpRecord = await store.getLatestOtpRecord(normalizedEmail);
    if (!otpRecord) {
      throw createHttpError(400, 'Verification code expired. Please request a new one.', 'OTP_NOT_FOUND');
    }

    if (otpRecord.expiresAt.getTime() < Date.now()) {
      await store.deleteOtpRecordById(otpRecord.id);
      throw createHttpError(400, 'Verification code expired. Please request a new one.', 'OTP_EXPIRED');
    }

    if (otpRecord.attempts >= config.maxAttempts) {
      throw createHttpError(429, 'Maximum OTP attempts exceeded. Request a new code.', 'OTP_ATTEMPTS_EXCEEDED');
    }

    const matched = await bcrypt.compare(otpCode, otpRecord.otpHash);
    if (!matched) {
      const attempts = await store.incrementOtpAttempts(otpRecord.id);
      const attemptsLeft = Math.max(0, config.maxAttempts - attempts);
      throw createHttpError(
        400,
        attemptsLeft > 0
          ? `Invalid verification code. ${attemptsLeft} attempt(s) remaining.`
          : 'Maximum OTP attempts exceeded. Request a new code.',
        'OTP_MISMATCH'
      );
    }

    await store.deleteOtpRecordById(otpRecord.id);

    let user = await store.findUserByEmail(normalizedEmail);
    if (!user) {
      user = await store.createUser(normalizedEmail);
    }

    const tokenPair = tokenService.createTokenPair({
      id: String(user.id),
      userId: String(user.id),
      username: deriveUsernameFromEmail(normalizedEmail),
      email: normalizedEmail,
      role: 'USER',
      scope: 'auth'
    });

    return {
      success: true,
      message: 'Authentication successful.',
      user: {
        id: user.id,
        email: user.email,
        kycStatus: user.kycStatus || 'pending'
      },
      tokenPair
    };
  }

  return {
    sendOtp,
    verifyOtp,
    getGeetestConfig() {
      if (!geetestService.isConfigured) {
        throw createHttpError(503, 'Geetest captcha is not configured.', 'GEETEST_NOT_CONFIGURED');
      }
      return {
        captchaId: geetestService.captchaId
      };
    }
  };
}

module.exports = {
  createOtpAuthService,
  createHttpError
};
