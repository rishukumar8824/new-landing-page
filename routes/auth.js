function normalizeIp(req) {
  const forwardedRaw = String(req.headers['x-forwarded-for'] || '').trim();
  const firstForwardedIp = forwardedRaw.split(',')[0].trim();
  return firstForwardedIp || String(req.ip || req.connection?.remoteAddress || 'unknown');
}

function createIpRateLimiter({ windowMs, maxAttempts }) {
  const state = new Map();

  return function rateLimitMiddleware(req, res, next) {
    const ip = normalizeIp(req);
    const now = Date.now();
    const existing = state.get(ip);

    if (!existing || now > existing.resetAt) {
      state.set(ip, {
        count: 1,
        resetAt: now + windowMs
      });
      return next();
    }

    if (existing.count >= maxAttempts) {
      const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({
        message: 'Too many attempts. Please try again later.',
        retryAfterSeconds
      });
    }

    existing.count += 1;
    state.set(ip, existing);
    return next();
  };
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
    p2pUserTtlMs
  } = deps;

  const loginLimiter = createIpRateLimiter({
    windowMs: 10 * 60 * 1000,
    maxAttempts: 5
  });

  const registerLimiter = createIpRateLimiter({
    windowMs: 10 * 60 * 1000,
    maxAttempts: 5
  });

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

  function clearAuthCookies(res) {
    clearCookie(res, cookieNames.accessToken);
    clearCookie(res, cookieNames.refreshToken);
  }

  async function createAndReturnTokens(res, user) {
    const tokenPair = tokenService.createTokenPair(user);
    await persistRefreshToken(user, tokenPair.refreshToken, tokenPair.refreshTokenExpiresAt);
    setAuthCookies(res, tokenPair);
    return tokenPair;
  }

  app.post('/auth/login', loginLimiter, async (req, res) => {
    const email = createEmailFromInput(req.body?.email);
    const password = String(req.body?.password || '').trim();

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Enter a valid email address.' });
    }
    if (!isValidPassword(password)) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    try {
      const credential = await repos.getP2PCredential(email);
      if (!credential || !repos.verifyPassword(password, credential.passwordHash)) {
        return res.status(401).json({ message: 'Invalid email or password.' });
      }

      const role = tokenService.normalizeRole(credential.role || 'USER');
      const user = buildP2PUserFromEmail(email, role);

      await walletService.ensureWallet(user.id, { username: user.username });
      const tokenPair = await createAndReturnTokens(res, user);

      if (typeof createLegacyP2PUserSession === 'function') {
        const legacySession = await createLegacyP2PUserSession(email, role);
        setCookie(res, cookieNames.legacyP2PSession, legacySession.token, Math.floor(p2pUserTtlMs / 1000));
      }

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
      if (String(error.message || '').includes('JWT_SECRET')) {
        return res.status(503).json({ message: 'JWT auth is not configured.' });
      }
      return res.status(500).json({ message: 'Server error during login.' });
    }
  });

  app.post('/auth/register', registerLimiter, async (req, res) => {
    const email = createEmailFromInput(req.body?.email);
    const password = String(req.body?.password || '').trim();

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Enter a valid email address.' });
    }
    if (!isValidPassword(password)) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    try {
      const existing = await repos.getP2PCredential(email);
      if (existing) {
        return res.status(409).json({ message: 'Account already exists. Please login.' });
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
      if (String(error.message || '').includes('JWT_SECRET')) {
        return res.status(503).json({ message: 'JWT auth is not configured.' });
      }
      return res.status(500).json({ message: 'Server error during registration.' });
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
