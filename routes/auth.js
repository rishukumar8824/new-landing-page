function normalizeIp(req) {
  const forwardedRaw = String(req.headers['x-forwarded-for'] || '').trim();
  const firstForwardedIp = forwardedRaw.split(',')[0].trim();
  return firstForwardedIp || String(req.ip || req.connection?.remoteAddress || 'unknown');
}

function createIpRateLimiter({ windowMs, maxAttempts }) {
  const state = new Map();

  function middleware(req, res, next) {
    const ip = normalizeIp(req);
    const now = Date.now();
    const existing = state.get(ip);

    if (!existing || now > existing.resetAt) {
      state.set(ip, { count: 0, resetAt: now + windowMs });
    }

    const entry = state.get(ip);
    if (entry.count >= maxAttempts) {
      const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({
        message: 'Too many attempts. Please try again later.',
        retryAfterSeconds
      });
    }

    // attach helper so routes can increment only on failure
    req._ipRateLimitEntry = entry;
    req._recordFailedAttempt = function () {
      entry.count += 1;
      state.set(ip, entry);
    };

    return next();
  }

  return middleware;
}

function createEmailFromInput(raw) {
  return String(raw || '')
    .trim()
    .toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPassword(password) {
  return String(password || '').trim().length >= 6;
}

function createOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function isValidOtpCode(code) {
  return /^\d{6}$/.test(String(code || '').trim());
}

function registerAuthRoutes(app, deps) {
  const {
    repos,
    walletService,
    authMiddleware,
    tokenService,
    buildP2PUserFromEmail,
    createLegacyP2PUserSession,
    setCookie,
    clearCookie,
    cookieNames,
    p2pUserTtlMs,
    auditLogService,
    authEmailService,
    captchaVerifier = null,
    otpTtlMs = 10 * 60 * 1000,
    onLoginSuccess = null,
    enableLegacyOtpEndpoints = true
  } = deps;

  const loginLimiter = createIpRateLimiter({
    windowMs: 10 * 60 * 1000,
    maxAttempts: 30
  });

  const registerLimiter = createIpRateLimiter({
    windowMs: 10 * 60 * 1000,
    maxAttempts: 5
  });

  const signupOtpLimiter = createIpRateLimiter({
    windowMs: 10 * 60 * 1000,
    maxAttempts: 5
  });

  const forgotOtpLimiter = createIpRateLimiter({
    windowMs: 10 * 60 * 1000,
    maxAttempts: 5
  });

  const SIGNUP_OTP_PURPOSE = 'signup';
  const SIGNIN_OTP_PURPOSE = 'signin';
  const PASSWORD_RESET_OTP_PURPOSE = 'password_reset';
  const REGISTER_EMAIL_VERIFY_PURPOSE = 'register_email_verify';
  const REGISTER_EMAIL_VERIFY_TTL_MS = 5 * 60 * 1000;

  async function safeAuditLog(entry) {
    if (!auditLogService || typeof auditLogService.safeLog !== 'function') {
      return;
    }
    await auditLogService.safeLog(entry);
  }

  async function safeOnLoginSuccess(payload) {
    if (typeof onLoginSuccess !== 'function') {
      return;
    }
    try {
      await onLoginSuccess(payload);
    } catch (error) {
      // User-center login history failure should not block auth flow.
    }
  }

  async function persistRefreshToken(user, refreshToken, expiresAtMs) {
    const tokenHash = tokenService.hashRefreshToken(refreshToken);
    await repos.saveRefreshToken({
      userId: user.id,
      role: tokenService.normalizeRole(user.role),
      username: user.username,
      email: user.email,
      tokenHash,
      issuedAt: Date.now(),
      expiresAt: expiresAtMs
    });
  }

  function setAuthCookies(res, tokenPair) {
    const maxAgeAccess = tokenService.ACCESS_TOKEN_TTL_SECONDS;
    const maxAgeRefresh = tokenService.REFRESH_TOKEN_TTL_SECONDS;
    setCookie(res, cookieNames.accessToken, tokenPair.accessToken, maxAgeAccess);
    setCookie(res, cookieNames.refreshToken, tokenPair.refreshToken, maxAgeRefresh);
  }

  function createCaptchaPayload(body = {}) {
    if (!body || typeof body !== 'object') {
      return {};
    }

    if (body.geetest && typeof body.geetest === 'object') {
      return body.geetest;
    }

    return {
      lot_number: body.lot_number,
      captcha_output: body.captcha_output,
      pass_token: body.pass_token,
      gen_time: body.gen_time,
      fallback_type: body.fallback_type,
      challenge_id: body.challenge_id,
      position: body.position,
      token: body.token
    };
  }

  async function verifyRegistrationCaptcha(req, email) {
    if (!captchaVerifier || typeof captchaVerifier.verifyChallenge !== 'function') {
      return { skipped: true };
    }

    const payload = createCaptchaPayload(req.body);
    return captchaVerifier.verifyChallenge(payload, {
      ipAddress: normalizeIp(req),
      userAgent: String(req.headers['user-agent'] || '').trim().slice(0, 1024),
      email
    });
  }

  function clearAuthCookies(res) {
    clearCookie(res, cookieNames.accessToken);
    clearCookie(res, cookieNames.refreshToken);
  }

  async function sendOtpEmail(contact, purpose, options = {}) {
    const code = createOtpCode();
    const effectiveOtpTtlMs = Math.max(60 * 1000, Number(options.ttlMs || otpTtlMs || 0));
    const otpState = {
      code,
      type: 'email',
      attempts: 0,
      expiresAt: Date.now() + effectiveOtpTtlMs,
      payload:
        options.payload && typeof options.payload === 'object' && options.payload !== null
          ? options.payload
          : {}
    };

    await repos.upsertSignupOtp(contact, otpState, { purpose });

    const expiresInMinutes = Math.max(1, Math.floor(effectiveOtpTtlMs / (60 * 1000)));
    let sendResult = { delivered: false, reason: 'missing_email_provider_config' };

    if (authEmailService && typeof authEmailService === 'object') {
      try {
        if (purpose === SIGNUP_OTP_PURPOSE || purpose === SIGNIN_OTP_PURPOSE) {
          if (typeof authEmailService.sendLoginOtpEmail === 'function') {
            sendResult = await authEmailService.sendLoginOtpEmail(contact, code, { expiresInMinutes });
          } else if (typeof authEmailService.sendSignupOtpEmail === 'function') {
            sendResult = await authEmailService.sendSignupOtpEmail(contact, code, { expiresInMinutes });
          }
        } else if (
          purpose === PASSWORD_RESET_OTP_PURPOSE &&
          typeof authEmailService.sendForgotPasswordOtpEmail === 'function'
        ) {
          sendResult = await authEmailService.sendForgotPasswordOtpEmail(contact, code, { expiresInMinutes });
        }
      } catch (error) {
        sendResult = { delivered: false, reason: `provider_error:${error.message}` };
      }
    }

    if (sendResult.delivered) {
      return {
        message: 'Verification code sent to your email.',
        delivery: 'email',
        expiresInSeconds: Math.floor(effectiveOtpTtlMs / 1000)
      };
    }

    await repos.deleteSignupOtp(contact, { purpose });
    const failureReason = String(sendResult.reason || 'email_provider_unavailable').trim();
    return {
      error: true,
      status: 503,
      message: 'Unable to send email OTP right now.',
      reason: failureReason
    };
  }

  async function verifyOtp(contact, code, purpose) {
    const otpState = await repos.getSignupOtp(contact, { purpose });
    if (!otpState) {
      return {
        ok: false,
        message: 'Verification code expired. Please request a new code.'
      };
    }

    const expiresAtMs = new Date(otpState.expiresAt).getTime();
    if (!Number.isFinite(expiresAtMs) || expiresAtMs < Date.now()) {
      await repos.deleteSignupOtp(contact, { purpose });
      return {
        ok: false,
        message: 'Verification code expired. Please request a new code.'
      };
    }

    if (String(otpState.code || '').trim() !== String(code || '').trim()) {
      const attempts = Number(otpState.attempts || 0) + 1;
      if (attempts >= 5) {
        await repos.deleteSignupOtp(contact, { purpose });
        return {
          ok: false,
          message: 'Too many failed attempts. Request a new code.'
        };
      }

      await repos.upsertSignupOtp(
        contact,
        {
          ...otpState,
          attempts,
          expiresAt: expiresAtMs
        },
        { purpose }
      );
      return {
        ok: false,
        message: 'Invalid verification code.'
      };
    }

    const payload =
      otpState.payload && typeof otpState.payload === 'object' && otpState.payload !== null
        ? otpState.payload
        : {};
    await repos.deleteSignupOtp(contact, { purpose });
    return { ok: true, payload };
  }

  app.post('/auth/signup/send-otp', signupOtpLimiter, async (req, res) => {
    const email = createEmailFromInput(req.body?.email);
    const ipAddress = normalizeIp(req);
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Enter a valid email address.' });
    }

    try {
      const existing = await repos.getP2PCredential(email);
      if (existing) {
        return res.status(409).json({ message: 'Account already exists. Please login.' });
      }

      const result = await sendOtpEmail(email, SIGNUP_OTP_PURPOSE);
      if (result.error) {
        return res.status(result.status || 500).json({
          message: result.message,
          reason: result.reason
        });
      }

      await safeAuditLog({
        userId: '',
        action: 'signup_otp_sent',
        ipAddress,
        metadata: {
          email,
          delivery: result.delivery
        }
      });

      return res.json(result);
    } catch (error) {
      return res.status(500).json({ message: 'Server error while sending verification code.' });
    }
  });

  app.post('/auth/forgot-password/send-otp', forgotOtpLimiter, async (req, res) => {
    const email = createEmailFromInput(req.body?.email);
    const ipAddress = normalizeIp(req);
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Enter a valid email address.' });
    }

    try {
      const existing = await repos.getP2PCredential(email);
      if (!existing) {
        return res.json({
          message: 'If an account exists, a verification code has been sent.',
          expiresInSeconds: Math.floor(Number(otpTtlMs || 0) / 1000)
        });
      }

      const result = await sendOtpEmail(email, PASSWORD_RESET_OTP_PURPOSE);
      if (result.error) {
        return res.status(result.status || 500).json({
          message: result.message,
          reason: result.reason
        });
      }

      await safeAuditLog({
        userId: buildP2PUserFromEmail(email, existing.role || 'USER').id,
        action: 'forgot_password_otp_sent',
        ipAddress,
        metadata: {
          email,
          delivery: result.delivery
        }
      });

      return res.json(result);
    } catch (error) {
      return res.status(500).json({ message: 'Server error while sending reset code.' });
    }
  });

  app.post('/api/auth/register', registerLimiter, async (req, res) => {
    const email = createEmailFromInput(req.body?.email);
    const password = String(req.body?.password || '').trim();
    const ipAddress = normalizeIp(req);

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Enter a valid email address.' });
    }
    if (!isValidPassword(password)) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    try {
      const existing = await repos.getP2PCredential(email);
      if (existing && Boolean(existing.emailVerified)) {
        return res.status(409).json({ message: 'Account already exists. Please login.' });
      }

      const passwordHash = repos.hashPassword(password);
      const result = await sendOtpEmail(email, REGISTER_EMAIL_VERIFY_PURPOSE, {
        ttlMs: REGISTER_EMAIL_VERIFY_TTL_MS,
        payload: {
          passwordHash,
          role: 'USER',
          flow: 'register_v2'
        }
      });

      if (result.error) {
        return res.status(result.status || 500).json({
          message: result.message,
          reason: result.reason
        });
      }

      await safeAuditLog({
        userId: '',
        action: 'register_otp_sent_v2',
        ipAddress,
        metadata: {
          email,
          delivery: result.delivery
        }
      });

      return res.status(202).json({
        message: 'Verification code sent to your email.',
        email,
        expiresInSeconds: result.expiresInSeconds
      });
    } catch (error) {
      return res.status(500).json({ message: 'Server error while starting registration.' });
    }
  });

  app.post('/api/auth/verify-email', registerLimiter, async (req, res) => {
    const email = createEmailFromInput(req.body?.email);
    const otpCode = String(req.body?.otpCode || '').trim();
    const ipAddress = normalizeIp(req);

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Enter a valid email address.' });
    }
    if (!isValidOtpCode(otpCode)) {
      return res.status(400).json({ message: 'Enter a valid 6-digit verification code.' });
    }

    try {
      const otpResult = await verifyOtp(email, otpCode, REGISTER_EMAIL_VERIFY_PURPOSE);
      if (!otpResult.ok) {
        return res.status(400).json({ message: otpResult.message });
      }

      const payload = otpResult.payload && typeof otpResult.payload === 'object' ? otpResult.payload : {};
      const passwordHash = String(payload.passwordHash || '').trim();
      if (!passwordHash) {
        return res.status(400).json({ message: 'Registration session expired. Please sign up again.' });
      }

      const existing = await repos.getP2PCredential(email);
      if (existing && Boolean(existing.emailVerified)) {
        return res.status(409).json({ message: 'Email already verified. Please login.' });
      }

      await repos.setP2PCredential(email, passwordHash, {
        role: String(payload.role || 'USER').trim().toUpperCase() === 'ADMIN' ? 'ADMIN' : 'USER',
        emailVerified: true
      });

      const user = buildP2PUserFromEmail(email, 'USER');
      await walletService.ensureWallet(user.id, { username: user.username });

      await safeAuditLog({
        userId: user.id,
        action: 'email_verified',
        ipAddress,
        metadata: {
          email
        }
      });

      return res.json({
        message: 'Email verified successfully. Account activated.',
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          email_verified: true
        }
      });
    } catch (error) {
      return res.status(500).json({ message: 'Server error while verifying email.' });
    }
  });

  async function createAndReturnTokens(res, user) {
    const tokenPair = tokenService.createTokenPair(user);
    await persistRefreshToken(user, tokenPair.refreshToken, tokenPair.refreshTokenExpiresAt);
    setAuthCookies(res, tokenPair);
    return tokenPair;
  }

  if (enableLegacyOtpEndpoints) {
    app.post('/auth/send-otp', signupOtpLimiter, async (req, res) => {
      const email = createEmailFromInput(req.body?.email);
      const ipAddress = normalizeIp(req);

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Enter a valid email address.' });
    }

    try {
      const result = await sendOtpEmail(email, SIGNIN_OTP_PURPOSE);
      if (result.error) {
        return res.status(result.status || 500).json({
          message: result.message,
          reason: result.reason
        });
      }

      await safeAuditLog({
        userId: '',
        action: 'signin_otp_sent',
        ipAddress,
        metadata: {
          email,
          delivery: result.delivery
        }
      });

      return res.json({
        success: true,
        message: result.message,
        expiresInSeconds: result.expiresInSeconds
      });
    } catch (error) {
      return res.status(500).json({ message: 'Server error while sending verification code.' });
    }
    });

    app.post('/auth/verify-otp', registerLimiter, async (req, res) => {
      const email = createEmailFromInput(req.body?.email);
      const otpCode = String(req.body?.otp || req.body?.otpCode || '').trim();
      const ipAddress = normalizeIp(req);
    const userAgent = String(req.headers['user-agent'] || '').trim().slice(0, 1024);

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Enter a valid email address.' });
    }
    if (!isValidOtpCode(otpCode)) {
      return res.status(400).json({ message: 'Enter a valid 6-digit verification code.' });
    }

    try {
      const otpResult = await verifyOtp(email, otpCode, SIGNIN_OTP_PURPOSE);
      if (!otpResult.ok) {
        return res.status(400).json({ message: otpResult.message });
      }

      let credential = await repos.getP2PCredential(email);
      if (!credential) {
        const randomPassword = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
        await repos.setP2PCredential(email, repos.hashPassword(randomPassword), {
          role: 'USER',
          emailVerified: true
        });
        credential = await repos.getP2PCredential(email);
      }

      const role = tokenService.normalizeRole(credential?.role || 'USER');
      const user = buildP2PUserFromEmail(email, role);
      await walletService.ensureWallet(user.id, { username: user.username });
      const tokenPair = await createAndReturnTokens(res, user);

      if (typeof createLegacyP2PUserSession === 'function') {
        const legacySession = await createLegacyP2PUserSession(email, role);
        setCookie(res, cookieNames.legacyP2PSession, legacySession.token, Math.floor(p2pUserTtlMs / 1000));
      }

      await repos.touchP2PCredentialLogin(email, {
        ipAddress,
        userAgent,
        deviceLabel: userAgent,
        role
      });

      await safeAuditLog({
        userId: user.id,
        action: 'signin_otp_success',
        ipAddress,
        metadata: { email, role }
      });

      await safeOnLoginSuccess({
        user,
        ipAddress,
        userAgent
      });

      return res.json({
        success: true,
        message: 'Authentication successful.',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          kycStatus: credential?.kycStatus || 'pending'
        },
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        accessTokenExpiresAt: tokenPair.accessTokenExpiresAt,
        refreshTokenExpiresAt: tokenPair.refreshTokenExpiresAt
      });
    } catch (error) {
      if (String(error.message || '').includes('JWT_SECRET')) {
        return res.status(503).json({ message: 'JWT auth is not configured.' });
      }
      return res.status(500).json({ message: 'Server error while verifying OTP.' });
    }
    });
  }

  app.post('/auth/login', loginLimiter, async (req, res) => {
    const email = createEmailFromInput(req.body?.email);
    const password = String(req.body?.password || '').trim();
    const ipAddress = normalizeIp(req);
    const userAgent = String(req.headers['user-agent'] || '').trim().slice(0, 1024);

    if (!isValidEmail(email)) {
      req._recordFailedAttempt?.();
      await safeAuditLog({
        userId: '',
        action: 'login_failed',
        ipAddress,
        metadata: { reason: 'invalid_email', email }
      });
      return res.status(400).json({ message: 'Enter a valid email address.' });
    }
    if (!isValidPassword(password)) {
      req._recordFailedAttempt?.();
      await safeAuditLog({
        userId: '',
        action: 'login_failed',
        ipAddress,
        metadata: { reason: 'invalid_password_length', email }
      });
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    try {
      const credential = await repos.getP2PCredential(email);
      if (!credential || !repos.verifyPassword(password, credential.passwordHash)) {
        req._recordFailedAttempt?.();
        await safeAuditLog({
          userId: '',
          action: 'login_failed',
          ipAddress,
          metadata: { reason: 'invalid_credentials', email }
        });
        return res.status(401).json({ message: 'Invalid email or password.' });
      }

      const role = tokenService.normalizeRole(credential.role || 'USER');
      const user = buildP2PUserFromEmail(email, role);
      const previousLoginIp = String(credential.lastLoginIp || '').trim();
      const previousUserAgent = String(credential.lastUserAgent || '').trim();
      const hasLoginHistory = Boolean(previousLoginIp || previousUserAgent);
      const isNewDeviceLogin =
        hasLoginHistory && (previousLoginIp !== ipAddress || previousUserAgent !== userAgent);

      // Run token creation and legacy session in parallel (both needed for cookies)
      const [tokenPair, legacySession] = await Promise.all([
        createAndReturnTokens(res, user),
        typeof createLegacyP2PUserSession === 'function'
          ? createLegacyP2PUserSession(email, role)
          : Promise.resolve(null)
      ]);

      if (legacySession) {
        setCookie(res, cookieNames.legacyP2PSession, legacySession.token, Math.floor(p2pUserTtlMs / 1000));
      }

      // Fire-and-forget background tasks — don't block the response
      Promise.all([
        walletService.ensureWallet(user.id, { username: user.username }),
        repos.touchP2PCredentialLogin(email, { ipAddress, userAgent, deviceLabel: userAgent, role }),
        safeAuditLog({ userId: user.id, action: 'login_success', ipAddress, metadata: { email, role: user.role } }),
        safeOnLoginSuccess({ user, ipAddress, userAgent }),
        isNewDeviceLogin && authEmailService && typeof authEmailService.sendNewDeviceLoginAlert === 'function'
          ? authEmailService.sendNewDeviceLoginAlert(email, {
              loginTimeUtc: new Date().toISOString().replace('T', ' ').replace('Z', ' (UTC)'),
              ipAddress,
              userAgent,
              location: 'Unknown'
            }).catch(() => {})
          : Promise.resolve()
      ]).catch(() => {});

      return res.json({
        message: 'Login successful.',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        },
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken
      });
    } catch (error) {
      req._recordFailedAttempt?.();
      await safeAuditLog({
        userId: '',
        action: 'login_failed',
        ipAddress,
        metadata: { reason: 'server_error', email }
      });
      if (String(error.message || '').includes('JWT_SECRET')) {
        return res.status(503).json({ message: 'JWT auth is not configured.' });
      }
      return res.status(500).json({ message: 'Server error during login.' });
    }
  });

  app.post('/auth/register', registerLimiter, async (req, res) => {
    const email = createEmailFromInput(req.body?.email);
    const password = String(req.body?.password || '').trim();
    const otpCode = String(req.body?.otpCode || '').trim();
    const ipAddress = normalizeIp(req);
    const userAgent = String(req.headers['user-agent'] || '').trim().slice(0, 1024);

    if (!isValidEmail(email)) {
      await safeAuditLog({
        userId: '',
        action: 'register_failed',
        ipAddress,
        metadata: { reason: 'invalid_email', email }
      });
      return res.status(400).json({ message: 'Enter a valid email address.' });
    }
    if (!isValidPassword(password)) {
      await safeAuditLog({
        userId: '',
        action: 'register_failed',
        ipAddress,
        metadata: { reason: 'invalid_password_length', email }
      });
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }
    if (!isValidOtpCode(otpCode)) {
      await safeAuditLog({
        userId: '',
        action: 'register_failed',
        ipAddress,
        metadata: { reason: 'invalid_otp_format', email }
      });
      return res.status(400).json({ message: 'Enter a valid 6-digit verification code.' });
    }

    try {
      try {
        await verifyRegistrationCaptcha(req, email);
      } catch (captchaError) {
        await safeAuditLog({
          userId: '',
          action: 'register_failed',
          ipAddress,
          metadata: {
            reason: String(captchaError?.code || 'captcha_verification_failed').toLowerCase(),
            email
          }
        });
        return res.status(Number(captchaError?.statusCode || captchaError?.status || 400)).json({
          message: String(captchaError?.message || 'Captcha verification failed.'),
          code: String(captchaError?.code || 'CAPTCHA_VERIFICATION_FAILED')
        });
      }

      const existing = await repos.getP2PCredential(email);
      if (existing) {
        await safeAuditLog({
          userId: '',
          action: 'register_failed',
          ipAddress,
          metadata: { reason: 'already_exists', email }
        });
        return res.status(409).json({ message: 'Account already exists. Please login.' });
      }

      const otpResult = await verifyOtp(email, otpCode, SIGNUP_OTP_PURPOSE);
      if (!otpResult.ok) {
        await safeAuditLog({
          userId: '',
          action: 'register_failed',
          ipAddress,
          metadata: { reason: 'otp_verification_failed', email }
        });
        return res.status(400).json({ message: otpResult.message });
      }

      await repos.setP2PCredential(email, repos.hashPassword(password), {
        role: 'USER'
      });

      const user = buildP2PUserFromEmail(email, 'USER');
      await walletService.ensureWallet(user.id, { username: user.username });

      const tokenPair = await createAndReturnTokens(res, user);

      if (typeof createLegacyP2PUserSession === 'function') {
        const legacySession = await createLegacyP2PUserSession(email, 'USER');
        setCookie(res, cookieNames.legacyP2PSession, legacySession.token, Math.floor(p2pUserTtlMs / 1000));
      }

      await safeAuditLog({
        userId: user.id,
        action: 'register_success',
        ipAddress,
        metadata: { email }
      });

      await safeOnLoginSuccess({
        user,
        ipAddress,
        userAgent
      });

      return res.status(201).json({
        message: 'Registration successful.',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        },
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken
      });
    } catch (error) {
      await safeAuditLog({
        userId: '',
        action: 'register_failed',
        ipAddress,
        metadata: { reason: 'server_error', email }
      });
      if (String(error.message || '').includes('JWT_SECRET')) {
        return res.status(503).json({ message: 'JWT auth is not configured.' });
      }
      return res.status(500).json({ message: 'Server error during registration.' });
    }
  });

  app.post('/auth/forgot-password/reset', registerLimiter, async (req, res) => {
    const email = createEmailFromInput(req.body?.email);
    const otpCode = String(req.body?.otpCode || '').trim();
    const nextPassword = String(req.body?.newPassword || '').trim();
    const ipAddress = normalizeIp(req);

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Enter a valid email address.' });
    }
    if (!isValidOtpCode(otpCode)) {
      return res.status(400).json({ message: 'Enter a valid 6-digit verification code.' });
    }
    if (!isValidPassword(nextPassword)) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    try {
      const credential = await repos.getP2PCredential(email);
      if (!credential) {
        return res.status(400).json({ message: 'Unable to reset password for this account.' });
      }

      const otpResult = await verifyOtp(email, otpCode, PASSWORD_RESET_OTP_PURPOSE);
      if (!otpResult.ok) {
        await safeAuditLog({
          userId: buildP2PUserFromEmail(email, credential.role || 'USER').id,
          action: 'password_reset_failed',
          ipAddress,
          metadata: { reason: 'otp_verification_failed', email }
        });
        return res.status(400).json({ message: otpResult.message });
      }

      await repos.updateP2PCredentialPassword(email, repos.hashPassword(nextPassword));
      await repos.deleteRefreshTokensByUserId(buildP2PUserFromEmail(email, credential.role || 'USER').id);

      await safeAuditLog({
        userId: buildP2PUserFromEmail(email, credential.role || 'USER').id,
        action: 'password_reset_success',
        ipAddress,
        metadata: { email }
      });

      return res.json({ message: 'Password reset successful. Please login.' });
    } catch (error) {
      return res.status(500).json({ message: 'Server error while resetting password.' });
    }
  });

  app.post('/auth/refresh', async (req, res) => {
    try {
      const refreshToken = authMiddleware.extractRefreshTokenFromRequest(req);
      if (!refreshToken) {
        clearAuthCookies(res);
        return res.status(401).json({ message: 'Refresh token is required.' });
      }

      const decoded = tokenService.verifyRefreshToken(refreshToken);
      const refreshTokenHash = tokenService.hashRefreshToken(refreshToken);
      const dbToken = await repos.getRefreshTokenByHash(refreshTokenHash);
      if (!dbToken) {
        clearAuthCookies(res);
        return res.status(401).json({ message: 'Invalid refresh token.' });
      }

      if (String(dbToken.userId) !== String(decoded.sub || '')) {
        await repos.deleteRefreshTokenByHash(refreshTokenHash);
        clearAuthCookies(res);
        return res.status(401).json({ message: 'Invalid refresh token.' });
      }

      const expiresAtMs = new Date(dbToken.expiresAt).getTime();
      if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
        await repos.deleteRefreshTokenByHash(refreshTokenHash);
        clearAuthCookies(res);
        return res.status(401).json({ message: 'Refresh token expired.' });
      }

      const user = {
        id: dbToken.userId,
        username: dbToken.username,
        email: dbToken.email,
        role: dbToken.role
      };
      const tokenPair = tokenService.createTokenPair(user);

      await persistRefreshToken(user, tokenPair.refreshToken, tokenPair.refreshTokenExpiresAt);
      setAuthCookies(res, tokenPair);

      return res.json({
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken
      });
    } catch (error) {
      clearAuthCookies(res);
      return res.status(401).json({ message: 'Invalid or expired refresh token.' });
    }
  });

  app.post('/auth/logout', async (req, res) => {
    try {
      const refreshToken = authMiddleware.extractRefreshTokenFromRequest(req);
      if (refreshToken) {
        const refreshTokenHash = tokenService.hashRefreshToken(refreshToken);
        await repos.deleteRefreshTokenByHash(refreshTokenHash);
      } else {
        const accessToken = authMiddleware.extractAccessTokenFromRequest(req);
        if (accessToken) {
          try {
            const decoded = tokenService.verifyAccessToken(accessToken);
            if (String(decoded?.sub || '').trim()) {
              await repos.deleteRefreshTokensByUserId(String(decoded.sub).trim());
            }
          } catch (error) {
            // Ignore token parsing errors during logout.
          }
        }
      }
      clearAuthCookies(res);
      clearCookie(res, cookieNames.legacyP2PSession);
      return res.json({ message: 'Logged out successfully.' });
    } catch (error) {
      clearAuthCookies(res);
      clearCookie(res, cookieNames.legacyP2PSession);
      return res.status(500).json({ message: 'Server error during logout.' });
    }
  });
}

module.exports = {
  registerAuthRoutes
};
