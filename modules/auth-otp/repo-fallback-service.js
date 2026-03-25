const crypto = require('crypto');
const bcrypt = require('bcryptjs');

function createHttpError(statusCode, message, code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function normalizeEmail(rawEmail) {
  return String(rawEmail || '').trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim().toLowerCase());
}

function generateOtpCode() {
  return String(crypto.randomInt(100000, 1000000));
}

function toKycStatus(rawStatus) {
  const normalized = String(rawStatus || '').trim().toUpperCase();
  if (normalized === 'VERIFIED') {
    return 'verified';
  }
  if (normalized === 'PENDING_REVIEW') {
    return 'pending';
  }
  if (normalized === 'REJECTED') {
    return 'rejected';
  }
  return 'pending';
}

function createRepoFallbackOtpAuthService({
  repos,
  tokenService,
  geetestService,
  authEmailService,
  buildP2PUserFromEmail,
  otpConfig,
  logger = console
}) {
  if (!repos) {
    throw new Error('repos is required for fallback OTP auth service');
  }
  if (!tokenService) {
    throw new Error('tokenService is required for fallback OTP auth service');
  }
  if (!geetestService) {
    throw new Error('geetestService is required for fallback OTP auth service');
  }
  if (typeof buildP2PUserFromEmail !== 'function') {
    throw new Error('buildP2PUserFromEmail is required for fallback OTP auth service');
  }

  const config = {
    ttlMs: Number(otpConfig?.ttlMs) || 5 * 60 * 1000,
    maxAttempts: Number(otpConfig?.maxAttempts) || 3,
    maxRequestsPerHour: Number(otpConfig?.maxRequestsPerHour) || 5
  };

  // Memory backed request window for fallback mode.
  const requestWindowByEmail = new Map();

  function trackAndCountHourlyRequests(email) {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const current = requestWindowByEmail.get(email) || [];
    const filtered = current.filter((item) => item >= oneHourAgo);
    filtered.push(now);
    requestWindowByEmail.set(email, filtered);
    return filtered.length;
  }

  async function sendOtp({ email, geetest, ipAddress, userAgent }) {
    const normalizedEmail = normalizeEmail(email);
    if (!isValidEmail(normalizedEmail)) {
      throw createHttpError(400, 'Enter a valid email address.', 'EMAIL_INVALID');
    }

    await geetestService.verifyChallenge(geetest || {}, {
      ipAddress,
      userAgent,
      email: normalizedEmail
    });

    const requestsInWindow = trackAndCountHourlyRequests(normalizedEmail);
    if (requestsInWindow > config.maxRequestsPerHour) {
      throw createHttpError(429, 'Too many OTP requests. Try again later.', 'OTP_RATE_LIMITED');
    }

    const otpCode = generateOtpCode();
    const otpHash = await bcrypt.hash(otpCode, 12);
    const expiresAt = Date.now() + config.ttlMs;

    await repos.upsertSignupOtp(
      normalizedEmail,
      {
        code: otpHash,
        type: 'email',
        attempts: 0,
        expiresAt,
        payload: {
          hashed: true,
          version: 1
        }
      },
      { purpose: 'auth_otp' }
    );

    const expiresInMinutes = Math.max(1, Math.floor(config.ttlMs / (60 * 1000)));
    let sendResult = { delivered: false, reason: 'missing_email_provider_config' };

    try {
      if (authEmailService && typeof authEmailService.sendLoginOtpEmail === 'function') {
        sendResult = await authEmailService.sendLoginOtpEmail(normalizedEmail, otpCode, { expiresInMinutes });
      } else if (authEmailService && typeof authEmailService.sendSignupOtpEmail === 'function') {
        sendResult = await authEmailService.sendSignupOtpEmail(normalizedEmail, otpCode, { expiresInMinutes });
      }
    } catch (error) {
      sendResult = { delivered: false, reason: `provider_error:${error.message}` };
    }

    if (!sendResult.delivered) {
      await repos.deleteSignupOtp(normalizedEmail, { purpose: 'auth_otp' });
      throw createHttpError(503, 'Unable to send verification code right now.', 'OTP_DELIVERY_FAILED');
    }

    logger.log(`[auth-otp:fallback] verification code issued for ${normalizedEmail}`);

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

    const otpState = await repos.getSignupOtp(normalizedEmail, { purpose: 'auth_otp' });
    if (!otpState) {
      throw createHttpError(400, 'Verification code expired. Please request a new one.', 'OTP_NOT_FOUND');
    }

    const expiresAtMs = new Date(otpState.expiresAt).getTime();
    if (!Number.isFinite(expiresAtMs) || expiresAtMs < Date.now()) {
      await repos.deleteSignupOtp(normalizedEmail, { purpose: 'auth_otp' });
      throw createHttpError(400, 'Verification code expired. Please request a new one.', 'OTP_EXPIRED');
    }

    const currentAttempts = Number(otpState.attempts || 0);
    if (currentAttempts >= config.maxAttempts) {
      throw createHttpError(429, 'Maximum OTP attempts exceeded. Request a new code.', 'OTP_ATTEMPTS_EXCEEDED');
    }

    const isHashed = Boolean(otpState?.payload && otpState.payload.hashed === true);
    const matched = isHashed
      ? await bcrypt.compare(otpCode, String(otpState.code || ''))
      : String(otpState.code || '').trim() === otpCode;

    if (!matched) {
      const attempts = currentAttempts + 1;
      if (attempts >= config.maxAttempts) {
        await repos.deleteSignupOtp(normalizedEmail, { purpose: 'auth_otp' });
        throw createHttpError(429, 'Maximum OTP attempts exceeded. Request a new code.', 'OTP_ATTEMPTS_EXCEEDED');
      }

      await repos.upsertSignupOtp(
        normalizedEmail,
        {
          ...otpState,
          attempts,
          expiresAt: expiresAtMs
        },
        { purpose: 'auth_otp' }
      );

      throw createHttpError(
        400,
        `Invalid verification code. ${Math.max(0, config.maxAttempts - attempts)} attempt(s) remaining.`,
        'OTP_MISMATCH'
      );
    }

    await repos.deleteSignupOtp(normalizedEmail, { purpose: 'auth_otp' });

    let credential = await repos.getP2PCredential(normalizedEmail);
    if (!credential) {
      const randomPasswordHash = repos.hashPassword(crypto.randomBytes(16).toString('hex'));
      await repos.setP2PCredential(normalizedEmail, randomPasswordHash, {
        role: 'USER',
        emailVerified: true
      });
      credential = await repos.getP2PCredential(normalizedEmail);
    }

    const role = String(credential?.role || 'USER').trim().toUpperCase() || 'USER';
    const user = buildP2PUserFromEmail(normalizedEmail, role);
    const tokenPair = tokenService.createTokenPair({
      id: user.id,
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      scope: 'auth'
    });

    return {
      success: true,
      message: 'Authentication successful.',
      user: {
        id: user.id,
        email: normalizedEmail,
        kycStatus: toKycStatus(credential?.kycStatus)
      },
      tokenPair
    };
  }

  function createSliderCaptcha(context = {}) {
    if (!geetestService || typeof geetestService.createSliderChallenge !== 'function') {
      throw createHttpError(503, 'Slider captcha is unavailable right now.', 'SLIDER_NOT_AVAILABLE');
    }
    return geetestService.createSliderChallenge(context);
  }

  function getGeetestConfig() {
    if (geetestService && typeof geetestService.getPublicConfig === 'function') {
      return geetestService.getPublicConfig();
    }
    return {
      captchaId: String(geetestService?.captchaId || ''),
      isConfigured: Boolean(geetestService?.isConfigured),
      sliderFallbackEnabled: false
    };
  }

  return {
    sendOtp,
    verifyOtp,
    createSliderCaptcha,
    getGeetestConfig
  };
}

module.exports = {
  createRepoFallbackOtpAuthService
};
